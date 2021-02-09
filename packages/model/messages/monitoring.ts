import { FunctionStatus, RunnerMessageCode } from "@scramjet/types";

export type MonitoringMessageData = {

    /** How many items are processed by the Sequence per second. */
    sequences?: FunctionStatus[];

    /** Calculated backpressure: processing * throughput / buffer. */
    healthy: boolean;

    /** CPU usage */
    cpu?: number;

    /** The amount of RAM in use. */
    memoryUsed?: number;

    /** The amount of free RAM. */
    memoryFree?: number;

    /** The amount of swap memory in use. */
    swapUsed?: number;

    /** The amount of free swap memory. */
    swapFree?: number;
}

/**
 * Monitoring message including detailed performance statistics.
 * This message type is sent from Runner.
 */
export type MonitoringMessage = { msgCode: RunnerMessageCode.MONITORING } & MonitoringMessageData;