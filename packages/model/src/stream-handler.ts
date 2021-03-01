/* eslint-disable new-cap */

import { MaybePromise, ReadableStream, WritableStream } from "@scramjet/types/src/utils";

import { EncodedControlMessage, EncodedMonitoringMessage, DownstreamStreamsConfig,
    UpstreamStreamsConfig, MonitoringMessageCode, ControlMessageCode, EncodedMessage } from "@scramjet/types/src/message-streams";
import { ICommunicationHandler } from "@scramjet/types/src/communication-handler";
import { StringStream } from "scramjet";
import { Readable, Writable } from "stream";
import { RunnerMessageCode } from "./runner-message";

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
};
type ControlMessageHandlerList = {
    [RunnerMessageCode.FORCE_CONFIRM_ALIVE]: ControlMessageHandler<RunnerMessageCode.FORCE_CONFIRM_ALIVE>[];
    [RunnerMessageCode.KILL]: ControlMessageHandler<RunnerMessageCode.KILL>[];
    [RunnerMessageCode.MONITORING_RATE]: ControlMessageHandler<RunnerMessageCode.MONITORING_RATE>[];
    [RunnerMessageCode.STOP]: ControlMessageHandler<RunnerMessageCode.STOP>[];

};

export class CommunicationHandler implements ICommunicationHandler {
    _controlUpstream?: ReadableStream<EncodedControlMessage>;
    _controlDownstream?: WritableStream<EncodedControlMessage>;
    _monitoringUpstream?: WritableStream<EncodedMonitoringMessage>;
    _monitoringDownstream?: ReadableStream<EncodedMonitoringMessage>;

    _upstreams?: UpstreamStreamsConfig;
    _downstreams?: DownstreamStreamsConfig;

    _monitoringHandlers: MonitoringMessageHandler<MonitoringMessageCode>[] = [];
    _controlHandlers: ControlMessageHandler<ControlMessageCode>[] = [];

    _monitoringHandlerHash: MonitoringMessageHandlerList;
    _controlHandlerHash: ControlMessageHandlerList;

    constructor() {
        this._controlHandlerHash = {
            [RunnerMessageCode.FORCE_CONFIRM_ALIVE]: [],
            [RunnerMessageCode.KILL]: [],
            [RunnerMessageCode.MONITORING_RATE]: [],
            [RunnerMessageCode.STOP]: []
        };
        this._monitoringHandlerHash = {
            [RunnerMessageCode.ACKNOWLEDGE]: [],
            [RunnerMessageCode.DESCRIBE_SEQUENCE]: [],
            [RunnerMessageCode.ALIVE]: [],
            [RunnerMessageCode.ERROR]: [],
            [RunnerMessageCode.MONITORING]: []
        };
    }

    hookClientStreams(streams: UpstreamStreamsConfig): this {
        this._controlUpstream = streams[3];
        this._monitoringUpstream = streams[4];
        this._upstreams = streams;

        return this;
    }
    hookLifecycleStreams(streams: DownstreamStreamsConfig): this {
        this._controlDownstream = streams[3];
        this._monitoringDownstream = streams[4];
        this._downstreams = streams;

        return this;
    }

    pipeMessageStreams() {
        if (this.areStreamsHooked()) {

            StringStream.from(this._monitoringDownstream as Readable)
                .JSONParse()
                .map(async (message: EncodedMonitoringMessage) => {
                    if (this._monitoringHandlerHash[message[0]].length) {
                        let currentMessage = message as any;
                        for (const handler of this._monitoringHandlerHash[message[0]]) {
                            currentMessage = await handler(currentMessage);
                        }
                        return currentMessage as EncodedMonitoringMessage;
                    }
                    return message;
                })
                .JSONStringify()
                .pipe(this._monitoringUpstream as unknown as Writable);

            StringStream.from(this._controlUpstream as Readable)
                .JSONParse()
                .map(async (message: EncodedControlMessage) => {
                    if (this._controlHandlerHash[message[0]].length) {
                        let currentMessage = message as any;
                        for (const handler of this._controlHandlerHash[message[0]]) {
                            currentMessage = await handler(currentMessage);
                        }
                        return currentMessage as EncodedMonitoringMessage;
                    }
                    return message;
                })
                .JSONStringify()
                .pipe(this._controlDownstream as unknown as Writable);

        } else {
            // TODO: specifiy which streams are missing.
            throw new Error("Cannot pipe stream, some streams missing");
        }

        return this;
    }

    private areStreamsHooked() {
        return this._controlDownstream &&
            this._controlUpstream &&
            this._monitoringDownstream &&
            this._monitoringUpstream
        ;
    }

    pipeStdio(): this {
        throw new Error("Not yet implemented");
    }

    pipeDataStreams(): this {
        throw new Error("Not yet implemented");
    }

    addMonitoringHandler<T extends MonitoringMessageCode>(_code: T, handler: MonitoringMessageHandler<T>): this {
        this._monitoringHandlerHash[_code].push(handler as any);
        return this;
    }
    addControlHandler<T extends ControlMessageCode>(_code: T, handler: ControlMessageHandler<T>): this {
        this._controlHandlerHash[_code].push(handler as any);
        return this;
    }
}