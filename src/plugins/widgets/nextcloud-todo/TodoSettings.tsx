import React, { FC } from 'react';

import { Props, defaultData } from './types';
import { DebounceInput } from '../../shared/DebounceInput';

const TodoSettings: FC<Props> = ({ data = defaultData, setData }) => (
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
        onChange={serverURL =>
          setData({ ...data, serverURL })
        }
        placeholder="Your CalDav's server URL"
        value={data.serverURL}
      />
    </label>

    <label>
      Username
      <DebounceInput
        type="text"
        onChange={userName =>
          setData({ ...data, userName })
        }
        placeholder="The username"
        value={data.userName}
      />
    </label>

    <label>
      Password
      <DebounceInput
        type="password"
        onChange={password =>
          setData({ ...data, password })
        }
        placeholder="Your password"
        value={data.password}
      />
    </label>

    <label>
      Calendars (optional)
      <DebounceInput
        type="text"
        onChange={calendars =>
          setData({ ...data, calendars: calendars.split(',').map((v) => v.trim()) })
        }
        placeholder="Names of todos lists, separated by comma"
        value={data.calendars.join(', ')}
      />
    </label>

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

export default TodoSettings;
