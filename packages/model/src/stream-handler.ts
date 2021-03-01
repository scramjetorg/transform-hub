import { MaybePromise, ReadableStream, WritableStream } from "@scramjet/types/src/utils";

import { RunnerMessageCode, MessageType } from ".";
import { EncodedControlMessage, EncodedMonitoringMessage, DownstreamStreamsConfig, UpstreamStreamsConfig } from "@scramjet/types/src/message-streams";
import { ICommunicationHandler } from "@scramjet/types/src/communication-handler";

export type MessageHandler<T extends RunnerMessageCode> = (msg: MessageType<T>) => MaybePromise<MessageType<T>>;

export class CommunicationHandler implements ICommunicationHandler {
    _controlUpstream?: ReadableStream<EncodedControlMessage>;
    _controlDownstream?: WritableStream<EncodedControlMessage>;
    _monitoringUpstream?: WritableStream<EncodedMonitoringMessage>;
    _monitoringDownstream?: ReadableStream<EncodedMonitoringMessage>;

    _upstreams?: UpstreamStreamsConfig;
    _downstreams?: DownstreamStreamsConfig;

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
            this._controlUpstream.pipe(this._controlDownstream);
            this._monitoringDownstream.pipe(this._monitoringUpstream);
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

    addMonitoringHandler<T extends RunnerMessageCode>(_code: T, _handler: MessageHandler<T>): this {
        throw new Error("Method not implemented.");
    }
    addControlHandler<T extends RunnerMessageCode>(_code: T, _handler: MessageHandler<T>): this {
        throw new Error("Method not implemented.");
    }
}