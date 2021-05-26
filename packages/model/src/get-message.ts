/* eslint-disable no-extra-parens */
import { RunnerMessageCode, SupervisorMessageCode } from "@scramjet/symbols";
import {
    AcknowledgeMessage, AcknowledgeMessageData,
    ConfirmHealthMessage,
    DescribeSequenceMessage, DescribeSequenceMessageData,
    ErrorMessage, ErrorMessageData,
    KeepAliveMessage, KeepAliveMessageData,
    KillSequenceMessage,
    MessageDataType, MessageType,
    MonitoringRateMessage, MonitoringRateMessageData,
    MonitoringMessageResponse, MonitoringMessageData,
    StopSequenceMessage, StopSequenceMessageData,
    EventMessageData, EventMessage, InstanceConfigMessageData
} from "@scramjet/types";


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
function isEventMessage(data: object): data is EventMessageData {
    return typeof (data as EventMessageData).eventName === "string" &&
        typeof (data as EventMessageData).message === "string";
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

// eslint-disable-next-line complexity
export const checkMessage = <X extends RunnerMessageCode | SupervisorMessageCode>(
    msgCode: X,
    msgData: MessageDataType<RunnerMessageCode>
): MessageDataType<X> => {
    if (msgCode === RunnerMessageCode.KILL) {
        return msgData as MessageDataType<KillSequenceMessage>;
    }
    if (msgCode === RunnerMessageCode.FORCE_CONFIRM_ALIVE) {
        return msgData as MessageDataType<ConfirmHealthMessage>;
    }
    if (msgCode === RunnerMessageCode.STOP && isStopSequenceMessage(msgData)) {
        return msgData as MessageDataType<StopSequenceMessage>;
    }
    if (msgCode === RunnerMessageCode.ALIVE && isKeepAliveMessage(msgData)) {
        return msgData as MessageDataType<KeepAliveMessage>;
    }
    if (msgCode === RunnerMessageCode.MONITORING_RATE && isMonitoringRateMessage(msgData)) {
        return msgData as MessageDataType<MonitoringRateMessage>;
    }
    if (msgCode === RunnerMessageCode.DESCRIBE_SEQUENCE && isDescribeSequenceMessage(msgData)) {
        return msgData as MessageDataType<DescribeSequenceMessage>;
    }
    if (msgCode === RunnerMessageCode.ERROR && isErrorMessage(msgData)) {
        return msgData as MessageDataType<ErrorMessage>;
    }
    if (msgCode === RunnerMessageCode.MONITORING && isMonitoringMessage(msgData)) {
        return msgData as MessageDataType<MonitoringMessageResponse>;
    }
    if (msgCode === RunnerMessageCode.ACKNOWLEDGE && isAcknowledgeMessage(msgData)) {
        return msgData as MessageDataType<AcknowledgeMessage>;
    }
    if (msgCode === RunnerMessageCode.EVENT && isEventMessage(msgData)) {
        return msgData as MessageDataType<EventMessage>;
    }
    if (msgCode === SupervisorMessageCode.CONFIG) {
        return msgData as MessageDataType<InstanceConfigMessageData>;
    }

    throw new Error(`Bad message of type ${msgCode}`);
};
/**
* Get an object of message type from serialized message.
* A helper method used for deserializing messages.
* @param msgCode - message type code
* @param msgData - a message object
* @return - an object of message type
*/
export const getMessage = <X extends RunnerMessageCode>(
    msgCode: X,
    msgData: MessageDataType<X>
): MessageType<X> => {
    return {
        msgCode,
        ...checkMessage(msgCode, msgData)
    } as unknown as MessageType<X>;
};
