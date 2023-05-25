
import { API } from '../../types';
import { CacheState, Data, Todo } from './types';

import { convert, revert, IcalObject } from './ical2json';
import { DAVNamespaceShort, DAVResponse, calendarQuery, deleteObject, updateObject } from 'tsdav';
import moment from 'moment';

async function download(
  calendarUrl: string,
  username: string,
  password: string,
  days: number,
): Promise<DAVResponse[]> {

  let limit = moment.utc().add(days, 'days').format('YYYYMMDDTHHmmss');

  const pendingFilter = makePendingFilter(limit);

  const query = (filter: object) => {
    return calendarQuery({
      url: calendarUrl,
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

function makePendingFilter(limit: string) {
  return {
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
}

function todosFactory(
  makeResourceUrl: (resp: DAVResponse) => string,
  username: string, password: string
): (response: DAVResponse) => Todo {
  return (response: DAVResponse) => {
    const calData = convert(response.props!.calendarData);
    const task = (calData.VCALENDAR[0] as IcalObject).VTODO[0] as IcalObject;
    const url = makeResourceUrl(response);
    const etag = response.props!.getetag;

    const update = (task: IcalObject) => {
      const data = {} as IcalObject;
      const calendar = {} as IcalObject;
      calendar["VTODO"] = [task];
      data["VCALENDAR"] = [calendar];
      response.props!.calendarData = revert(data);

      return updateObject({
        url,
        data: revert(data),
        etag,
        headers: {
          'content-type': 'text/calendar; charset=utf-8',
          authorization: 'Basic ' + btoa(username + ':' + password),
        }
      });
    };


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
          url,
          etag,
          headers: {
            authorization: 'Basic ' + btoa(username + ':' + password),
          }
        });
      }
    };
  }
}

export async function getTodos(data: Data, loader: API['loader']): Promise<CacheState> {
  if (data.serverURL === '' || data.userName === '' || data.password === '') {
    return {
      items: [],
      timestamp: Date.now(),
    }
  }

  loader.push();

  const makeResourceUrl = (resp: DAVResponse) => new URL(resp.href!, data.serverURL).href;

  const tasksDownloads: Promise<DAVResponse[]>[] = [];

  for (const calId of data.calendars) {
    const calendarUrl = `${data.serverURL}/calendars/${data.userName}/${calId.toLowerCase()}`;
    const promise = download(calendarUrl, data.userName, data.password, data.dueTimeRange);
    tasksDownloads.push(promise);
  }

  const makeTodo = todosFactory(makeResourceUrl, data.userName, data.password);

  loader.push();
  const tasks = await Promise.all(tasksDownloads)
    .then((results) => results.flat())
    .then((responses) => responses.map(makeTodo))
    .finally(loader.pop);

  return {
    items: tasks,
    timestamp: Date.now(),
  };
}
