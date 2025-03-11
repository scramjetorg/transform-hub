import { RunnerMessageCode } from "@scramjet/symbols";

export type EventMessageData = {

    /** Name of the event. */
    eventName: string;

    source?: string;

    /** TODO update Informs if keepAlive can be called to prolong the running of the Sequence. */
    message: any;
}

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