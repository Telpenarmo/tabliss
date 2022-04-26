declare module '@nextcloud/cdav-library' {
  export class VObject {
    data: string;
    update(): Promise<void>;
    delete(): Promise<void>;
  }
  export class Calendar {
    calendarQuery(filter: any, prop?: any[], timezone?: string): Promise<VObject[]>;
  }
  export class CalendarHome {
    findAllCalDAVCollections(): Promise<Calendar[] | any[] | any[] | any[]>;
  }
  export default class DavClient {
    constructor(options: Object, xhrProvider?: (() => XMLHttpRequest), factories?: Object);
    connect(options: Object): Promise<DavClient>;
    calendarHomes: CalendarHome[];
  }
}
