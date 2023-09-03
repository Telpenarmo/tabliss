import { API } from '../../types';
import { Account, CacheState, Calendar, Data, LoggedInAccount, Todo, loggedIn } from './types';

import { convert, revert, IcalObject } from './ical2json';
import { DAVNamespaceShort, DAVResponse, calendarQuery, deleteObject, getBasicAuthHeaders, updateObject } from 'tsdav';
import tsdav from 'tsdav';
import moment from 'moment';

async function download(
  calendarUrl: string,
  authHeaders: Record<string, string>,
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
      headers: authHeaders
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
  authHeaders: Record<string, string>,
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
          ...authHeaders,
          'content-type': 'text/calendar; charset=utf-8',
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
          headers: authHeaders
        });
      }
    };
  }
}

export async function getTodos(data: Data, loader: API['loader']): Promise<CacheState> {
  if (!loggedIn(data.account)) {
    return {
      items: [],
      timestamp: Date.now(),
    }
  }
  console.log("Starting todos downloading");

  const authHeaders = getAuthHeaders(data.account.credentials);

  loader.push();

  const makeResourceUrl = (resp: DAVResponse) => new URL(resp.href!, data.account.serverUrl).href;

  const tasksDownloads: Promise<DAVResponse[]>[] = [];

  for (const cal of data.calendars) {
    const promise = download(cal.url, authHeaders, data.dueTimeRange);
    tasksDownloads.push(promise);
  }

  const makeTodo = todosFactory(makeResourceUrl, authHeaders);

  loader.push();

  const tasks = await Promise.all(tasksDownloads)
    .then((results) => results.flat())
    .then((responses) => responses.map(makeTodo))
    .finally(loader.pop);

  console.log("Todos downloaded")

  return {
    items: tasks,
    timestamp: Date.now(),
  };
}

export function getAuthHeaders(credentials: { username: string, password: string }) {
  return getBasicAuthHeaders(credentials);
}

export async function logIn(account: Account, loader: API['loader']): Promise<LoggedInAccount> {
  console.log(`Logging in to CalDAV service at ${account.serverUrl}`);

  loader.push();

  const fullAccount = await tsdav.createAccount({
    account: { ...account, accountType: 'caldav' },
    headers: getAuthHeaders(account.credentials)
  })
    .finally(loader.pop);

  console.log("Successfully logged in")

  return {
    ...account,
    rootUrl: fullAccount.rootUrl!,
    principalUrl: fullAccount.principalUrl!,
    homeUrl: fullAccount.homeUrl!
  };
}

export async function fetchCalendars(account: LoggedInAccount, loader: API['loader']): Promise<Calendar[]> {
  if (!loggedIn(account)) return [];

  loader.push();

  const calendars = await tsdav.fetchCalendars({
    account: { ...account, accountType: 'caldav' },
    headers: getAuthHeaders(account.credentials),
    props: {
      [`${tsdav.DAVNamespaceShort.CALDAV}:calendar-description`]: {},
      [`${tsdav.DAVNamespaceShort.CALDAV}:calendar-timezone`]: {},
      [`${tsdav.DAVNamespaceShort.DAV}:displayname`]: {},
      [`${tsdav.DAVNamespaceShort.CALDAV_APPLE}:calendar-color`]: {},
      [`${tsdav.DAVNamespaceShort.CALENDAR_SERVER}:getctag`]: {},
      [`${tsdav.DAVNamespaceShort.DAV}:resourcetype`]: {},
      [`${tsdav.DAVNamespaceShort.CALDAV}:supported-calendar-component-set`]: {},
      [`${tsdav.DAVNamespaceShort.DAV}:sync-token`]: {},
      [`${tsdav.DAVNamespaceShort.DAV}:current-user-privilege-set`]: {},
    }
  })
    .finally(loader.pop);

  return calendars
    .filter(c => c.components?.includes('VTODO'))
    .filter(c => c.displayName !== undefined) as Calendar[];
}
