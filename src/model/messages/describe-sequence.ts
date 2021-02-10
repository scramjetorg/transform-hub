import { FunctionDefinition, RunnerMessageCode } from "@scramjet/types";

/**
 * Message providing the definition of the Sequence.
 * It includes information on stream mode, name, description and scalability of each subsequence.
 * This message type is sent from Runner.
 */
export interface DescribeSequenceMessage {

    /** Message type code from RunnerMessageCode enumeration. */
    msgCode: RunnerMessageCode,

     /** Provides the definition of each subsequence.  */
    definition?: FunctionDefinition[];
}