import { CPMMessageCode, RunnerMessageCode, SupervisorMessageCode } from "@scramjet/symbols";

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

export type CPMMessage = [
    CPMMessageCode,
    object
];


