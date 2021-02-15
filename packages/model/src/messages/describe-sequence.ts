import { FunctionDefinition, RunnerMessageCode } from "@scramjet/types";

export type DescribeSequenceMessageData = {

     /** Provides the definition of each subsequence.  */
    definition?: FunctionDefinition[];
}

/**
 * Message providing the definition of the Sequence.
 * It includes information on stream mode, name, description and scalability of each subsequence.
 * This message type is sent from Runner.
 */
export type DescribeSequenceMessage = { msgCode: RunnerMessageCode.DESCRIBE_SEQUENCE } & DescribeSequenceMessageData;
