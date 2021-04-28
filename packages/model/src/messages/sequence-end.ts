import { RunnerMessageCode } from "..";

export type SequenceEndMessageData = {
    /** The url of container snapshot created. */
    err: Error;
}

/**
 * Message from the Runner indicating that the sequence has completed sending it's data
 * and now can be asked to exit with high probability of accepting the exit gracefully.
 */
export type SequenceEndMessage = { msgCode: RunnerMessageCode.SEQUENCE_COMPLETED } & SequenceEndMessageData;
