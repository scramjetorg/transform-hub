import { RunnerMessageCode } from "@scramjet/symbols";

export type MonitoringReplyMessageData = {};

/**
 * Message instructing Runner how often to emit monitoring messages.
 * This message type is sent from CSIController.
 */
export type MonitoringReplyMessage = { msgCode: RunnerMessageCode.MONITORING_REPLY} & MonitoringReplyMessageData;
