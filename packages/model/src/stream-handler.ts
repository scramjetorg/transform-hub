/* eslint-disable new-cap */

import { MaybePromise, ReadableStream, WritableStream } from "@scramjet/types/src/utils";

import { EncodedControlMessage, EncodedMonitoringMessage, DownstreamStreamsConfig,
    UpstreamStreamsConfig, MonitoringMessageCode, ControlMessageCode, EncodedMessage } from "@scramjet/types/src/message-streams";
import { ICommunicationHandler } from "@scramjet/types/src/communication-handler";
import { StringStream } from "scramjet";
import { Readable, Writable } from "stream";

export type MonitoringMessageHandler<T extends MonitoringMessageCode> =
    (msg: EncodedMessage<T>) => MaybePromise<EncodedMessage<T>>;
export type ControlMessageHandler<T extends ControlMessageCode> =
    (msg: EncodedMessage<T>) => MaybePromise<EncodedMessage<T>>;

export class CommunicationHandler implements ICommunicationHandler {
    _controlUpstream?: ReadableStream<EncodedControlMessage>;
    _controlDownstream?: WritableStream<EncodedControlMessage>;
    _monitoringUpstream?: WritableStream<EncodedMonitoringMessage>;
    _monitoringDownstream?: ReadableStream<EncodedMonitoringMessage>;

    _upstreams?: UpstreamStreamsConfig;
    _downstreams?: DownstreamStreamsConfig;

    _monitoringHandlers: MonitoringMessageHandler<MonitoringMessageCode>[] = [];
    _controlHandlers: ControlMessageHandler<ControlMessageCode>[] = [];

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
        if (this._controlDownstream && this._controlUpstream &&
            this._monitoringDownstream && this._monitoringUpstream) {
            StringStream.from(this._monitoringDownstream as Readable)
                .JSONParse()
                .map(async (message: EncodedMonitoringMessage) => {
                    if (this._monitoringHandlers.length) {
                        let currentMessage = message;
                        for (const handler of this._monitoringHandlers) {
                            currentMessage = await handler(currentMessage);
                        }
                    }
                    return message;
                })
                .JSONStringify()
                .pipe(this._monitoringUpstream as unknown as Writable);
            StringStream.from(this._controlUpstream as Readable)
                .JSONParse()
                .map(async (message: EncodedControlMessage) => {
                    if (this._monitoringHandlers.length) {
                        let currentMessage = message;
                        for (const handler of this._controlHandlers) {
                            currentMessage = await handler(currentMessage);
                        }
                    }
                    return message;
                })
                .JSONStringify()
                .pipe(this._controlDownstream as unknown as Writable);
        } else {
            // TODO: specifiy which streams are missing.
            throw new Error("Cannot pipe stream, some stream missing");
        }

        return this;
    }

    pipeStdio(): this {
        throw new Error("Not yet implemented");
    }

    pipeDataStreams(): this {
        throw new Error("Not yet implemented");
    }

    addMonitoringHandler<T extends MonitoringMessageCode>(_code: T, handler: MonitoringMessageHandler<T>): this {
        this._monitoringHandlers.push(handler as unknown as MonitoringMessageHandler<MonitoringMessageCode>);
        return this;
    }
    addControlHandler<T extends ControlMessageCode>(_code: T, handler: ControlMessageHandler<T>): this {
        this._controlHandlers.push(handler as unknown as ControlMessageHandler<ControlMessageCode>);
        return this;
    }
}