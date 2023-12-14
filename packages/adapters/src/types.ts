import { InstanceId, SequenceInfo } from "@scramjet/types";
import { StartSequencePayload } from "@scramjet/types/src/rest-api-sth";

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
    sequenceInfo: SequenceInfo
    payload: StartSequencePayload
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
