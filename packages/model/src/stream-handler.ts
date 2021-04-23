import {
    ControlMessageCode,
    DownstreamStreamsConfig,
    EncodedControlMessage,
    EncodedMessage,
    EncodedMonitoringMessage,
    ICommunicationHandler,
    LoggerOutput,
    MaybePromise,
    MessageDataType,
    MonitoringMessageCode,
    PassThoughStream,
    UpstreamStreamsConfig,
    WritableStream
} from "@scramjet/types";
import { PassThrough } from "stream";
import { DataStream, StringStream } from "scramjet";
import { Readable, Writable } from "stream";
import { RunnerMessageCode, CommunicationChannel as CC } from ".";

export type MonitoringMessageHandler<T extends MonitoringMessageCode> =
    (msg: EncodedMessage<T>) => MaybePromise<EncodedMessage<T> | null>;
export type ControlMessageHandler<T extends ControlMessageCode> =
    (msg: EncodedMessage<T>) => MaybePromise<EncodedMessage<T> | null>;

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
    upstreams?: UpstreamStreamsConfig;
    downstreams?: DownstreamStreamsConfig;

    private loggerPassthough: PassThoughStream<string>;
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
        this.loggerPassthough = new PassThrough();
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
        if (!this.downstreams) {
            throw new Error("Streams not attached");
        }

        return {
            stdin: this.downstreams[CC.STDIN] as Writable,
            stdout: this.downstreams[CC.STDOUT] as Readable,
            stderr: this.downstreams[CC.STDERR] as Readable
        };
    }

    hookUpstreamStreams(streams: UpstreamStreamsConfig): this {
        this.upstreams = streams;
        return this;
    }

    hookDownstreamStreams(streams: DownstreamStreamsConfig): this {
        this.downstreams = streams;
        return this;
    }

    pipeMessageStreams() {
        if (this._piped)
            throw new Error("pipeMessageStreams called twice");
        this._piped = true;

        if (!this.downstreams || !this.upstreams) {
            throw new Error("Streams not hooked");
        }

        this.downstreams[CC.LOG].pipe(this.upstreams[CC.LOG]);

        const monitoringOutput = StringStream.from(this.downstreams[CC.MONITORING] as Readable)
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

        monitoringOutput.pipe(this.upstreams[CC.MONITORING]);

        StringStream.from(this.upstreams[CC.CONTROL] as Readable)
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
            .pipe(this.downstreams[CC.CONTROL]);

        return this;
    }

    areStreamsHooked() {
        return typeof this.upstreams !== "undefined" && typeof this.downstreams !== "undefined";
    }

    getLogOutput(): LoggerOutput {
        return { out: this.loggerPassthough, err: this.loggerPassthough };
    }

    pipeStdio(): this {
        if (!this.downstreams || !this.upstreams) {
            throw new Error("Streams not hooked");
        }

        this.upstreams[CC.STDIN].pipe(this.downstreams[CC.STDIN]);
        this.downstreams[CC.STDOUT].pipe(this.upstreams[CC.STDOUT]);
        this.downstreams[CC.STDERR].pipe(this.upstreams[CC.STDERR]);

        return this;
    }

    pipeDataStreams(): this {
        if (!this.downstreams || !this.upstreams) {
            throw new Error("Streams not hooked");
        }

        /**
         * @analyze-how-to-pass-in-out-streams
         * Pipe upstream input stream to a Sequence to downstream input stream.
         * Pipe downstream output stream from a Sequence to upstream output stream.
         */
        this.upstreams[CC.IN].pipe(this.downstreams[CC.IN]);
        this.downstreams[CC.OUT].pipe(this.upstreams[CC.OUT]);

        if (this.upstreams[CC.PACKAGE] && this.downstreams[CC.PACKAGE] !== undefined) {
            this.upstreams[CC.PACKAGE]?.pipe(this.downstreams[CC.PACKAGE] as WritableStream<any>);
        }

        return this;
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

