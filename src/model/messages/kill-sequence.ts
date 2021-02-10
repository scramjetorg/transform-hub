import { RunnerMessageCode } from "@scramjet/types";

/**
 * Message instructing Runner to terminate Sequence using the kill signal.
 * It causes an ungraceful termination of Sequence.
 * This message type is sent from Supervisor.
 */
export interface KillSequenceMessage {
    msgCode: RunnerMessageCode,
}
