declare module 'cdav-library' {
    export class Calendar {
        calendarQuery(filter: any[], prop?: any[], timezone?: string): Promise<string[]>;
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