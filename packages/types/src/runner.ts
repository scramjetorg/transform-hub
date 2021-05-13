import { RunnerMessageCode, SupervisorMessageCode } from "@scramjet/symbols";

/**
 * Defines scalability options for writable or readable side of the Function:
 *
 * * C - Concurrency - the funcion accepts and processes more than one item at the
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
     * Addtional description of the function
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

/**
 * Provides basic function status information
 */
export type FunctionStatus = {
    /**
     * Average number of stream entries passing that specific function over the duration
     * of 1 second during the last 10 seconds.
     */
    throughput: number;
    /**
     * The amount of stream entries that this function will accept in queue for processing
     * before `pause` is called (i.e. highWaterMark - processing)
     */
    buffer: number;
    /**
     * The number of stream entries currently being processed.
     */
    processing: number;
    /**
     * Calculated backpressure: processing * throughput / buffer
     */
    readonly pressure: number;
}

/**
 * The response an Sequence sends as monitoring responses
 */
export type MonitoringMessage = {
    /**
     *
     */
    sequences?: FunctionStatus[];
    healthy?: boolean;
};


export namespace MessageCodes {
    export type PONG = "PONG";
    export type ACKNOWLEDGE = "ACKNOWLEDGE";
    export type PING = "PING";
    export type STOP = "STOP";
    export type KILL = "KILL";
    export type MONITORING_RATE = "MONITORING_RATE";
    export type ALIVE = "ALIVE";
    export type FORCE_CONFIRM_ALIVE = "FORCE_CONFIRM_ALIVE";
    export type DESCRIBE_SEQUENCE = "DESCRIBE_SEQUENCE";
    export type ERROR = "ERROR";
    export type MONITORING = "MONITORING";

    export type ANY = STOP | KILL;
}

export type MessageCode = MessageCodes.ANY;

export type RunnerOptions = {
    monitoringInterval?: number
};

export type RunnerMessage = [
    RunnerMessageCode,
    object
];

export type SupervisorMessage = [
    SupervisorMessageCode,
    object
];
