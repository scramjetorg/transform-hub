import { BaseMessage } from "./base-message";

/**
 * Monitoring message including detailed performance statistics.
 * This message type is sent from Runner.
 */
export interface MonitoringMessage extends BaseMessage {
    itemThroughput: number;
    itemsThroughput: number[];
    pressure: number;
    cpu: number;
    memoryUsed: number;
    memoryFree: number;
    swapUsed: number;
    swapFree: number;
}