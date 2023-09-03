import React, { FC, useEffect, useState } from 'react';

import { Calendar, Props, credentialsComplete, defaultData, loggedOff, loggedIn } from './types';
import { DebounceInput } from '../../shared/DebounceInput';
import { fetchCalendars, logIn } from './api';

const TodoSettings: FC<Props> = ({ data = defaultData, setData, loader }) => {
  const [allCalendars, setAllCalendars] = useState<Calendar[]>([]);
  const firstRun = React.useRef(true);

  useEffect(() => {
    if (firstRun.current) return;
    console.log("Clearing calendars");
    setData({...data, calendars: [], account: loggedOff(data.account) });

    if (!credentialsComplete(data.account)) return;

    logIn(data.account, loader)
      .then(account => setData({ ...data, account }));
    
  }, [data.account.credentials, data.account.serverUrl]);

  useEffect(() => {
    console.log("Fetching calendars")
    const accountLoggedIn = loggedIn(data.account);
    if (accountLoggedIn)
      fetchCalendars(accountLoggedIn, loader).then(setAllCalendars);
  }, [data.account]);

  useEffect(() => { firstRun.current = false; },[]);

  return (
    <div className="SearchSettings">
      <label>
        Tasks to show
        <DebounceInput
          type="number"
          min="0"
          onChange={show =>
            setData({ ...data, show: Number(show) })
          }
          placeholder="Number of todo items to show"
          value={data.show.toString()}
        />
      </label>

      <label>
        Server URL
        <DebounceInput
          type="url"
          onChange={serverUrl =>
            setData({
              ...data,
              account:
              {
                ...data.account,
                serverUrl
              }
            })
          }
          placeholder="Your CalDav's server URL"
          value={data.account.serverUrl}
        />
      </label>

      <label>
        Username
        <DebounceInput
          type="text"
          onChange={username =>
            setData({
              ...data,
              account: {
                ...data.account,
                credentials: {
                  ...data.account.credentials,
                  username
                }
              }
            })
          }
          placeholder="The username"
          value={data.account.credentials.username}
        />
      </label>

      <label>
        Password
        <DebounceInput
          type="password"
          onChange={password =>
            setData({ ...data,
              account: {
                ...data.account,
                credentials:
                {
                  ...data.account.credentials,
                  password }
                }
              })
          }
          placeholder="Your password"
          value={data.account.credentials.password}
        />
      </label>

      {allCalendars.map((calendar) => (
        <label key={calendar.url}>
          <input
            type="checkbox"
            checked={data.calendars.some(c => c.url === calendar.url)}
            onChange={(e) => {
              const calendars = e.target.checked
                ? [...data.calendars, calendar]
                : data.calendars.filter(c => c.url !== calendar.url);
              setData({...data, calendars});
            }}
            />
          {calendar.displayName}
        </label>
      ))}

      <label>
        Due time range (days)
        <DebounceInput
          type="number"
          onChange={dueTimeRange =>
            setData({ ...data, dueTimeRange: Number(dueTimeRange) })
          }
          placeholder="Number of days ahaed the todos will show"
          value={data.dueTimeRange.toString()}
        />
      </label>

      <label>
        Refresh interval (minutes)
        <DebounceInput
          type="number"
          min={1}
          max={60}
          onChange={refreshInterval =>
            setData({ ...data, refreshInterval: Number(refreshInterval) })
          }
          placeholder="How often todos list should be updated"
          value={data.refreshInterval.toString()}
        />
      </label>
    </div>
  );
};

export default TodoSettings;
