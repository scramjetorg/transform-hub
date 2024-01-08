import { MaybePromise } from "./utils";

export type MonitoringServerConfig = {
    port: number;
    host?: string;
    path?: string;
}

export type MonitoringServerValidator = () => MaybePromise<boolean>;

export interface IMonitoringServer {
    start(): Promise<MonitoringServerConfig>;
}

export interface IMonitoringServerConf {
    port: number;
    host: string;
    path: string;
    config: MonitoringServerConfig;
    isValidConfig: boolean;

    validate(config: Record<string, any>): boolean;
    validateEntry(key: string, value: any): boolean | null;
}

export type MonitoringServerOptions = MonitoringServerConfig & {
    check?: MonitoringServerValidator | MonitoringServerValidator[];
}

export interface IMonitoringServerConstructor {
    new(opts: MonitoringServerOptions): IMonitoringServer;
}

export interface IMonitoringServerConfConstructor {
    new(opts: MonitoringServerConfig): IMonitoringServerConf;
}
