import React, { FC } from 'react';

import { Props, defaultData } from './types';

const TodoSettings: FC<Props> = ({ data = defaultData, setData }) => (
  <div className="SearchSettings">
    <label>
      Tasks to show
      <input
        type="number"
        min="0"
        onChange={event =>
          setData({ ...data, show: Number(event.target.value) })
        }
        placeholder="Number of todo items to show"
        value={data.show}
      />
    </label>

    <label>
      Server URL
      <input
        type="url"
        onChange={event =>
          setData({ ...data, serverURL: event.target.value })
        }
        placeholder="Your CalDav's server URL"
        value={data.serverURL}
      />
    </label>

    <label>
      Username
      <input
        type="text"
        onChange={event =>
          setData({ ...data, userName: event.target.value })
        }
        placeholder="The username"
        value={data.userName}
      />
    </label>

    <label>
      Password
      <input
        type="password"
        onChange={event =>
          setData({ ...data, password: event.target.value })
        }
        placeholder="Your password"
        value={data.password}
      />
    </label>

    <label>
      Calendars (optional)
      <input
        type="text"
        onChange={event =>
          setData({ ...data, calendars: event.target.value.split(',').map((v) => v.trim()) })
        }
        placeholder="Names of todos lists, separated by comma"
        value={data.calendars.join(', ')}
      />
    </label>

    <label>
      Due time range (days)
      <input
        type="number"
        onChange={event =>
          setData({ ...data, dueTimeRange: Number(event.target.value) })
        }
        placeholder="Number of days ahaed the todos will show"
        value={data.dueTimeRange}
      />
    </label>

    <label>
      Refresh interval (minutes)
      <input
        type="number"
        min={1}
        max={60}
        onChange={event =>
          setData({ ...data, refreshInterval: Number(event.target.value) })
        }
        placeholder="How often todos list should be updated"
        value={data.refreshInterval}
      />
    </label>
  </div>
);

export default TodoSettings;
