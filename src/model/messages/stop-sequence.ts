import { RunnerMessageCode } from "@scramjet/types";

/**
 * Message instructing Runner to terminate Sequence gracefully after a specified period of time (in seconds).
 * It gives Sequence and Runner time to perform a cleanup.
 * This message type is sent from Supervisor.
 */
export interface StopSequenceMessage {

    /** Message type code from RunnerMessageCode enumeration. */
    msgCode: RunnerMessageCode,

    /** The number of seconds before the Sequence will be killed. */
    timeout: number;

    /** Informs if keepAlive can be called to prolong the running of the Sequence. */
    canCallKeepalive: boolean
}