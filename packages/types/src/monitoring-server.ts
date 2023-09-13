import { MaybePromise } from "./utils";

export type MonitoringServerConfig = {
    port: number;
    host?: string;
    path?: string;
}

export type MonitoringServerValidator = () => MaybePromise<boolean>;

export type MonitoringServerOptions = MonitoringServerConfig & {
    check?: MonitoringServerValidator | MonitoringServerValidator[];
}

export interface IMonitoringServer {
    start(): Promise<MonitoringServerConfig>;
}

export interface IMonitoringServerConstructor {
    new(opts: MonitoringServerOptions): IMonitoringServer;
}
