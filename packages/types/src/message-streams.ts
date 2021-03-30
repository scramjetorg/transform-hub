import { Readable, Writable } from "stream";
import { ReadableStream, WritableStream } from ".";
import {
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
    MonitoringMessage,
    MonitoringMessageData,
    MonitoringRateMessage,
    MonitoringRateMessageData,
    RunnerMessageCode,
    StopSequenceMessage,
    StopSequenceMessageData,
    HandshakeMessage,
    HandshakeAcknowledgeMessageData,
    HandshakeAcknowledgeMessage,
    SnapshotResponseMessage,
    SnapshotResponseMessageData
} from "@scramjet/model";

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
    T extends RunnerMessageCode.PING ? HandshakeMessage :
    T extends RunnerMessageCode.PONG ? HandshakeAcknowledgeMessage :
    T extends RunnerMessageCode.SNAPSHOT_RESPONSE ? SnapshotResponseMessage :
    never
    ;

export type MessageDataType<T> =
    T extends RunnerMessageCode.ACKNOWLEDGE ? AcknowledgeMessageData :
    T extends RunnerMessageCode.ALIVE ? KeepAliveMessageData :
    T extends RunnerMessageCode.DESCRIBE_SEQUENCE ? DescribeSequenceMessageData :
    T extends RunnerMessageCode.ERROR ? ErrorMessageData :
    T extends RunnerMessageCode.FORCE_CONFIRM_ALIVE ? EmptyMessageData :
    T extends RunnerMessageCode.KILL | RunnerMessageCode.FORCE_CONFIRM_ALIVE ? EmptyMessageData :
    T extends RunnerMessageCode.MONITORING ? MonitoringMessageData :
    T extends RunnerMessageCode.MONITORING_RATE ? MonitoringRateMessageData :
    T extends RunnerMessageCode.STOP ? StopSequenceMessageData :
    T extends RunnerMessageCode.PING ? EmptyMessageData :
    T extends RunnerMessageCode.PONG ? HandshakeAcknowledgeMessageData :
    T extends RunnerMessageCode.SNAPSHOT_RESPONSE ? SnapshotResponseMessageData :
    never
    ;

export type EncodedMessage<T extends RunnerMessageCode> = [T, MessageDataType<T>];
export type ControlMessageCode =
    RunnerMessageCode.FORCE_CONFIRM_ALIVE | RunnerMessageCode.KILL |
    RunnerMessageCode.MONITORING_RATE | RunnerMessageCode.STOP | RunnerMessageCode.EVENT |
    RunnerMessageCode.PONG;

export type EncodedControlMessage = EncodedMessage<ControlMessageCode>;
export type MonitoringMessageCode =
    RunnerMessageCode.ACKNOWLEDGE | RunnerMessageCode.DESCRIBE_SEQUENCE |
    RunnerMessageCode.ALIVE | RunnerMessageCode.ERROR | RunnerMessageCode.MONITORING | RunnerMessageCode.EVENT |
    RunnerMessageCode.PING | RunnerMessageCode.SNAPSHOT_RESPONSE | RunnerMessageCode.SEQUENCE_STOPPED;

export type EncodedSerializedControlMessage = string;
export type EncodedSerializedMonitoringMessage = string;

export type EncodedMonitoringMessage = EncodedMessage<MonitoringMessageCode>;
// @ToDo: verify streams types

export type UpstreamStreamsConfig = [
    stdin: Readable,
    stdout: Writable,
    stderr: Writable,
    control: ReadableStream<EncodedControlMessage>,
    monitor: WritableStream<EncodedMonitoringMessage>,
    pkg?: Readable,
    input?: ReadableStream<any>,
    output?: WritableStream<any> // optional output stream piped to runner - if none passed, `this.stdout` will be used
];

export type DownstreamStreamsConfig = [
    stdin: Writable,
    stdout: Readable,
    stderr: Readable,
    control: WritableStream<EncodedSerializedControlMessage>,
    monitor: ReadableStream<EncodedSerializedMonitoringMessage>,
    pkg?: Readable,
    input?: WritableStream<any>,
    output?: ReadableStream<any> // optional output stream piped to runner - if none passed, `this.stdout` will be used
];
