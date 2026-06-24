/**
 * Monitoring server types.
 *
 * Simplified structural copies from @scramjet/types/monitoring-server.ts.
 */

export type MonitoringServerConfig = {
    port: number;
    host?: string;
    path?: string;
};

export type MonitoringServerValidator = () => Promise<boolean>;

export interface IMonitoringServer {
    start(): Promise<MonitoringServerConfig>;
}

export type MonitoringServerOptions = MonitoringServerConfig & {
    check?: MonitoringServerValidator | MonitoringServerValidator[];
};
