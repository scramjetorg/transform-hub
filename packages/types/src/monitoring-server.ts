import { MaybePromise } from "./utils";

export type MonitoringServerOptions = {

    port: number,
    validator: MaybePromise<any>;
}

export interface IMonitoringServer {
    startServer(): void;
}
