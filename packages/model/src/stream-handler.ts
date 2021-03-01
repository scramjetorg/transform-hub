import { MaybePromise, ReadableStream, WritableStream } from "@scramjet/types/src/utils";
import { Stream } from "stream";
import {
    RunnerMessageCode, MessageType,
    MonitoringMessageCode, ControlMessageCode,
    EncodedControlMessage, EncodedMonitoringMessage
} from ".";

type MessageHandler<T extends RunnerMessageCode> = (msg: MessageType<T>) => MaybePromise<MessageType<T>>;

export interface ICommunicationHandler {
    hookClientStreams(str: Stream[]): this;
    hookLifecycleStreams(str: Stream[]): this;

    addMonitoringHandler<T extends MonitoringMessageCode>(code: T, handler: MessageHandler<T>): this;
    addControlHandler<T extends ControlMessageCode>(code: T, handler: MessageHandler<T>): this;
}

export class CommunicationHandler implements ICommunicationHandler {
    _controlDownstream?: ReadableStream<EncodedControlMessage>;
    _controlUpstream?: WritableStream<EncodedControlMessage>;
    _monitoringUpstream?: ReadableStream<EncodedMonitoringMessage>;
    _monitoringDownstream?: WritableStream<EncodedMonitoringMessage>;

    hookClientStreams(_str: Stream[]): this {
        throw new Error("Method not implemented.");
    }
    hookLifecycleStreams(_str: Stream[]): this {
        this._monitoringDownstream = _str[3] as unknown as WritableStream<EncodedMonitoringMessage>;
        this._controlDownstream = _str[4] as unknown as ReadableStream<EncodedMonitoringMessage>;
        throw new Error("Method not implemented.");
    }

    pipeStream() {
        if (this._controlDownstream && this._controlUpstream &&
            this._monitoringDownstream && this._monitoringUpstream) {
            this._controlDownstream.pipe(this._controlUpstream);
            this._monitoringUpstream.pipe(this._monitoringDownstream);
        } else {
            // TODO: specifiy which streams are missing.
            throw new Error("Cannot pipe stream, some stream missing");
        }
    }

    addMonitoringHandler<T extends RunnerMessageCode>(_code: T, _handler: MessageHandler<T>): this {
        throw new Error("Method not implemented.");
    }
    addControlHandler<T extends RunnerMessageCode>(_code: T, _handler: MessageHandler<T>): this {
        throw new Error("Method not implemented.");
    }
}