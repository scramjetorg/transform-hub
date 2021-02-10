import { FunctionStatus, RunnerMessageCode } from "@scramjet/types";

/**
 * Message providing the description of Sequence.
 * It includes the basic status information on each function from which Sequence is construced.
 * This message type is sent from Runner.
 */
export interface DescribeSequenceMessage {

    /** Message type code from RunnerMessageCode enumeration */
    msgCode: RunnerMessageCode,

    /** An array containing basic function status information for each of the Sequence's functions */
    sequences?: FunctionStatus[];

    /** Indicates whether there are no issues with the Sequence's processing activity  */
    healthy?: boolean;
}