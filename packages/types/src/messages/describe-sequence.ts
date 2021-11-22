import { RunnerMessageCode } from "@scramjet/symbols";

/**
 * Defines scalability options for writable or readable side of the Function:
 *
 * * C - Concurrency - the function accepts and processes more than one item at the
 *   same time, and therefore can be composed with consecutive ones.
 * * S - Sequentiality - the function can be executed on a different host to it's neighbours.
 * * P - Parallelism - the function can be spawned to multiple hosts at the same time
 */
type ScalabilityOptions = "CSP" | "CS" | "CP" | "SP" | "C" | "S" | "V" | "";

/**
 * Definition that informs the platform of the details of a single function.
 */
export type FunctionDefinition = {
    /**
     * Stream mode:
     *
     * * buffer - carries binary/string chunks that have no fixed size chunks and can be passed through sockets
     * * object - carries any type of object, that is serializable via JSON or analogue
     * * reference - carries non-serializable object references that should not be passed outside of a single process
     */
    mode: "buffer" | "object" | "reference";
    /**
     * Optional name for the function (which will be shown in UI/CLI)
     */
    name?: string;
    /**
     * Additional description of the function
     */
    description?: string;
    /**
     * Describes how head (readable side) and tail (writable side) of this Function can be
     * scaled to other machines.
     */
    scalability?: {
        /**
         * Writable side scalability
         */
        head?: ScalabilityOptions;
        /**
         * Readable side scalability
         */
        tail?: ScalabilityOptions;
    }
}

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
