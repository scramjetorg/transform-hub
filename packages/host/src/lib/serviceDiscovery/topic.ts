import { TransformOptions, Readable, Transform } from "stream";
import { ContentType, WorkState, ReadableState, WritableState, StreamType, StreamOrigin, TopicHandler, TopicOptions, TopicState, TopicStreamReqWithContinue } from "@scramjet/types";
import TopicId from "./topicId";

export enum TopicEvent {
    StateChanged = "stateChanged",
}

export type TopicStreamOptions = Pick<TransformOptions, "encoding">

export class Topic extends Transform implements TopicHandler {
    protected _id: TopicId;
    protected _options: TopicOptions;
    protected _origin: StreamOrigin;
    protected _state: TopicState;
    protected _errored?: Error;
    protected needDrain: boolean;

    private _pipeQueue: (Readable | TopicStreamReqWithContinue)[] = [];
    private _consuming: Promise<any> | undefined;

    constructor(id: TopicId, contentType: ContentType, origin: StreamOrigin, options?: TopicStreamOptions) {
        super({ ...options, highWaterMark: 65536, writableHighWaterMark: 0, readableHighWaterMark: 65536 });

        this._id = id;
        this._origin = origin;
        this._state = ReadableState.Pause;
        this._options = { contentType };
        this.needDrain = false;

        this.attachEventListeners();
    }

    get contentType() {
        return this._options.contentType;
    }

    get topicIdent() {
        return `${this._id.toString()}.${this.contentType}`;
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

    acceptPipe(rdble: Readable | TopicStreamReqWithContinue) {
        this._pipeQueue.push(rdble);
        this.consumePipe();
    }

    consumePipe() {
        if (this._consuming) return;

        this._consuming = (async () => {
            while (this._pipeQueue.length) {
                const pipe = this._pipeQueue.shift()!;

                if ((pipe as TopicStreamReqWithContinue).writeContinue) {
                    (pipe as TopicStreamReqWithContinue).writeContinue();
                }

                pipe.pipe(this, { end: false });

                await new Promise<void>(res => {
                    pipe
                        .once("close", res)
                        .once("end", res)
                        .once("error", res);
                });

                pipe.unpipe();
            }

            this._consuming = undefined;
        })()
            .catch(() => 0);
    }

    _transform(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        this.needDrain = !this.push(chunk, encoding);
        callback();
        this.updateState();
    }

    end(cb?: (() => void) | undefined): this;
    end(chunk: any, cb?: (() => void) | undefined): this;
    end(chunk: any, encoding?: BufferEncoding | undefined, cb?: (() => void) | undefined): this;
    end(_chunk?: unknown, _encoding?: unknown, _cb?: unknown): this {
        throw new Error("Topics do not support end()");
    }

    resume(): this {
        super.resume();
        this.updateState();
        return this;
    }

    pause(): this {
        super.pause();
        this.updateState();
        return this;
    }

    destroy(error?: Error | undefined): void {
        this._errored = error;
        super.destroy(error);
        this.updateState();
    }

    protected attachEventListeners() {
        this.on("pipe", (_source: Readable) => {
            if (this._options.contentType !== "application/x-ndjson") return;
            this.addXndjsonException(_source);
        });
    }

    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T {
        return super.pipe(destination, options);
    }

    unpipe(...args: any[]) {
        return super.unpipe(...args);
    }

    protected updateState() {
        const currentState = this.state();

        if (this._state === currentState) return;
        this._state = currentState;
        this.emit(TopicEvent.StateChanged, currentState);
    }

    protected addXndjsonException(source: Readable) {
        const NEWLINE_BYTE = "\n".charCodeAt(0);

        let lastChunk = Buffer.from("");

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

export default Topic;
