import { MaybePromise } from "./utils";

export type MonitoringServerValidator = () => MaybePromise<boolean>;

export type MonitoringServerOptions = {
    port: number,
    check?: MonitoringServerValidator | MonitoringServerValidator[];
}

export interface IMonitoringServer {
    start(): void;
}

export interface IMonitoringServerConstructor {
    new(opts: MonitoringServerOptions): IMonitoringServer;
}
