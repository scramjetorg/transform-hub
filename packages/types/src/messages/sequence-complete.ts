import { RunnerMessageCode } from "@scramjet/symbols";
import { EmptyMessageData } from "./message";

/**
 * Message from the Runner indicating that the sequence has completed sending it's data
 * and now can be asked to exit with high probability of accepting the exit gracefully.
 */
export type SequenceCompleteMessage = { msgCode: RunnerMessageCode.SEQUENCE_COMPLETED } & EmptyMessageData;
