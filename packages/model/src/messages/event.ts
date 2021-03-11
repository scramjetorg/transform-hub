import { RunnerMessageCode } from "../.";

export type EventMessageData = {

    /** Name of the event. */
    eventName: string;

    /** TODO update Informs if keepAlive can be called to prolong the running of the Sequence. */
    message: any
}

/**
 * TODO update
 * Event message emitted by sequence and handeled in the context.
 */
export type EventMessage = { msgCode: RunnerMessageCode.EVENT } & EventMessageData;
