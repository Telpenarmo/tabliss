
import { API } from '../../types';
import { CacheState, Data, Todo } from './types';

import { convert, revert, IcalObject } from './ical2json';
import { DAVNamespaceShort, DAVResponse, calendarQuery, deleteObject, updateObject } from 'tsdav';
import moment from 'moment';

async function download(
  serverURL: string,
  username: string,
  password: string,
  calendar: string,
  days: number,
): Promise<DAVResponse[]> {

  let limit = moment.utc().add(days, 'days').format('YYYYMMDDTHHmmss');

  const pendingFilter = {
    'comp-filter': {
      _attributes: {
        name: 'VCALENDAR',
      },
      'comp-filter': {
        _attributes: {
          name: 'VTODO',
        },
        'prop-filter': {
          _attributes: {
            name: 'COMPLETED',
          },
          'is-not-defined': {}
        },
        'comp-filter': [
          {
            _attributes: {
              name: 'DUE',
            },
            'time-range': {
              _attributes: {
                end: limit
              },
            }
          },
        ],
      },
    },
  };

  const query = (filter: any) => {
    return calendarQuery({
      url: `${serverURL}/calendars/${username}/${calendar.toLowerCase()}`,
      filters: [filter],
      props: {
        [`${DAVNamespaceShort.DAV}:getetag`]: {},
        [`${DAVNamespaceShort.CALDAV}:calendar-data`]: {},
      },
      depth: '1',
      headers: {
        authorization: 'Basic ' + btoa(username + ':' + password),
      }
    });
  };

  return query(pendingFilter);
}

function makeTodo(response: DAVResponse, serverURL: string, username: string, password: string): Todo {
  const calData = convert(response.props!.calendarData);
  const task = (calData.VCALENDAR[0] as IcalObject).VTODO[0] as IcalObject;

  const serverHost = new URL(serverURL).origin;

  const update = (task: IcalObject) => {
    const data = {} as IcalObject;
    const calendar = {} as IcalObject;
    calendar["VTODO"] = [task];
    data["VCALENDAR"] = [calendar];
    response.props!.calendarData = revert(data);

    return updateObject({
      url: `${serverHost}/${response.href!}`,
      data: revert(data),
      etag: response.props!.getetag,
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        authorization: 'Basic ' + btoa(username + ':' + password),
      }
    });
  }

  return {
    completed: task.COMPLETED !== undefined,
    contents: task.SUMMARY as string,
    id: task.UID as string,
    complete: () => {
      task.STATUS = 'COMPLETED';
      task.COMPLETED = moment.utc().format('YYYYMMDDTHHmmss');
      task['PERCENT-COMPLETE'] = '100';

      update(task);
    },
    edit: (contents: string) => {
      if (task.SUMMARY == contents) return;

      task.SUMMARY = contents;

      update(task);
    },
    remove: () => {
      deleteObject({
        url: `${serverHost}/${response.href!}`,
        etag: response.props!.getetag,
        headers: {
          authorization: 'Basic ' + btoa(username + ':' + password),
        }
      });
    }
  };
}

export async function getTodos(data: Data, loader: API['loader']): Promise<CacheState> {
  if (data.serverURL === '' || data.userName === '' || data.password === '') {
    return {
      items: [],
      timestamp: Date.now(),
    }
  }

  loader.push();

  const tasksReders: Promise<DAVResponse[]>[] = [];

  for (const cal of data.calendars) {
    tasksReders.push(download(data.serverURL, data.userName, data.password, cal, data.dueTimeRange));
  }

  loader.push();
  const tasks = await Promise.all(tasksReders)
    .then((res) => res.flat())
    .then((res) => res.map(r => makeTodo(r, data.serverURL, data.userName, data.password)))
    .finally(loader.pop);

  return {
    items: tasks,
    timestamp: Date.now(),
  };
}
