import { RunnerMessageCode } from "@scramjet/symbols";

export type SequenceCompleteMessageData = {
    timeout?: number
}

/**
 * Message from the Runner indicating that the Sequence has completed sending it's data
 * and now can be asked to exit with high probability of accepting the exit gracefully.
 */
export type SequenceCompleteMessage = { msgCode: RunnerMessageCode.SEQUENCE_COMPLETED } & SequenceCompleteMessageData;
