import {
    ReadableStream,
    WritableStream,
    PassThoughStream
} from "./utils";

import { RunnerMessageCode, CPMMessageCode } from "@scramjet/symbols";

import {
    AcknowledgeMessage,
    AcknowledgeMessageData,
    DescribeSequenceMessage,
    DescribeSequenceMessageData,
    ErrorMessage,
    ErrorMessageData,
    KeepAliveMessage,
    KeepAliveMessageData,
    KillSequenceMessage,
    MonitoringMessageData,
    MonitoringRateMessage,
    MonitoringRateMessageData,
    StopSequenceMessage,
    StopSequenceMessageData,
    HandshakeMessage,
    HandshakeAcknowledgeMessageData,
    HandshakeAcknowledgeMessage,
    StatusMessage,
    StatusMessageData,
    MonitoringMessage,
    LoadCheckStatMessage,
    NetworkInfoMessage,
    InstanceBulkMessage,
    SequenceBulkMessage,
    SequenceMessage,
    InstanceMessage,
    PingMessageData,
    SequenceStoppedMessageData,
    PangMessageData,
    EventMessageData,
    ConfirmMessage
} from "./messages";
import { CPMMessageSTHID, STHIDMessageData } from "./messages/sth-id";
import { LoadCheckStat } from "./load-check-stat";
import { NetworkInfo } from "./network-info";
import { SequenceCompleteMessageData } from "./messages/sequence-complete";
import { KillMessageData } from "./messages/kill-sequence";

export type MessageType<T> =
    T extends RunnerMessageCode.ACKNOWLEDGE ? AcknowledgeMessage :
    T extends RunnerMessageCode.ALIVE ? KeepAliveMessage :
    T extends RunnerMessageCode.DESCRIBE_SEQUENCE ? DescribeSequenceMessage :
    T extends RunnerMessageCode.STATUS ? StatusMessage :
    T extends RunnerMessageCode.ERROR ? ErrorMessage :
    T extends RunnerMessageCode.KILL ? KillSequenceMessage :
    T extends RunnerMessageCode.MONITORING ? MonitoringMessage :
    T extends RunnerMessageCode.MONITORING_RATE ? MonitoringRateMessage :
    T extends RunnerMessageCode.STOP ? StopSequenceMessage :
    T extends RunnerMessageCode.PING ? HandshakeMessage :
    T extends RunnerMessageCode.PONG ? HandshakeAcknowledgeMessage :
    T extends CPMMessageCode.STH_ID ? CPMMessageSTHID :
    T extends CPMMessageCode.LOAD ? LoadCheckStatMessage :
    T extends CPMMessageCode.NETWORK_INFO ? NetworkInfoMessage :
    T extends CPMMessageCode.CONFIRM ? ConfirmMessage :
    never
    ;

export type MessageDataType<T> =
    T extends RunnerMessageCode.ACKNOWLEDGE ? AcknowledgeMessageData :
    T extends RunnerMessageCode.ALIVE ? KeepAliveMessageData :
    T extends RunnerMessageCode.DESCRIBE_SEQUENCE ? DescribeSequenceMessageData :
    T extends RunnerMessageCode.STATUS ? StatusMessageData :
    T extends RunnerMessageCode.ERROR ? ErrorMessageData :
    T extends RunnerMessageCode.KILL ? KillMessageData :
    T extends RunnerMessageCode.MONITORING ? MonitoringMessageData :
    T extends RunnerMessageCode.MONITORING_RATE ? MonitoringRateMessageData :
    T extends RunnerMessageCode.STOP ? StopSequenceMessageData :
    T extends RunnerMessageCode.PING ? PingMessageData :
    T extends RunnerMessageCode.PONG ? HandshakeAcknowledgeMessageData :
    T extends RunnerMessageCode.PANG ? PangMessageData :
    T extends RunnerMessageCode.SEQUENCE_COMPLETED ? SequenceCompleteMessageData :
    T extends RunnerMessageCode.SEQUENCE_STOPPED ? SequenceStoppedMessageData :
    T extends RunnerMessageCode.EVENT ? EventMessageData :
    T extends CPMMessageCode.STH_ID ? STHIDMessageData :
    T extends CPMMessageCode.LOAD ? LoadCheckStat :
    T extends CPMMessageCode.NETWORK_INFO ? NetworkInfo[] :
    T extends CPMMessageCode.INSTANCES ? InstanceBulkMessage :
    T extends CPMMessageCode.INSTANCE ? InstanceMessage :
    T extends CPMMessageCode.SEQUENCES ? SequenceBulkMessage :
    T extends CPMMessageCode.SEQUENCE ? SequenceMessage :
    T extends CPMMessageCode.CONFIRM ? ConfirmMessage :
    never
    ;

export type EncodedMessage<
    T extends RunnerMessageCode| CPMMessageCode
    > = [T, MessageDataType<T>];

export type ControlMessageCode =
    RunnerMessageCode.KILL | RunnerMessageCode.MONITORING_RATE | RunnerMessageCode.STOP | RunnerMessageCode.EVENT |
    RunnerMessageCode.PONG |
    CPMMessageCode.STH_ID | CPMMessageCode.KEY_REVOKED | CPMMessageCode.LIMIT_EXCEEDED | CPMMessageCode.ID_DROP | CPMMessageCode.CONFIRM |
    RunnerMessageCode.INPUT_CONTENT_TYPE;

export type EncodedControlMessage = EncodedMessage<ControlMessageCode>;

export type MonitoringMessageCode =
    RunnerMessageCode.ACKNOWLEDGE | RunnerMessageCode.DESCRIBE_SEQUENCE | RunnerMessageCode.STATUS |
    RunnerMessageCode.ALIVE | RunnerMessageCode.ERROR | RunnerMessageCode.MONITORING | RunnerMessageCode.EVENT |
    RunnerMessageCode.PING | RunnerMessageCode.PANG |
    RunnerMessageCode.SEQUENCE_STOPPED | RunnerMessageCode.SEQUENCE_COMPLETED | CPMMessageCode.LOAD |
    CPMMessageCode.NETWORK_INFO | CPMMessageCode.CONFIRM;

export type EncodedSerializedControlMessage = string;
export type EncodedSerializedMonitoringMessage = string;

export type EncodedMonitoringMessage = EncodedMessage<MonitoringMessageCode>;
export type EncodedCPMSTHMessage = EncodedMessage<CPMMessageCode>;

export type DownstreamStreamsConfig<serialized extends boolean = true> = [
    stdin: WritableStream<string>,
    stdout: ReadableStream<string>,
    stderr: ReadableStream<string>,
    control: WritableStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage>,
    monitor: ReadableStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage>,
    input: WritableStream<any>,
    output: ReadableStream<any>,
    log: ReadableStream<any>,
    // @TODO investigate, it seems not to be used anywhere
    pkg?: WritableStream<Buffer> | undefined,
];

export type DownstreamStdioConfig = [ stdin: WritableStream<string>,
    stdout: ReadableStream<string>,
    stderr: ReadableStream<string>, ]

export type UpstreamStreamsConfig<serialized extends boolean = true> = [
    stdin: ReadableStream<string>,
    stdout: WritableStream<string>,
    stderr: WritableStream<string>,
    control: ReadableStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage>,
    monitor: WritableStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage>,
    input: ReadableStream<any>,
    output: WritableStream<any>,
    log: WritableStream<any>,
    pkg?: ReadableStream<Buffer>
];

export type PassThroughStreamsConfig<serialized extends boolean = true> = [
    stdin: PassThoughStream<string>,
    stdout: PassThoughStream<string>,
    stderr: PassThoughStream<string>,
    control: PassThoughStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage>,
    monitor: PassThoughStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage>,
    input: PassThoughStream<any>,
    output: PassThoughStream<any>,
    log: PassThoughStream<any>,
    pkg?: PassThoughStream<Buffer>
];
