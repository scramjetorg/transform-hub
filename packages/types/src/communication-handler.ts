import { MonitoringMessageHandler, ControlMessageHandler } from "@scramjet/model";
import {
    ControlMessageCode,
    DownstreamStreamsConfig,
    MonitoringMessageCode,
    UpstreamStreamsConfig
} from ".";
import { EncodedSerializedControlMessage, MessageDataType } from "./message-streams";
import { PassThoughStream, ReadableStream } from "./utils";

export interface ICommunicationHandler {
    monitoringOutput: ReadableStream<string>
    controlOutput: PassThoughStream<EncodedSerializedControlMessage>

    hookUpstreamStreams(str: UpstreamStreamsConfig): this;
    hookDownstreamStreams(str: DownstreamStreamsConfig): this;

    addMonitoringHandler<T extends MonitoringMessageCode>(code: T, handler: MonitoringMessageHandler<T>): this;
    addControlHandler<T extends ControlMessageCode>(code: T, handler: ControlMessageHandler<T>): this;

    pipeMessageStreams(): this;
    pipeStdio(): this;
    pipeDataStreams(): this;

    sendMonitoringMessage<T extends MonitoringMessageCode>(code: T, msg: MessageDataType<T>): Promise<void>;
    sendControlMessage<T extends ControlMessageCode>(code: T, msg: MessageDataType<T>): Promise<void>;
}
