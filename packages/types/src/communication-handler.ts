import { DataStream } from "scramjet";
import { Readable, Writable } from "stream";
import { IObjectLogger } from "./object-logger";
import { LoggerOutput } from "./logger";
import {
    ControlMessageCode, DownstreamStreamsConfig, EncodedMessage, MessageDataType,
    MonitoringMessageCode, UpstreamStreamsConfig
} from "./message-streams";
import { MaybePromise } from "./utils";

export type MonitoringMessageHandler<T extends MonitoringMessageCode> =
    (msg: EncodedMessage<T>) => void;
export type MutatingMonitoringMessageHandler<T extends MonitoringMessageCode> =
    (msg: EncodedMessage<T>) => MaybePromise<EncodedMessage<T> | null>;
export type ControlMessageHandler<T extends ControlMessageCode> =
    (msg: EncodedMessage<T>) => MaybePromise<EncodedMessage<T> | null>;

export interface ICommunicationHandler {
    logger: IObjectLogger;

    hookUpstreamStreams(str: UpstreamStreamsConfig): this;
    hookDownstreamStreams(str: DownstreamStreamsConfig): this;

    addMonitoringHandler<T extends MonitoringMessageCode>(code: T, handler: MutatingMonitoringMessageHandler<T>,
        blocking: true): this;
    addMonitoringHandler<T extends MonitoringMessageCode>(code: T, handler: MonitoringMessageHandler<T>,
        blocking: false): this;
    addMonitoringHandler<T extends MonitoringMessageCode>(code: T, handler: MonitoringMessageHandler<T>): this;

    // TODO: we need non-mutating handlers (addControlListener)
    addControlHandler<T extends ControlMessageCode>(code: T, handler: ControlMessageHandler<T>): this;

    pipeMessageStreams(): this;
    pipeStdio(): this;
    pipeDataStreams(): this;

    sendMonitoringMessage<T extends MonitoringMessageCode>(code: T, msg: MessageDataType<T>): Promise<void>;
    sendControlMessage<T extends ControlMessageCode>(code: T, msg: MessageDataType<T>): Promise<void>;

    /**
     * Returns a copy of monitor stream for reading - does not interact with the fifo stream itself
     */
    getMonitorStream(): DataStream;
    /**
     * Returns log stream for writing
     */
    getLogOutput(): LoggerOutput;

    /**
     * Gets stdio streams for full interaction
     */
    getStdio(): {
        stdin: Writable,
        stdout: Readable,
        stderr: Readable
    };
}

