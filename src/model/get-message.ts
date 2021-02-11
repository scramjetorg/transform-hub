/* eslint-disable no-extra-parens */
/* eslint-disable complexity */
import {
    Message, MessageData,
    AcknowledgeMessage, AcknowledgeMessageData,
    ConfirmHealthMessage, ConfirmHealthMessageData,
    DescribeSequenceMessage, DescribeSequenceMessageData,
    ErrorMessage, ErrorMessageData,
    KeepAliveMessage, KeepAliveMessageData,
    KillSequenceMessage, KillSequenceMessageData,
    MonitoringRateMessage, MonitoringRateMessageData,
    MonitoringMessage, MonitoringMessageData,
    StopSequenceMessage, StopSequenceMessageData
} from "./index";
import { RunnerMessageCode } from "@scramjet/types";

function isStopSequenceMessage(data: object): data is StopSequenceMessageData {
    if (typeof (data as StopSequenceMessageData).timeout !== "number") return false;
    if (typeof (data as StopSequenceMessageData).canCallKeepalive !== "boolean") return false;
    return true;
}

function isKillSequenceMessage(data: object): data is KillSequenceMessageData {
    return Object.keys(data as KillSequenceMessageData).length === 0;
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
function isConfirmHealthMessage(data: object): data is ConfirmHealthMessageData {
    return Object.keys(data as ConfirmHealthMessageData).length === 0;
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

type AcceptableCodes = RunnerMessageCode.KILL | RunnerMessageCode.STOP | RunnerMessageCode.ALIVE | 
    RunnerMessageCode.MONITORING_RATE | RunnerMessageCode.FORCE_CONFIRM_ALIVE | 
    RunnerMessageCode.DESCRIBE_SEQUENCE | RunnerMessageCode.ERROR | RunnerMessageCode.MONITORING | 
    RunnerMessageCode.ACKNOWLEDGE;

type MessageType<T> =
    T extends RunnerMessageCode.KILL ? KillSequenceMessage :
    T extends RunnerMessageCode.STOP ? StopSequenceMessage :
    T extends RunnerMessageCode.ALIVE ? KeepAliveMessage :
    T extends RunnerMessageCode.MONITORING_RATE ? MonitoringRateMessage :
    T extends RunnerMessageCode.FORCE_CONFIRM_ALIVE ? ConfirmHealthMessage :
    T extends RunnerMessageCode.DESCRIBE_SEQUENCE ? DescribeSequenceMessage :
    T extends RunnerMessageCode.ERROR ? ErrorMessage :
    T extends RunnerMessageCode.MONITORING ? MonitoringMessage :
    T extends RunnerMessageCode.ACKNOWLEDGE ? AcknowledgeMessage :
    never;

type MessageDataType<T> =
    T extends RunnerMessageCode.KILL ? KillSequenceMessageData :
    T extends RunnerMessageCode.STOP ? StopSequenceMessageData :
    T extends RunnerMessageCode.ALIVE ? KeepAliveMessage :
    T extends RunnerMessageCode.MONITORING_RATE ? MonitoringRateMessage :
    T extends RunnerMessageCode.FORCE_CONFIRM_ALIVE ? ConfirmHealthMessage :
    T extends RunnerMessageCode.DESCRIBE_SEQUENCE ? DescribeSequenceMessage :
    T extends RunnerMessageCode.ERROR ? ErrorMessage :
    T extends RunnerMessageCode.MONITORING ? MonitoringMessage :
    T extends RunnerMessageCode.ACKNOWLEDGE ? AcknowledgeMessage :
    never;

const _md: MessageDataType<RunnerMessageCode.STOP> = {
    canCallKeepalive: false,
    timeout: 1e3
};

const _mt: MessageType<RunnerMessageCode.STOP> = {
    msgCode: RunnerMessageCode.STOP,
    ..._md
};

/**
* Get an object of message type from serialized message.
* A helper method used for deserializing messages.
* @param msgCode - message type code
* @param msgData - a message object
* @return - an object of message type
*/
export const getMessage: <X extends RunnerMessageCode.STOP>(
    msgCode: X, 
    msgData: MessageDataType<X>
) => MessageType<X> =
(msgCode, msgData) => {
    if (msgCode === RunnerMessageCode.STOP && isStopSequenceMessage(msgData)) {
        const _ret: MessageType<RunnerMessageCode.STOP> = { msgCode: RunnerMessageCode.STOP, ...msgData };
        return _ret;
    }

    throw new Error("Unrecognized message code: " + msgCode);
};

const ok1 = getMessage(RunnerMessageCode.KILL, {});
const ok2 = getMessage(RunnerMessageCode.STOP, { canCallKeepalive: false, timeout: 1e6 });


