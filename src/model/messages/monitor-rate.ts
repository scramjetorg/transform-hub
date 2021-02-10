import { RunnerMessageCode } from "@scramjet/types";

/**
 * Message instructing Runner how often to emit monitoring messages.
 * This message type is sent from Supervisor.
 */
export interface MonitoringRateMessage {
    msgCode: RunnerMessageCode,
    monitoringRate: number;
}