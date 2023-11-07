import { AppConfig } from "../app-config";
import { InstanceLimits } from "../instance-limits";

export type StartSequenceResponse = { id: string };

export type StartSequencePayload = {
    appConfig: AppConfig;
    args?: any[];
    outputTopic?: string;
    inputTopic?: string;
    limits?: InstanceLimits;
    instanceId?: string;
};
