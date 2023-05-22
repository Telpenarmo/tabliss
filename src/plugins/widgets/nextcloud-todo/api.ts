
import { API } from '../../types';
import { CacheState, Data, Todo } from './types';

import { convert, revert, IcalObject } from './ical2json';
import { DAVNamespaceShort, calendarQuery } from 'tsdav';
import moment from 'moment';

interface DAVResponse {
  href: string,
  propstat: {
    prop: {
      getetag: string,
      calendarData: string
    }
  }
};

interface ResponsesBatch {
  raw: {
    multistatus: {
      response: DAVResponse[]
    }
  }
};

async function FindRecent(serverURL: string, username: string, password: string, calendar: string): Promise<any[]> {
  const queryBase = {
    'comp-filter': {
      _attributes: {
        name: 'VCALENDAR',
      },
      _children: {
        'comp-filter': {
          _attributes: {
            name: 'VTODO',
          },
        }
      },
    },
  };

  const resp = await calendarQuery({
    url: `${serverURL}/calendars/${username}/${calendar.toLowerCase()}`,
    filters: [queryBase],
    props: {
      [`${DAVNamespaceShort.DAV}:getetag`]: {},
      [`${DAVNamespaceShort.CALDAV}:calendar-data`]: {},
    },
    depth: '1',
    headers: {
      authorization: 'Basic ' + btoa(username + ':' + password),
    }
  });

  return resp;
}

function makeTodo(vObj: DAVResponse): Todo {
  const task = (convert(vObj.propstat.prop.calendarData).VCALENDAR[0] as IcalObject).VTODO[0] as IcalObject;
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
      vObj.propstat.prop.calendarData = revert(data);

      // vObj.update()
    },
    edit: (contents: string) => {
      if (task.SUMMARY == contents) return;

      task.SUMMARY = contents;
      const data = {} as IcalObject;
      const calendar = {} as IcalObject;
      calendar["VTODO"] = [task];
      data["VCALENDAR"] = [calendar];
      vObj.propstat.prop.calendarData = revert(data);

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

  const tasksReders: Promise<ResponsesBatch[]>[] = [];

  for (const cal of data.calendars) {
    tasksReders.push(FindRecent(data.serverURL, data.userName, data.password, cal));
  }

  loader.push();
  const tasks = await Promise.all(tasksReders)
    .then((res) => res.flat())
    .then((res) => res.flatMap(r => r.raw.multistatus.response))
    .then((res) => res.map(makeTodo))
    .finally(loader.pop);

  return {
    items: tasks,
    timestamp: Date.now(),
  };
}
