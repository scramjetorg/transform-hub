import { LogLevel } from "./object-logger";

export type STHCommandOptions = {
    logLevel: LogLevel;
    port: number;
    hostname: string;
    identifyExisting: boolean;
    cpmUrl?: string;
    cpmId?: string;
    id?: string;
    runtimeAdapter: string;
    runnerImage: string;
    runnerMaxMem: number;
    prerunnerImage: string;
    prerunnerMaxMem: number;
    exposeHostIp: string;
    instancesServerPort: string;
    sequencesRoot: string;
    k8sNamespace: string;
    k8sAuthConfigPath: string;
    k8sSthPodHost: string;
    k8sRunnerImage: string;
    k8sSequencesRoot: string;
    docker: boolean;
}
