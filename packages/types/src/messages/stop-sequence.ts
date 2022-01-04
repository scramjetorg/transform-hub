import { RunnerMessageCode } from "@scramjet/symbols";

export type StopSequenceMessageData = {

    /** The number of milliseconds before the Sequence will be killed. */
    timeout: number;

    /** Informs if keepAlive can be called to prolong the running of the Sequence. */
    canCallKeepalive: boolean
}

/**
 * Message instructing Runner to terminate Sequence gracefully after a specified period of time (in seconds).
 * It gives Sequence and Runner time to perform a cleanup.
 * This message type is sent from CSIController.
 */
export type StopSequenceMessage = { msgCode: RunnerMessageCode.STOP } & StopSequenceMessageData;
