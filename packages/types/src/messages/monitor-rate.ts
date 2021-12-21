import { RunnerMessageCode } from "@scramjet/symbols";

export type MonitoringRateMessageData = {

    /** Indicates how frequently should monitoring messages be emitted (in miliseconds). */
    monitoringRate: number;
}

/**
 * Message instructing Runner how often to emit monitoring messages.
 * This message type is sent from CSIController.
 */
export type MonitoringRateMessage = { msgCode: RunnerMessageCode.MONITORING_RATE} & MonitoringRateMessageData;
