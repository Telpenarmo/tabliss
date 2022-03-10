
import { API } from '../../types';
import { CacheState, Data, Todo } from './types';

import { convert, revert, IcalObject } from './ical2json';
import DavClient, { Calendar, VObject } from 'cdav-library';
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

async function FindRecent(calendar: Calendar, days: number): Promise<VObject[]> {
  let limit = moment.utc().add(days, 'days').format('YYYYMMDDTHHmmss');
  let last24h = moment.utc().add(-1, 'days').format('YYYYMMDDTHHmmss');
  let now = moment.utc().format('YYYYMMDDTHHmmss');
  type Query = { name: string[]; attributes: string[][]; children: Query[] };
  const queryBase: Query = {
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

  const queryCompleted: Query = {
    ...queryBase, children: [{
      ...queryBase.children[0], children: [
        {
          name: [IETF_CALDAV, 'prop-filter'],
          attributes: [
            ['name', 'COMPLETED'],
          ],
          children: [{
            name: [IETF_CALDAV, 'time-range'],
            attributes: [
              ['start', last24h]
            ],
            children: [],
          }]
        }]
    }]
  };

  const queryPending: Query = {
    ...queryBase, children: [{
      ...queryBase.children[0], children:
        [
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
            }]
          },
          {
            name: [IETF_CALDAV, 'comp-filter'],
            attributes: [
              ['name', 'DTSTART'],
            ],
            children: [{
              name: [IETF_CALDAV, 'time-range'],
              attributes: [
                ['end', now]
              ],
              children: [],
            }]
          }
        ]
    }]
  };

  const [completed, pending] = await Promise.all([
    calendar.calendarQuery([queryCompleted]),
    calendar.calendarQuery([queryPending]),
  ]);
  return completed.concat(pending);
}

function makeTodo(vObj: VObject): Todo {
  const task = (convert(vObj.data).VCALENDAR[0] as IcalObject).VTODO[0] as IcalObject;
  return {
    completed: task.COMPLETED !== undefined,
    contents: task.SUMMARY as string,
    id: task.UID as string,
    complete: () => {
      task.COMPLETED = moment.utc().format('YYYYMMDDTHHmmss');
      const data = {} as IcalObject;
      const calendar = {} as IcalObject;
      calendar["VTODO"] = [task];
      data["VCALENDAR"] = [calendar];
      vObj.data = revert(data);

      vObj.update()
    },
    edit: (contents: string) => {
      if (task.SUMMARY == contents) return;

      task.SUMMARY = contents;
      const data = {} as IcalObject;
      const calendar = {} as IcalObject;
      calendar["VTODO"] = [task];
      data["VCALENDAR"] = [calendar];
      vObj.data = revert(data);

      vObj.update()
    },
    remove: () => { vObj.delete(); }
  };
}

export async function getTodos(data: Data, loader: API['loader']): Promise<CacheState> {
  if (data.serverURL === '' || data.userName === '' || data.password === '') {
    return {
      items: [],
      timestamp: Date.now(),
    }
  }

  const client = new DavClient({ rootUrl: data.serverURL }, () => xhrProvider(data.userName, data.password));
  loader.push();
  await client.connect({ enableCalDAV: true });

  const calendars = await client.calendarHomes[0].findAllCalDAVCollections().finally(loader.pop);
  const tasksReders: Promise<VObject[]>[] = [];
  for (let i = 0; i < calendars.length; i++) {
    const cal = calendars[i];
    if (cal.displayname !== undefined && (data.calendars.length === 0 || data.calendars.includes(cal.displayname))) {
      tasksReders.push(FindRecent(cal, data.dueTimeRange));
    }
  }

  loader.push();
  const tasks = await Promise.all(tasksReders)
    .then((res) => res.flat())
    .then((res) => res.map(makeTodo))
    .finally(loader.pop);

  return {
    items: tasks,
    timestamp: Date.now(),
  };
}
