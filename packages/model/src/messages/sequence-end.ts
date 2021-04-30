import { RunnerMessageCode } from "..";

export type SequenceEndMessageData = {
    /** The url of container snapshot created. */
    err: Error;
}

/**
 * Message from the Runner indicating that the sequence has called the end method
 * on context and it should be safe to terminate it without additional waiting,
 * unless it exits correctly itself.
 */
export type SequenceEndMessage = { msgCode: RunnerMessageCode.SEQUENCE_COMPLETED } & SequenceEndMessageData;
