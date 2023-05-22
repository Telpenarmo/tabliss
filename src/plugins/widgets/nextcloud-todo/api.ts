
import { API } from '../../types';
import { CacheState, Data, Todo } from './types';

import { convert, revert, IcalObject } from './ical2json';
import { DAVNamespaceShort, DAVResponse, calendarQuery } from 'tsdav';
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

function makeTodo(props: { calendarData: string }): Todo {
  const task = (convert(props.calendarData).VCALENDAR[0] as IcalObject).VTODO[0] as IcalObject;
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
      props.calendarData = revert(data);

      // vObj.update()
    },
    edit: (contents: string) => {
      if (task.SUMMARY == contents) return;

      task.SUMMARY = contents;
      const data = {} as IcalObject;
      const calendar = {} as IcalObject;
      calendar["VTODO"] = [task];
      data["VCALENDAR"] = [calendar];
      props.calendarData = revert(data);

      // vObj.update()
    },
    remove: () => { }
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
    .then((res) => res.flatMap(r => r.props!))
    .then((res) => res.map(makeTodo))
    .finally(loader.pop);

  return {
    items: tasks,
    timestamp: Date.now(),
  };
}
