import { AppConfig } from "./app-config";
import { InstanceArgs, InstanceId, InstanceStatus } from "./instance";
import { SequenceInfoInstance } from "./sequence-adapter";

export type Instance = {
    id: InstanceId,
    appConfig?: AppConfig,
    args?: InstanceArgs,
    provides?: string,
    requires?: string,
    sequence: SequenceInfoInstance,
    ports?: Record<string, number>,
    created?: Date,
    started?: Date,
    ended?: Date,
    status?: InstanceStatus,
    terminated?: {
        exitcode: number,
        reason: string
    }
}
