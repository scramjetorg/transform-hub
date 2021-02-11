/* eslint-disable no-extra-parens */
import {
    AcknowledgeMessage, AcknowledgeMessageData,
    ConfirmHealthMessage,
    DescribeSequenceMessage, DescribeSequenceMessageData,
    ErrorMessage, ErrorMessageData,
    KeepAliveMessage, KeepAliveMessageData,
    KillSequenceMessage,
    MonitoringRateMessage, MonitoringRateMessageData,
    MonitoringMessage, MonitoringMessageData,
    StopSequenceMessage, StopSequenceMessageData, MessageDataType, MessageType
} from "./index";

import { RunnerMessageCode } from "@scramjet/types";

function isStopSequenceMessage(data: object): data is StopSequenceMessageData {
    if (typeof (data as StopSequenceMessageData).timeout !== "number") return false;
    if (typeof (data as StopSequenceMessageData).canCallKeepalive !== "boolean") return false;
    return true;
}
function isAcknowledgeMessage(data: object): data is AcknowledgeMessageData {
    return typeof (data as AcknowledgeMessageData).acknowledged === "boolean";
}
function isKeepAliveMessage(data: object): data is KeepAliveMessageData {
    return (data as KeepAliveMessageData).keepAlive >= 0;
}
function isMonitoringRateMessage(data: object): data is MonitoringRateMessageData {
    return (data as MonitoringRateMessageData).monitoringRate >= 0;
}
function isDescribeSequenceMessage(data: object): data is DescribeSequenceMessageData {
    // TODO: better checks needed
    return Array.isArray((data as DescribeSequenceMessageData).definition);
}
function isErrorMessage(data: object): data is ErrorMessageData {
    if (typeof (data as ErrorMessageData).message === "string") return false;
    if (typeof (data as ErrorMessageData).stack === "string") return false;
    if (typeof (data as ErrorMessageData).exitCode === "number") return false;
    if (typeof (data as ErrorMessageData).errorCode === "number") return false;
    return true;
}
function isMonitoringMessage(data: object): data is MonitoringMessageData {
    if ((data as MonitoringMessageData).sequences !== undefined &&
        Array.isArray((data as MonitoringMessageData).sequences)) return false;
    if (typeof (data as MonitoringMessageData).healthy !== "boolean") return false;
    return true;
}

/**
* Get an object of message type from serialized message.
* A helper method used for deserializing messages.
* @param msgCode - message type code
* @param msgData - a message object
* @return - an object of message type
*/
/* eslint-disable complexity */
export const getMessage = <X extends RunnerMessageCode>(
    msgCode: X,
    msgData: MessageDataType<X>
): MessageType<X> => {
    if (msgCode === RunnerMessageCode.KILL) {
        return { msgCode: RunnerMessageCode.KILL } as KillSequenceMessage as MessageType<X>;
    }
    if (msgCode === RunnerMessageCode.FORCE_CONFIRM_ALIVE) {
        return { msgCode: RunnerMessageCode.FORCE_CONFIRM_ALIVE } as ConfirmHealthMessage as MessageType<X>;
    }
    if (msgCode === RunnerMessageCode.STOP && isStopSequenceMessage(msgData)) {
        return { msgCode: RunnerMessageCode.STOP, ...msgData } as StopSequenceMessage as MessageType<X>;
    }
    if (msgCode === RunnerMessageCode.ALIVE && isKeepAliveMessage(msgData)) {
        return { msgCode: RunnerMessageCode.ALIVE, ...msgData } as KeepAliveMessage as MessageType<X>;
    }
    if (msgCode === RunnerMessageCode.MONITORING_RATE && isMonitoringRateMessage(msgData)) {
        return { msgCode: RunnerMessageCode.MONITORING_RATE, ...msgData } as MonitoringRateMessage as MessageType<X>;
    }
    if (msgCode === RunnerMessageCode.DESCRIBE_SEQUENCE && isDescribeSequenceMessage(msgData)) {
        return {
            msgCode: RunnerMessageCode.DESCRIBE_SEQUENCE, ...msgData
        } as DescribeSequenceMessage as MessageType<X>;
    }
    if (msgCode === RunnerMessageCode.ERROR && isErrorMessage(msgData)) {
        return { msgCode: RunnerMessageCode.ERROR, ...msgData } as ErrorMessage as MessageType<X>;
    }
    if (msgCode === RunnerMessageCode.MONITORING && isMonitoringMessage(msgData)) {
        return { msgCode: RunnerMessageCode.MONITORING, ...msgData } as MonitoringMessage as MessageType<X>;
    }
    if (msgCode === RunnerMessageCode.ACKNOWLEDGE && isAcknowledgeMessage(msgData)) {
        return { msgCode: RunnerMessageCode.ACKNOWLEDGE, ...msgData } as AcknowledgeMessage as MessageType<X>;
    }

    throw new Error("Unrecognized message code: " + msgCode);
};
