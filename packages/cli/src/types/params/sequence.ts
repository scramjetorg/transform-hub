import { DeepPartial, STHRestAPI } from "@scramjet/types";

export type SequenceDeployArgs = STHRestAPI.StartSequencePayload & {
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
