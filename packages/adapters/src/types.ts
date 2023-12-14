import { InstanceId } from "@scramjet/types";

export type InstanceAdapterOptions = {
    exitDelay: number;
}

export type RunnerEnvConfig = {
    paths?: "posix" | "win32"
    sequencePath: string;
    pipesPath: string;
    instancesServerPort: number;
    instancesServerHost: string;
    instanceId: InstanceId;
}

export type RunnerEnvironmentVariables = Partial<{
    PATH: string;
    DEVELOPMENT: string;
    PRODUCTION: string;
    SEQUENCE_PATH: string;
    INSTANCES_SERVER_PORT: string;
    INSTANCES_SERVER_HOST: string;
    INSTANCE_ID: string;
    PIPES_LOCATION: string;
    CRASH_LOG: string;
    [key: string]: string;
}>;
