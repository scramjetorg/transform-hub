import { Duplex, DuplexOptions, Readable } from "stream";
import { WorkState, ReadableState, WritableState, StreamType, StreamOrigin } from "./streamHandler";
import TopicId from "./topicId";
import TopicHandler, { TopicOptions, TopicState } from "./topicHandler";
import { ContentType } from "./contentType";

export enum TopicEvent {
    StateChanged = "stateChanged",
}

export type TopicStreamOptions = Pick<DuplexOptions, "encoding">

export class Topic extends Duplex implements TopicHandler {
    protected _id: TopicId;
    protected _options: TopicOptions;
    protected _origin: StreamOrigin;
    protected _state: TopicState;
    protected _errored?: Error;
    protected needDrain: boolean;

    constructor(id: TopicId, contentType: ContentType, origin: StreamOrigin, options?: TopicStreamOptions) {
        super({ ...options, highWaterMark: 0 });

        this._id = id;
        this._origin = origin;
        this._state = ReadableState.Pause;
        this._options = { contentType };
        this.needDrain = false;

        this.attachEventListeners();
    }

    id() { return this._id.toString(); }
    options() { return this._options; }
    type() { return StreamType.Topic; }
    state(): TopicState {
        if (this._errored) return WorkState.Error;
        if (this.isPaused()) return ReadableState.Pause;
        if (this.needDrain) return WritableState.Drain;
        return WorkState.Flowing;
    }
    origin() { return this._origin; }

    _read(_size: number): void { }
    _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        this.needDrain = !this.push(chunk, encoding);
        callback();
    }

    end(cb?: (() => void) | undefined): this;
    end(chunk: any, cb?: (() => void) | undefined): this;
    end(chunk: any, encoding?: BufferEncoding | undefined, cb?: (() => void) | undefined): this;
    end(_chunk?: unknown, _encoding?: unknown, _cb?: unknown): this {
        throw new Error("Topics are not supporting end() method");
    }

    protected attachEventListeners() {
        this.on("pipe", this.addXndjsonException);
        this.on("drain", () => this.updateState());
        this.on("pause", () => this.updateState());
        this.on("resume", () => this.updateState());
        this.on("error", (err: Error) => {
            this._errored = err;
            this.updateState();
        });
    }

    protected updateState() {
        const currentState = this.state();

        if (this._state === currentState) return;
        this._state = currentState;
        this.emit(TopicEvent.StateChanged, currentState);
    }

    protected addXndjsonException(source: Readable) {
        if (this._options.contentType === "application/x-ndjson") {
            const NEWLINE_BYTE = "\n".charCodeAt(0);

            let lastChunk = Buffer.from([]);

            source
                .on("data", (chunk) => { lastChunk = chunk as Buffer; })
                .on("end", () => {
                    const lastByte = lastChunk[lastChunk.length - 1];

                    if (lastByte !== NEWLINE_BYTE) {
                        this.write("\n");
                    }
                });
        }
    }
}

export default Topic;
