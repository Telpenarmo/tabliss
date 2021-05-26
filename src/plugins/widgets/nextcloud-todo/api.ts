
import { API } from '../../types';
import { CacheState, Data, Todo } from './types';

import { convert } from './ical2json';
import DavClient, { Calendar } from 'cdav-library';
import moment from 'moment';

const IETF_CALDAV = 'urn:ietf:params:xml:ns:caldav';

function xhrProvider(userName: string, password: string): XMLHttpRequest {
    var xhr = new XMLHttpRequest();
    var oldOpen = xhr.open

    // override open() method to add headers
    xhr.open = function () {
        type openParams = [string, string, boolean, string | null | undefined, string | null | undefined]
        var result = oldOpen.apply(this, arguments as unknown as openParams);
        xhr.setRequestHeader('Authorization', 'Basic ' + btoa(userName + ':' + password));
        return result
    }
    return xhr
}

function findOpenBefore(calendar: Calendar, days: number): Promise<string[]> {
    let limit = moment.utc().add(days, 'days').format('YYYYMMDDTHHmmss');
    type Query = { name: string[]; attributes: string[][]; children: Query[] };
    const query: Query = {
        name: [IETF_CALDAV, 'comp-filter'],
        attributes: [
            ['name', 'VCALENDAR'],
        ],
        children: [{
            name: [IETF_CALDAV, 'comp-filter'],
            attributes: [
                ['name', 'VTODO'],
            ],
            children: [],
        }],
    };
    query.children[0].children = [
        {
            name: [IETF_CALDAV, 'prop-filter'],
            attributes: [
                ['name', 'COMPLETED'],
            ],
            children: [{
                name: [IETF_CALDAV, 'is-not-defined'],
                attributes: [],
                children: [],
            }]
        },
        {
            name: [IETF_CALDAV, 'comp-filter'],
            attributes: [
                ['name', 'DUE'],
            ],
            children: [{
                name: [IETF_CALDAV, 'time-range'],
                attributes: [
                    ['end', limit]
                ],
                children: [],
            }],
        }
    ];

    return calendar.calendarQuery([query]);
}

function vobj2Todo(vdata: string): Todo {
    const task = convert(vdata);
    return {
        completed: task.COMPLETED == null,
        contents: task.SUMMARY as string,
        id: task.UID as string
    };
}

export async function getTodos(data: Data, loader: API['loader']): Promise<CacheState> {
    if (data.serverURL === '' || data.userName === '' || data.password === '' || data.calendars === []) {
        return {
            items: [],
            timestamp: Date.now(),
        }
    }
    const client = new DavClient({ rootUrl: data.serverURL }, () => xhrProvider(data.userName, data.password));
    loader.push();
    await client.connect({ enableCalDAV: true });

    const calendars = await client.calendarHomes[0].findAllCalDAVCollections().finally(loader.pop);
    let tasks: Todo[] = [];
    for (let i = 0; i < calendars.length; i++) {
        const cal = calendars[i];

        if (data.calendars.includes(cal.displayname)) { continue; }

        loader.push();
        const newTasks = await findOpenBefore(cal, data.dueTimeRange)
            .then((res) => res.map(vobj2Todo))
            .finally(loader.pop);
        tasks = tasks.concat(newTasks);
    }
    return {
        items: tasks,
        timestamp: Date.now(),
    };
}