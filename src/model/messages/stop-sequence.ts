import { RunnerMessageCode } from "@scramjet/types";

/**
 * Message instructing Runner to terminate Sequence gracefully after a specified period of time (in miliseconds).
 * It gives Sequence and Runner time to perform a cleanup.
 * This message type is sent from Supervisor.
 */
export interface StopSequenceMessage {
    msgCode: RunnerMessageCode,
    delay: number;
}