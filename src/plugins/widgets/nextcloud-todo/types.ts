import { API } from '../../types';

export type Todo = {
  id: string;
  contents: string;
  completed: boolean;
};

export type State = Todo[];

export type Data = {
  show: number;
  refreshInterval: number;
  userName: string;
  password: string;
  serverURL: string;
  calendars: string[];
  dueTimeRange: number;
};

export type CacheState = {
  items: Todo[],
  timestamp: number,
}
export type Props = API<Data, CacheState>;

export const defaultData: Data = {
  show: 3,
  refreshInterval: 5,
  userName: "",
  password: "",
  serverURL: "",
  calendars: [],
  dueTimeRange: 3,
};
