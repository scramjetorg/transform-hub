import { RunnerMessageCode } from "@scramjet/types";

/**
 * Monitoring message including detailed performance statistics.
 * This message type is sent from Runner.
 */
export interface MonitoringMessage {

    /** Message type code from RunnerMessageCode enumeration */
    msgCode: RunnerMessageCode,

    /** How many items are processed by the Sequence per second. */
    throughput: number;

    /** Calculated backpressure: processing * throughput / buffer. */
    pressure: number;

    /** CPU usage */
    cpu: number;

    /** The amount of RAM in use. */
    memoryUsed: number;

    /** The amount of free RAM. */
    memoryFree: number;

    /** The amount of swap memory in use. */
    swapUsed: number;

    /** The amount of free swap memory. */
    swapFree: number;
}