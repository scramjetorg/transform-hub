import { RunnerMessageCode } from "../.";

export type EventMessageData = {

    /**TODO update The number of seconds before the Sequence will be killed. */
    eventName: string;

    /** TODO update Informs if keepAlive can be called to prolong the running of the Sequence. */
    message: any
}

/**
 * TODO update
 * Message instructing Runner to terminate Sequence gracefully after a specified period of time (in seconds).
 * It gives Sequence and Runner time to perform a cleanup.
 * This message type is sent from Supervisor.
 */
export type EventMessage = { msgCode: RunnerMessageCode.EVENT } & EventMessageData;
