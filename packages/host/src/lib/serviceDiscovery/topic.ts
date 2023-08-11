import { TransformOptions, Readable, Transform } from "stream";
import { WorkState, ReadableState, WritableState, StreamType, StreamOrigin } from "./streamHandler";
import TopicId from "./topicId";
import TopicHandler, { TopicOptions, TopicState } from "./topicHandler";
import { ContentType } from "./contentType";

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

    _transform(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        this.needDrain = !this.push(chunk, encoding);
        callback();
        this.updateState();
    }

    end(cb?: (() => void) | undefined): this;
    end(chunk: any, cb?: (() => void) | undefined): this;
    end(chunk: any, encoding?: BufferEncoding | undefined, cb?: (() => void) | undefined): this;
    end(_chunk?: unknown, _encoding?: unknown, _cb?: unknown): this {
        throw new Error("Topics are not supporting end() method");
    }

    resume(): this {
        process.stdout.write("*");

        super.resume();
        this.updateState();
        return this;
    }

    pause(): this {
        process.stdout.write(".");

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
            process.stdout.write("P");

            if (this._options.contentType !== "application/x-ndjson") return;
            // this.addXndjsonException(source);
        });
        this.on("unpipe", () => {
            process.stdout.write("U");
        });
    }

    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T {
        process.stdout.write("p");
        return super.pipe(destination, options);
    }

    unpipe(...args: any[]) {
        process.stdout.write("u");
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

        let lastChunk = Buffer.from([]);

        source
            .on("data", (chunk) => { lastChunk = chunk as Buffer; })
            .pause()
            .on("end", () => {
                const lastByte = lastChunk[lastChunk.length - 1];

                if (lastByte !== NEWLINE_BYTE) {
                    this.write("\n");
                }
            });
    }
}

export default Topic;
