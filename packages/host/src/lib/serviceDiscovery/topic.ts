import { TransformOptions, Readable, Transform } from "stream";
import { ParsedMessage } from "@scramjet/api-types";
import { ContentType, StreamOrigin, TopicHandler, TopicOptions, TopicState } from "../types/from-types";
import TopicId from "./topicId";
import { ReadableState, StreamType, WorkState, WritableState } from "@scramjet/symbols";
import { TOPIC_DELETED, topicError } from "./topic-errors";

export enum TopicEvent {
    StateChanged = "stateChanged"
}

export type TopicStreamOptions = Pick<TransformOptions, "encoding">;

type PendingIngress = {
    chunk: unknown;
    encoding: BufferEncoding;
    callback: (error?: Error | null) => void;
    source: Readable;
    onError: (error: Error) => void;
    onAborted: () => void;
    onClose: () => void;
};

type ActiveIngress = {
    source: Readable;
    firstChunkSeen: boolean;
};

export class Topic extends Transform implements TopicHandler {
    protected _id: TopicId;
    protected _options: TopicOptions;
    protected _origin: StreamOrigin;
    protected _state: TopicState;
    protected _errored?: Error;
    protected needDrain: boolean;

    private _pipeQueue: Readable[] = [];
    private _consuming: Promise<any> | undefined;
    private _pendingTransform?: (error?: Error | null) => void;
    private _pendingIngress?: PendingIngress;
    private _activeIngress?: ActiveIngress;
    private _pipeTargets = new Set<NodeJS.WritableStream>();

    constructor(id: TopicId, contentType: ContentType, origin: StreamOrigin, options?: TopicStreamOptions) {
        super({ ...options, highWaterMark: 65536, writableHighWaterMark: 0, readableHighWaterMark: 65536 });

        this._id = id;
        this._origin = origin;
        this._state = ReadableState.Pause;
        this._options = { contentType };
        this.needDrain = false;

        this.attachEventListeners();
        // Deletion/disconnect errors are also delivered to active stream
        // consumers. Keep a local listener so deleting an unused topic cannot
        // become an uncaught process-level exception.
        this.on("error", () => undefined);
    }

    get contentType() {
        return this._options.contentType;
    }

    get topicIdent() {
        return `${this._id.toString()}.${this.contentType}`;
    }

    id() {
        return this._id.toString();
    }
    options() {
        return this._options;
    }
    type() {
        return StreamType.Topic;
    }
    state(): TopicState {
        if (this._errored) return WorkState.Error;
        if (this.isPaused()) return ReadableState.Pause;
        if (this.needDrain) return WritableState.Drain;
        return WorkState.Flowing;
    }
    origin() {
        return this._origin;
    }

    acceptPipe(rdble: Readable) {
        this._pipeQueue.push(rdble);
        this.consumePipe();
    }

    consumePipe() {
        if (this._consuming) return;

        this._consuming = (async () => {
            while (this._pipeQueue.length) {
                const pipe = this._pipeQueue.shift()!;

                this._activeIngress = { source: pipe, firstChunkSeen: false };

                if ((pipe as ParsedMessage).writeContinue) {
                    (pipe as ParsedMessage).writeContinue();
                }

                pipe.pipe(this, { end: false });

                await new Promise<void>((res) => {
                    pipe.once("close", res).once("end", res).once("error", res);
                });

                pipe.unpipe();
                if (this._activeIngress?.source === pipe && !this._pendingIngress) {
                    this._activeIngress = undefined;
                }
            }

            this._consuming = undefined;
        })().catch(() => 0);
    }

    _transform(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        const ingress = this._activeIngress;
        const isFirstIngressChunk = ingress !== undefined && !ingress.firstChunkSeen;
        if (isFirstIngressChunk) ingress.firstChunkSeen = true;

        // Topics remain live routes: ordinary writes without a subscriber are
        // discarded. The one exception is the first chunk of an active ingress.
        // Manager discovery attaches that pipe asynchronously, so hold exactly
        // one chunk under backpressure until the route is attached.
        if (!this.hasConsumer()) {
            if (isFirstIngressChunk) {
                this.holdFirstIngressChunk(chunk, encoding, callback, ingress.source);
                return;
            }
            this.needDrain = false;
            callback();
            return;
        }

        this.needDrain = !this.push(chunk, encoding);
        if (this.needDrain) {
            this._pendingTransform = callback;
            return;
        }
        callback();
        this.updateState();
    }

    _read(size: number): void {
        super._read(size);
        if (this._pendingTransform) {
            this.needDrain = false;
            const callback = this._pendingTransform;
            this._pendingTransform = undefined;
            callback();
            this.updateState();
        }
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

    destroy(error?: Error | undefined): this {
        this.failPendingIngress(error ?? new Error(`Topic ${this.id()} destroyed before ingress attachment`));
        this._errored = error;
        super.destroy(error);
        this.updateState();

        return this;
    }

    delete(): this {
        return this.destroy(topicError(TOPIC_DELETED, `Topic ${this.id()} was deleted`));
    }

    protected attachEventListeners() {
        this.on("pipe", (_source: Readable) => {
            if (this._options.contentType !== "application/x-ndjson") return;
            this.addXndjsonException(_source);
        });
    }

    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T {
        this._pipeTargets.add(destination);
        const result = super.pipe(destination, options);
        this.flushPendingIngress();
        return result;
    }

    unpipe(...args: any[]) {
        if (args.length === 0) this._pipeTargets.clear();
        else this._pipeTargets.delete(args[0] as NodeJS.WritableStream);
        return super.unpipe(...args);
    }

    private hasConsumer(): boolean {
        return this._pipeTargets.size > 0 || this.listenerCount("data") > 0 || this.listenerCount("readable") > 0;
    }

    private holdFirstIngressChunk(
        chunk: unknown,
        encoding: BufferEncoding,
        callback: (error?: Error | null) => void,
        source: Readable
    ): void {
        const fail = (error: Error) => this.failPendingIngress(error);
        const onAborted = () => fail(new Error(`Topic ${this.id()} ingress cancelled before route attachment`));
        const onClose = () => {
            if (!source.readableEnded) onAborted();
        };

        this._pendingIngress = { chunk, encoding, callback, source, onError: fail, onAborted, onClose };
        source.once("error", fail);
        source.once("aborted", onAborted);
        source.once("close", onClose);
        this.needDrain = true;
        this.updateState();
    }

    private flushPendingIngress(): void {
        const pending = this._pendingIngress;
        if (!pending || !this.hasConsumer()) return;

        this.clearPendingIngress();
        this.needDrain = !this.push(pending.chunk, pending.encoding);
        if (this.needDrain) {
            this._pendingTransform = pending.callback;
            return;
        }
        pending.callback();
        this.updateState();
    }

    private failPendingIngress(error: Error): void {
        const pending = this._pendingIngress;
        if (!pending) return;

        this.clearPendingIngress();
        this.needDrain = false;
        pending.callback(error);
        this.updateState();
    }

    private clearPendingIngress(): void {
        const pending = this._pendingIngress;
        if (!pending) return;

        pending.source.removeListener("error", pending.onError);
        pending.source.removeListener("aborted", pending.onAborted);
        pending.source.removeListener("close", pending.onClose);
        this._pendingIngress = undefined;
        if (this._activeIngress?.source === pending.source && pending.source.readableEnded) {
            this._activeIngress = undefined;
        }
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
            .on("data", (chunk) => {
                lastChunk = chunk as Buffer;
            })
            .on("end", () => {
                const lastByte = lastChunk[lastChunk.length - 1];

                if (lastByte !== NEWLINE_BYTE) {
                    this.write("\n");
                }
            });
    }
}

export default Topic;
