import { BaseMessage } from "./base-message";

/**
 * Message providing the description of Sequence.
 * It is an array of subsequences from which the sequence is construced.
 * This message type is sent from Runner.
 */
export interface DescribeSequenceMessage extends BaseMessage {
    subsequences: string[];
}