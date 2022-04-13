import { RunnerMessageCode } from "@scramjet/symbols";

export type SequenceEndMessageData = {
    err: Error;
}

/**
 * Message from the Runner indicating that the Sequence has called the end method
 * on context and it should be safe to terminate it without additional waiting,
 * unless it exits correctly itself.
 */
export type SequenceEndMessage = { msgCode: RunnerMessageCode.SEQUENCE_COMPLETED } & SequenceEndMessageData;
