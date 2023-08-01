import { AppConfig } from "./app-config";
import { InstanceId, InstanceStatus } from "./instance";
import { SequenceInfo } from "./sequence-adapter";

export type InstanceArgs = any[];

export type Instance = {
    id: InstanceId,
    appConfig?: AppConfig,
    args?: InstanceArgs,
    sequenceInfo?: Omit<SequenceInfo, 'instances'>,
    provides?: string,
    requires?: string,
    sequence: string,
    ports?: Record<string, number>
    created?: Date,
    started?: Date,
    ended?: Date,
    status?: InstanceStatus,
    terminated?: {
        exitcode: number,
        reason: string
    }
}
