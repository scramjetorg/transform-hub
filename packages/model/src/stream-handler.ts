import {
    ControlMessageCode,
    DownstreamStreamsConfig,
    EncodedControlMessage,
    EncodedMessage,
    EncodedMonitoringMessage,
    EncodedSerializedControlMessage,
    EncodedSerializedMonitoringMessage,
    ICommunicationHandler,
    LoggerOutput,
    MaybePromise,
    MessageDataType,
    MonitoringMessageCode,
    PassThoughStream,
    ReadableStream,
    UpstreamStreamsConfig,
    WritableStream
} from "@scramjet/types";
import { DataStream, StringStream } from "scramjet";
import { Readable, Writable } from "stream";
import { RunnerMessageCode, CommunicationChannel } from ".";

export type MonitoringMessageHandler<T extends MonitoringMessageCode> =
    (msg: EncodedMessage<T>) => MaybePromise<EncodedMessage<T>>;
export type ControlMessageHandler<T extends ControlMessageCode> =
    (msg: EncodedMessage<T>) => MaybePromise<EncodedMessage<T>>;

type MonitoringMessageHandlerList = {
    [RunnerMessageCode.ACKNOWLEDGE]: MonitoringMessageHandler<RunnerMessageCode.ACKNOWLEDGE>[];
    [RunnerMessageCode.DESCRIBE_SEQUENCE]: MonitoringMessageHandler<RunnerMessageCode.DESCRIBE_SEQUENCE>[];
    [RunnerMessageCode.STATUS]: MonitoringMessageHandler<RunnerMessageCode.STATUS>[];
    [RunnerMessageCode.ALIVE]: MonitoringMessageHandler<RunnerMessageCode.ALIVE>[];
    [RunnerMessageCode.ERROR]: MonitoringMessageHandler<RunnerMessageCode.ERROR>[];
    [RunnerMessageCode.MONITORING]: MonitoringMessageHandler<RunnerMessageCode.MONITORING>[];
    [RunnerMessageCode.EVENT]: MonitoringMessageHandler<RunnerMessageCode.EVENT>[];
    [RunnerMessageCode.PING]: MonitoringMessageHandler<RunnerMessageCode.PING>[];
    [RunnerMessageCode.SNAPSHOT_RESPONSE]: MonitoringMessageHandler<RunnerMessageCode.SNAPSHOT_RESPONSE>[];
    [RunnerMessageCode.SEQUENCE_STOPPED]: MonitoringMessageHandler<RunnerMessageCode.SEQUENCE_STOPPED>[];
};
type ControlMessageHandlerList = {
    [RunnerMessageCode.FORCE_CONFIRM_ALIVE]: ControlMessageHandler<RunnerMessageCode.FORCE_CONFIRM_ALIVE>[];
    [RunnerMessageCode.KILL]: ControlMessageHandler<RunnerMessageCode.KILL>[];
    [RunnerMessageCode.MONITORING_RATE]: ControlMessageHandler<RunnerMessageCode.MONITORING_RATE>[];
    [RunnerMessageCode.STOP]: ControlMessageHandler<RunnerMessageCode.STOP>[];
    [RunnerMessageCode.EVENT]: ControlMessageHandler<RunnerMessageCode.EVENT>[];
    [RunnerMessageCode.PONG]: ControlMessageHandler<RunnerMessageCode.PONG>[];
};

export class CommunicationHandler implements ICommunicationHandler {
    private stdInUpstream?: Readable;
    private stdInDownstream?: Writable;
    private stdOutUpstream?: Writable;
    private stdOutDownstream?: Readable;
    private stdErrUpstream?: Writable;
    private stdErrDownstream?: Readable;
    private controlUpstream?: ReadableStream<EncodedControlMessage>;
    private controlDownstream?: WritableStream<EncodedSerializedControlMessage>;
    private monitoringUpstream?: WritableStream<EncodedMonitoringMessage>;
    private monitoringDownstream?: ReadableStream<EncodedSerializedMonitoringMessage>;
    private loggerDownstream?: ReadableStream<string>;
    private loggerUpstream?: WritableStream<string>;
    private inputUpstream?: ReadableStream<string>;
    private outputUpstream?: WritableStream<string>;
    private inputDownstream?: WritableStream<string>;
    private outputDownstream?: ReadableStream<string>;
    private upstreams?: UpstreamStreamsConfig;
    private downstreams?: DownstreamStreamsConfig;

    private _controlOutput?: PassThoughStream<EncodedSerializedControlMessage>;
    private _monitoringOutput?: PassThoughStream<EncodedMonitoringMessage>;

    private controlPassThrough: DataStream;
    private monitoringPassThrough: DataStream;

    private _piped?: boolean;

    // private monitoringHandlers: MonitoringMessageHandler<MonitoringMessageCode>[] = [];
    // private controlHandlers: ControlMessageHandler<ControlMessageCode>[] = [];

    private monitoringHandlerHash: MonitoringMessageHandlerList;
    private controlHandlerHash: ControlMessageHandlerList;

    constructor() {
        this.controlPassThrough = new DataStream();
        this.monitoringPassThrough = new DataStream();
        this.controlHandlerHash = {
            [RunnerMessageCode.FORCE_CONFIRM_ALIVE]: [],
            [RunnerMessageCode.KILL]: [],
            [RunnerMessageCode.MONITORING_RATE]: [],
            [RunnerMessageCode.STOP]: [],
            [RunnerMessageCode.EVENT]: [],
            [RunnerMessageCode.PONG]: []
        };
        this.monitoringHandlerHash = {
            [RunnerMessageCode.ACKNOWLEDGE]: [],
            [RunnerMessageCode.DESCRIBE_SEQUENCE]: [],
            [RunnerMessageCode.STATUS]: [],
            [RunnerMessageCode.ALIVE]: [],
            [RunnerMessageCode.ERROR]: [],
            [RunnerMessageCode.MONITORING]: [],
            [RunnerMessageCode.EVENT]: [],
            [RunnerMessageCode.PING]: [],
            [RunnerMessageCode.SNAPSHOT_RESPONSE]: [],
            [RunnerMessageCode.SEQUENCE_STOPPED]: []
        };
    }

    getMonitorStream(): DataStream {
        return this.monitoringPassThrough.pipe(new DataStream());
    }

    getStdio(): { stdin: Writable; stdout: Readable; stderr: Readable; } {
        if (!this.stdInDownstream || !this.stdOutDownstream || !this.stdErrDownstream) {
            throw new Error("Streams not attached");
        }

        return {
            stdin: this.stdInDownstream,
            stdout: this.stdOutDownstream,
            stderr: this.stdErrDownstream
        };
    }

    hookUpstreamStreams(streams: UpstreamStreamsConfig): this {
        this.stdInUpstream = streams[CommunicationChannel.STDIN];
        this.stdOutUpstream = streams[CommunicationChannel.STDOUT];
        this.stdErrUpstream = streams[CommunicationChannel.STDERR];
        this.controlUpstream = streams[CommunicationChannel.CONTROL];
        this.monitoringUpstream = streams[CommunicationChannel.MONITORING];

        this.loggerUpstream = streams[CommunicationChannel.LOG];

        this.inputUpstream = streams[CommunicationChannel.IN_DOWN_STR];
        this.outputUpstream = streams[CommunicationChannel.OUT_DOWN_STR];
        this.upstreams = streams;

        return this;
    }

    hookDownstreamStreams(streams: DownstreamStreamsConfig): this {
        this.stdInDownstream = streams[CommunicationChannel.STDIN];
        this.stdOutDownstream = streams[CommunicationChannel.STDOUT];
        this.stdErrDownstream = streams[CommunicationChannel.STDERR];
        this.controlDownstream = streams[CommunicationChannel.CONTROL];
        this.monitoringDownstream = streams[CommunicationChannel.MONITORING];

        this.loggerDownstream = streams[CommunicationChannel.LOG];

        this.inputDownstream = streams[CommunicationChannel.IN_DOWN_STR];
        this.outputDownstream = streams[CommunicationChannel.OUT_DOWN_STR];
        this.downstreams = streams;

        return this;
    }

    pipeMessageStreams() {
        if (this._piped)
            throw new Error("pipeMessageStreams called twice");
        this._piped = true;

        if (this.areStreamsHooked()) {
            const monitoringOutput = StringStream.from(this.monitoringDownstream as Readable)
                .JSONParse()
                .pipe(this.monitoringPassThrough)
                .map(async (message: EncodedMonitoringMessage) => {
                    // TODO: WARN if (!this.monitoringHandlerHash[message[0]])
                    if (this.monitoringHandlerHash[message[0]].length) {
                        let currentMessage = message as any;

                        for (const handler of this.monitoringHandlerHash[message[0]]) {
                            currentMessage = await handler(currentMessage);
                        }
                        return currentMessage as EncodedMonitoringMessage;
                    }

                    return message;
                })
                .JSONStringify();

            monitoringOutput.pipe(this.monitoringUpstream as unknown as Writable);
            this._monitoringOutput = monitoringOutput as unknown as PassThoughStream<EncodedMonitoringMessage>;

            const controlOutput = StringStream.from(this.controlUpstream as Readable)
                .JSONParse()
                .pipe(this.controlPassThrough)
                .map(async (message: EncodedControlMessage) => {
                    // TODO: WARN if (!this.controlHandlerHash[message[0]])
                    if (this.controlHandlerHash[message[0]].length) {
                        let currentMessage = message as any;

                        for (const handler of this.controlHandlerHash[message[0]]) {
                            currentMessage = await handler(currentMessage);
                        }
                        return currentMessage as EncodedMonitoringMessage;
                    }

                    return message;
                })
                .JSONStringify();

            controlOutput.pipe(this.controlDownstream as unknown as Writable);
            this._controlOutput = controlOutput as unknown as PassThoughStream<EncodedSerializedControlMessage>;

            if (this.loggerUpstream) {
                this.loggerDownstream?.pipe(this.loggerUpstream);
            }
        } else {
            // TODO: specifiy which streams are missing.
            throw new Error("Cannot pipe stream, some streams missing");
        }

        return this;
    }

    get monitoringOutput(): ReadableStream<string> {
        if (!this._monitoringOutput) throw new Error("Monitoring: Stream not yet hooked up");

        return this.monitoringUpstream as unknown as ReadableStream<string>;
    }

    get controlOutput(): PassThoughStream<EncodedSerializedControlMessage> {
        if (!this._controlOutput) throw new Error("Control: Stream not yet hooked up");
        return this._controlOutput;
    }

    areStreamsHooked() {
        return !!(this.upstreams &&
            this.downstreams &&
            this.controlDownstream &&
            this.controlUpstream &&
            this.monitoringDownstream &&
            this.monitoringUpstream &&
            this.loggerDownstream &&
            this.loggerUpstream &&
            this.inputUpstream &&
            this.outputUpstream &&
            this.outputDownstream &&
            this.inputDownstream);
    }

    getLogOutput(): LoggerOutput {
        if (!this.loggerUpstream) {
            throw new Error("Streams not attached");
        }

        return { out: this.loggerUpstream, err: this.loggerUpstream };
    }

    pipeStdio(): this {

        DataStream.from(this.stdInUpstream as Readable)
            .pipe(this.stdInDownstream as unknown as Writable);

        DataStream.from(this.stdOutDownstream as Readable)
            .pipe(this.stdOutUpstream as unknown as Writable);

        DataStream.from(this.stdErrDownstream as Readable)
            .pipe(this.stdErrUpstream as unknown as Writable);

        return this;
    }

    pipeDataStreams(): this {
        /**
         * @analyze-how-to-pass-in-out-streams
         * Pipe upstream input stream to a Sequence to downstream input stream.
         * Pipe downstream output stream from a Sequence to upstream output stream.
         */
        throw new Error("Not yet implemented");
    }

    addMonitoringHandler<T extends MonitoringMessageCode>(_code: T, handler: MonitoringMessageHandler<T>): this {
        this.monitoringHandlerHash[_code].push(handler as any);
        return this;
    }

    addControlHandler<T extends ControlMessageCode>(_code: T, handler: ControlMessageHandler<T>): this {
        this.controlHandlerHash[_code].push(handler as any);
        return this;
    }

    async sendMonitoringMessage<T extends MonitoringMessageCode>(code: T, msg: MessageDataType<T>): Promise<void> {
        const encoded: EncodedMonitoringMessage = [code, msg];

        await this.monitoringPassThrough.whenWrote(encoded);
    }

    async sendControlMessage<T extends ControlMessageCode>(code: T, msg: MessageDataType<T>): Promise<void> {
        const encoded: EncodedControlMessage = [code, msg];

        await this.controlPassThrough.whenWrote(encoded);
    }

}

