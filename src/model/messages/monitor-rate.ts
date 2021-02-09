import { BaseMessage } from "./base-message";

/**
 * Message instructing Runner how often to emit monitoring messages.
 * This message type is sent from Supervisor.
 */
export interface MonitoringRateMessage extends BaseMessage {
    monitoringRate: number;
}