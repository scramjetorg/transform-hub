import { RunnerMessageCode } from "@scramjet/types";

import { MessageUtilities } from "./messages-utils";
import { AcknowledgeMessage, AcknowledgeMessageData } from "./messages/acknowledge";
import { ConfirmHealthMessage } from "./messages/confirm-health";
import { DescribeSequenceMessage, DescribeSequenceMessageData } from "./messages/describe-sequence";
import { ErrorMessage, ErrorMessageData } from "./messages/error";
import { KeepAliveMessage, KeepAliveMessageData } from "./messages/keep-alive";
import { KillSequenceMessage } from "./messages/kill-sequence";
import { Message, EmptyMessageData } from "./messages/message";
import { MonitoringMessage, MonitoringMessageData } from "./messages/monitoring";
import { MonitoringRateMessage, MonitoringRateMessageData } from "./messages/monitor-rate";
import { StopSequenceMessage, StopSequenceMessageData } from "./messages/stop-sequence";

type MessageType<T> =
    T extends RunnerMessageCode.ACKNOWLEDGE ? AcknowledgeMessage :
    T extends RunnerMessageCode.ALIVE ? KeepAliveMessage :
    T extends RunnerMessageCode.DESCRIBE_SEQUENCE ? DescribeSequenceMessage :
    T extends RunnerMessageCode.ERROR ? ErrorMessage :
    T extends RunnerMessageCode.FORCE_CONFIRM_ALIVE ? ConfirmHealthMessage :
    T extends RunnerMessageCode.KILL ? KillSequenceMessage :
    T extends RunnerMessageCode.MONITORING ? MonitoringMessage :
    T extends RunnerMessageCode.MONITORING_RATE ? MonitoringRateMessage :
    T extends RunnerMessageCode.STOP ? StopSequenceMessage :
    never;

type MessageDataType<T> =
    T extends RunnerMessageCode.ACKNOWLEDGE ? AcknowledgeMessage :
    T extends RunnerMessageCode.ALIVE ? KeepAliveMessage :
    T extends RunnerMessageCode.DESCRIBE_SEQUENCE ? DescribeSequenceMessage :
    T extends RunnerMessageCode.ERROR ? ErrorMessage :
    T extends RunnerMessageCode.FORCE_CONFIRM_ALIVE ? ConfirmHealthMessage :
    T extends RunnerMessageCode.KILL | RunnerMessageCode.FORCE_CONFIRM_ALIVE ? EmptyMessageData :
    T extends RunnerMessageCode.MONITORING ? MonitoringMessage :
    T extends RunnerMessageCode.MONITORING_RATE ? MonitoringRateMessage :
    T extends RunnerMessageCode.STOP ? StopSequenceMessageData :
    never;

export {
    AcknowledgeMessage,
    AcknowledgeMessageData,
    ConfirmHealthMessage,
    DescribeSequenceMessage,
    DescribeSequenceMessageData,
    EmptyMessageData,
    ErrorMessage,
    ErrorMessageData,
    KeepAliveMessage,
    KeepAliveMessageData,
    KillSequenceMessage,
    Message,
    MessageDataType,
    MessageType,
    MessageUtilities,
    MonitoringMessage,
    MonitoringMessageData,
    MonitoringRateMessage,
    MonitoringRateMessageData,
    StopSequenceMessage,
    StopSequenceMessageData,
};
