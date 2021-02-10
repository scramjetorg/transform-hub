import { RunnerMessageCode } from "@scramjet/types";

/**
 * Message providing the description of Sequence.
 * It is an array of subsequences from which the sequence is construced.
 * This message type is sent from Runner.
 */

export interface DescribeSequenceMessage {
    msgCode: RunnerMessageCode,
    subsequences: string[];
}