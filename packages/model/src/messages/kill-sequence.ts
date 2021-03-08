import { RunnerMessageCode } from "../.";

/**
 * Message instructing Runner to terminate Sequence using the kill signal.
 * It causes an ungraceful termination of Sequence.
 * This message type is sent from Supervisor.
 */
export type KillSequenceMessage = { msgCode: RunnerMessageCode.KILL };
