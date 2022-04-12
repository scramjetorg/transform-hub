import { RunnerMessageCode } from "@scramjet/symbols";
import { FunctionStatus } from "../runner";

export type MonitoringMessageFromRunnerData = {

    /** How many items are processed by the Sequence per second. */
    sequences?: FunctionStatus[];

    /** Calculated backpressure: processing * throughput / buffer. */
    healthy: boolean;
}

export type MonitoringMessageData = MonitoringMessageFromRunnerData & {

    /** CPU usage */
    cpuTotalUsage?: number;

    /** The amount of RAM in use. */
    memoryUsage?: number;

    /** The maximum amount of RAM used. */
    memoryMaxUsage?: number;

    /** The set RAM memory limit. */
    limit?: number;

    /** The number of received bytes. */
    networkRx?: number;

    /** The number of transmitted bytes. */
    networkTx?: number;

    containerId?: string;

    /** PID of Runner If STH is run with --runtime-adapter='process' option */
    processId?: number;
}

/**
 * Monitoring message including detailed performance statistics.
 * This message type is sent from Runner.
 */
export type MonitoringMessage = { msgCode: RunnerMessageCode.MONITORING } & MonitoringMessageData;
