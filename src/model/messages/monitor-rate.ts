import { RunnerMessageCode } from "@scramjet/types";

/**
 * Message instructing Runner how often to emit monitoring messages.
 * This message type is sent from Supervisor.
 */
export interface MonitoringRateMessage {

    /** Message type code from RunnerMessageCode enumeration */
    msgCode: RunnerMessageCode,

    /** . */
    monitoringRate: number;
}