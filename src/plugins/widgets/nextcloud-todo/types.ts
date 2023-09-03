import { API } from '../../types';

export type Todo = {
  id: string;
  contents: string;
  completed: boolean;
  complete: () => void;
  edit: (contents: string) => void;
  remove: () => void;
}

export type Calendar = {
  displayName: string;
  url: string;
}

type Credentials = {
  username: string;
  password: string;
}

export type Account = {
  serverUrl: string;
  credentials: Credentials;
}

export type LoggedInAccount = Account & {
  rootUrl: string;
  principalUrl: string;
  homeUrl: string;
}

export function credentialsComplete(account: Account): boolean {
  return !!(account.credentials.username && account.credentials.password && account.serverUrl);
}

export function loggedIn(account: Account | LoggedInAccount) {
  return 'rootUrl' in account ? account : undefined;
}

export function loggedOff(account: Account): Account {
  return {
    serverUrl: account.serverUrl,
    credentials: account.credentials
  }
}

export type State = Todo[];

export type Data = {
  show: number;
  refreshInterval: number;
  dueTimeRange: number;
  account: Account | LoggedInAccount;
  calendars: Calendar[];
};

export type CacheState = {
  items: Todo[],
  timestamp: number,
}
export type Props = API<Data, CacheState>;

export const defaultData: Data = {
  show: 3,
  refreshInterval: 5,
  dueTimeRange: 3,
  calendars: [],
  account: {
    credentials: {
      username: "",
      password: "",
    },
    serverUrl: ""
  }
};
