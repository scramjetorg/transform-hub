import { DownstreamStreamsConfig } from "./message-streams";

export type RunnerTransportKind = "legacy" | "verser2";

export type RunnerTransportRouteContracts = {
    runnerDomain: string;
    stdinPath: string;
    stdoutPath: string;
    stderrPath: string;
    controlPath: string;
    monitoringPath: string;
    inputPath: string;
    outputPath: string;
    logPath: string;
    requestsPath: string;
};

export const DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS: RunnerTransportRouteContracts = {
    runnerDomain: "runner.<instanceId>.scramjet.internal",
    stdinPath: "/stdin",
    stdoutPath: "/stdout",
    stderrPath: "/stderr",
    controlPath: "/control",
    monitoringPath: "/monitoring",
    inputPath: "/input",
    outputPath: "/output",
    logPath: "/log",
    requestsPath: "/requests"
};

export type RunnerTransportConnectOptions = {
    instanceId: string;
    streams: DownstreamStreamsConfig;
};

export interface RunnerTransport {
    readonly kind: RunnerTransportKind;
    connect(options: RunnerTransportConnectOptions): Promise<void>;
    disconnect(reason?: string): Promise<void>;
}
