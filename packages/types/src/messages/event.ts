import { CPMMessageCode, RunnerMessageCode } from "@scramjet/symbols";
import { InstanceId } from "../instance";

export type EventMessageData = {

    /** Name of the event. */
    eventName: string;

    source?: InstanceId;

    scope?: "space" | "host" | "sequence" | "instance";

    message: any;
}

export type SpaceEventMessageData = EventMessageData & {
    scope: "space";
    source: InstanceId;
    sourceHost?: string;
}

export type SpaceEventMessage = { msgCode: CPMMessageCode.EVENT } & SpaceEventMessageData;

/**
 * TODO update
 * Event message emitted by Sequence and handled in the context.
 */
export type EventMessage = { msgCode: RunnerMessageCode.EVENT } & EventMessageData;

export type StorageMessageData = {
    values: Record<string, any>
}

export type StorageMessage = { msgCode: RunnerMessageCode.STORAGE } & EventMessageData;

export type StorageUpdateMessageData = {
    key: string;
    value: any
}

export type StorageUpdateMessage = { msgCode: RunnerMessageCode.STORAGE_UPDATE } & EventMessageData;
