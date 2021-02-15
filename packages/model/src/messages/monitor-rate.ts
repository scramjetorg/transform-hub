import { RunnerMessageCode } from "@scramjet/types";

export type MonitoringRateMessageData = {

    /** Indicates how frequently should monitoring messages be emitted (in miliseconds). */
    monitoringRate: number;
}

/**
 * Message instructing Runner how often to emit monitoring messages.
 * This message type is sent from Supervisor.
 */
export type MonitoringRateMessage = { msgCode: RunnerMessageCode.MONITORING_RATE} & MonitoringRateMessageData;