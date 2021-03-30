import {
    ControlMessageCode,
    DownstreamStreamsConfig,
    EncodedControlMessage,
    EncodedMessage,
    EncodedMonitoringMessage,
    EncodedSerializedControlMessage,
    EncodedSerializedMonitoringMessage,
    ICommunicationHandler,
    MaybePromise,
    MessageDataType,
    MonitoringMessageCode,
    ReadableStream,
    UpstreamStreamsConfig,
    WritableStream
} from "@scramjet/types";
import { DataStream, StringStream } from "scramjet";
import { Readable, Writable } from "stream";
import { RunnerMessageCode } from ".";

export type MonitoringMessageHandler<T extends MonitoringMessageCode> =
    (msg: EncodedMessage<T>) => MaybePromise<EncodedMessage<T>>;
export type ControlMessageHandler<T extends ControlMessageCode> =
    (msg: EncodedMessage<T>) => MaybePromise<EncodedMessage<T>>;

type MonitoringMessageHandlerList = {
    [RunnerMessageCode.ACKNOWLEDGE]: MonitoringMessageHandler<RunnerMessageCode.ACKNOWLEDGE>[];
    [RunnerMessageCode.DESCRIBE_SEQUENCE]: MonitoringMessageHandler<RunnerMessageCode.DESCRIBE_SEQUENCE>[];
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
    private upstreams?: UpstreamStreamsConfig;
    private downstreams?: DownstreamStreamsConfig;

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
            [RunnerMessageCode.ALIVE]: [],
            [RunnerMessageCode.ERROR]: [],
            [RunnerMessageCode.MONITORING]: [],
            [RunnerMessageCode.EVENT]: [],
            [RunnerMessageCode.PING]: [],
            [RunnerMessageCode.SNAPSHOT_RESPONSE]: [],
            [RunnerMessageCode.SEQUENCE_STOPPED]: []
        };
    }

    hookClientStreams(streams: UpstreamStreamsConfig): this {
        this.stdInUpstream = streams[0];
        this.stdOutUpstream = streams[1];
        this.stdErrUpstream = streams[2];
        this.controlUpstream = streams[3];
        this.monitoringUpstream = streams[4];
        this.upstreams = streams;

        return this;
    }

    hookLifecycleStreams(streams: DownstreamStreamsConfig): this {
        this.stdInDownstream = streams[0];
        this.stdOutDownstream = streams[1];
        this.stdErrDownstream = streams[2];
        this.controlDownstream = streams[3];
        this.monitoringDownstream = streams[4];
        this.downstreams = streams;

        return this;
    }

    pipeMessageStreams() {
        if (this._piped)
            throw new Error("pipeMessageStreams called twice");
        this._piped = true;

        if (this.areStreamsHooked()) {
            StringStream.from(this.monitoringDownstream as Readable)
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
                .JSONStringify()
                .pipe(this.monitoringUpstream as unknown as Writable);

            StringStream.from(this.controlUpstream as Readable)
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
                .JSONStringify()
                .pipe(this.controlDownstream as unknown as Writable);

        } else {
            // TODO: specifiy which streams are missing.
            throw new Error("Cannot pipe stream, some streams missing");
        }

        return this;
    }

    areStreamsHooked() {
        return this.upstreams &&
            this.downstreams &&
            this.controlDownstream &&
            this.controlUpstream &&
            this.monitoringDownstream &&
            this.monitoringUpstream &&
            true ||
            false
        ;
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

