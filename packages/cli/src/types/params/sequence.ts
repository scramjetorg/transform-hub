import { AppConfig, DeepPartial } from "@scramjet/runtime-types";

export type SequenceDeployArgs = {
    appConfig?: AppConfig;
    args?: string[];
    instanceId?: string;
    inputTopic?: string;
    outputTopic?: string;
    limits?: Record<string, number>;
    instanceName?: string;
    sequenceName?: string;
    output?: string;
};

export type SequenceStartCLIArgs = {
    args?: string;
    configFile?: string;
    configString?: string;
    instId?: string;
    inputTopic?: string;
    limits?: string;
    output?: string;
    outputTopic?: string;
    startupConfig: DeepPartial<SequenceDeployArgs>;
};
