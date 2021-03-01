import { Readable, Writable } from "stream";
import { ReadableStream, WritableStream } from "@scramjet/types/src/utils";
import { RunnerMessageCode } from "@scramjet/model/src/runner-message";
import { AcknowledgeMessage } from "@scramjet/model/src/messages/acknowledge";
import { ConfirmHealthMessage } from "@scramjet/model/src/messages/confirm-health";
import { DescribeSequenceMessage } from "@scramjet/model/src/messages/describe-sequence";
import { ErrorMessage } from "@scramjet/model/src/messages/error";
import { KeepAliveMessage } from "@scramjet/model/src/messages/keep-alive";
import { KillSequenceMessage } from "@scramjet/model/src/messages/kill-sequence";
import { EmptyMessageData } from "@scramjet/model/src/messages/message";
import { MonitoringMessage } from "@scramjet/model/src/messages/monitoring";
import { MonitoringRateMessage } from "@scramjet/model/src/messages/monitor-rate";
import { StopSequenceMessage, StopSequenceMessageData } from "@scramjet/model/src/messages/stop-sequence";

export type MessageType<T> =
    T extends RunnerMessageCode.ACKNOWLEDGE ? AcknowledgeMessage :
    T extends RunnerMessageCode.ALIVE ? KeepAliveMessage :
    T extends RunnerMessageCode.DESCRIBE_SEQUENCE ? DescribeSequenceMessage :
    T extends RunnerMessageCode.ERROR ? ErrorMessage :
    T extends RunnerMessageCode.FORCE_CONFIRM_ALIVE ? ConfirmHealthMessage :
    T extends RunnerMessageCode.KILL ? KillSequenceMessage :
    T extends RunnerMessageCode.MONITORING ? MonitoringMessage :
    T extends RunnerMessageCode.MONITORING_RATE ? MonitoringRateMessage :
    T extends RunnerMessageCode.STOP ? StopSequenceMessage :
    never
;
export type MessageDataType<T> =
    T extends RunnerMessageCode.ACKNOWLEDGE ? AcknowledgeMessage :
    T extends RunnerMessageCode.ALIVE ? KeepAliveMessage :
    T extends RunnerMessageCode.DESCRIBE_SEQUENCE ? DescribeSequenceMessage :
    T extends RunnerMessageCode.ERROR ? ErrorMessage :
    T extends RunnerMessageCode.FORCE_CONFIRM_ALIVE ? ConfirmHealthMessage :
    T extends RunnerMessageCode.KILL | RunnerMessageCode.FORCE_CONFIRM_ALIVE ? EmptyMessageData :
    T extends RunnerMessageCode.MONITORING ? MonitoringMessage :
    T extends RunnerMessageCode.MONITORING_RATE ? MonitoringRateMessage :
    T extends RunnerMessageCode.STOP ? StopSequenceMessageData :
    never
;

export type EncodedMessage<T extends RunnerMessageCode> = [T, MessageDataType<T>];
export type ControlMessageCode =
    RunnerMessageCode.FORCE_CONFIRM_ALIVE | RunnerMessageCode.KILL |
    RunnerMessageCode.MONITORING_RATE | RunnerMessageCode.STOP;

export type EncodedControlMessage = EncodedMessage<ControlMessageCode>;
export type MonitoringMessageCode =
    RunnerMessageCode.ACKNOWLEDGE | RunnerMessageCode.DESCRIBE_SEQUENCE |
    RunnerMessageCode.ALIVE | RunnerMessageCode.ERROR | RunnerMessageCode.MONITORING;

export type EncodedMonitoringMessage = EncodedMessage<MonitoringMessageCode>;
// @ToDo: verify streams types

export type UpstreamStreamsConfig = [
    stdin: Readable,
    stdout: Writable,
    stderr: Writable,
    control: ReadableStream<EncodedControlMessage>,
    monitor: WritableStream<EncodedMonitoringMessage>,
    input?: ReadableStream<any>,
    output?: WritableStream<any> // optional output stream piped to runner - if none passed, `this.stdout` will be used
];

export type DownstreamStreamsConfig = [
    stdin: Writable,
    stdout: Readable,
    stderr: Readable,
    control: WritableStream<EncodedControlMessage>,
    monitor: ReadableStream<EncodedMonitoringMessage>,
    input?: WritableStream<any>,
    output?: ReadableStream<any> // optional output stream piped to runner - if none passed, `this.stdout` will be used
];
