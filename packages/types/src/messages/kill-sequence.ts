import { RunnerMessageCode } from "@scramjet/symbols";

/**
 * Message instructing Runner to terminate Sequence using the kill signal.
 * It causes an ungraceful termination of Sequence.
 * This message type is sent from CSIController.
 */
export type KillSequenceMessage = { msgCode: RunnerMessageCode.KILL };
