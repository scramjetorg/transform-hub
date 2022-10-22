import { LogLevel } from "./object-logger";
import { TelemetryConfig } from "./telemetry-config";

export type STHCommandOptions = {
    logLevel: LogLevel;
    colors: boolean,
    port: number;
    hostname: string;
    identifyExisting: boolean;
    config?: string;
    cpmUrl?: string;
    cpmId?: string;
    cpmSslCaPath?: string;
    cpmMaxReconnections: number,
    cpmReconnectionDelay: number,
    platformToken?: string;
    id?: string;
    runtimeAdapter: string;
    runnerImage: string;
    runnerPyImage: string;
    runnerMaxMem: number;
    safeOperationLimit: number;
    prerunnerImage: string;
    prerunnerMaxMem: number;
    exposeHostIp: string;
    instancesServerPort: string;
    sequencesRoot: string;
    k8sNamespace: string;
    k8sQuotaName: string;
    k8sAuthConfigPath: string;
    k8sSthPodHost: string;
    k8sRunnerImage: string,
    k8sRunnerPyImage: string
    k8sSequencesRoot: string;
    debug: boolean;
    docker: boolean;
    k8sRunnerCleanupTimeout: string,
    k8sRunnerResourcesRequestsCpu: string;
    k8sRunnerResourcesRequestsMemory: string;
    k8sRunnerResourcesLimitsCpu: string;
    k8sRunnerResourcesLimitsMemory: string;
    startupConfig: string;
    exitWithLastInstance: boolean;
    instanceLifetimeExtensionDelay: number;
    environmentName?: string;
    telemetry: TelemetryConfig["status"]
}
