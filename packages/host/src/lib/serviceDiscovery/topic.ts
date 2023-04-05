import { Duplex, DuplexOptions, Readable, Writable } from "stream";
import { WorkState, StreamHandler, ReadableState, WritableState, StreamType, StreamOrigin } from "./streamHandler";
import TopicName from "./topicName";
import WritableStreamWrapper from "../streamWrapper/writableStreamWrapper";
import ReadableStreamWrapper from "../streamWrapper/readableStreamWrapper";
import TopicHandler, { Consumers, Providers, TopicOptions, TopicState } from "./topicHandler";
import { ContentType } from "./contentType";

export enum TopicEvent {
    StateChanged = "stateChanged",
    ProvidersChanged = "providersChanged",
    ConsumersChanged = "consumersChanged"
}

export type TopicStreamOptions = Pick<DuplexOptions, "encoding">

export class Topic extends Duplex implements TopicHandler {
    protected _id: TopicName
    protected _options: TopicOptions;
    protected _origin: StreamOrigin;
    protected _state: TopicState;
    providers: Providers
    consumers: Consumers

    constructor(id: TopicName, contentType: ContentType, origin: StreamOrigin, options?: TopicStreamOptions) {
        super({ ...options, highWaterMark: 0 });

        this._id = id;
        this._origin = origin;
        this._state = ReadableState.Pause;
        this._options = { contentType }
        this.providers = new Map();
        this.consumers = new Map();

        this.attachEventListeners();
    }

    id() { return this._id.toString() };
    options() { return this._options }
    type() { return StreamType.Topic }
    state(): TopicState {
        if (this.errored) return WorkState.Error;
        if (this.isPaused() || this.providers.size === 0 || this.consumers.size === 0) return ReadableState.Pause;
        if (this.writableNeedDrain) return WritableState.Drain;
        return WorkState.Flowing;
    }
    origin() { return this._origin }

    _read(size: number): void { }
    _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        this.push(chunk, encoding);
        callback();
    }

    pipe<T extends WritableStreamWrapper<Writable>>(destination: T, options?: { end?: boolean; }): T
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T
    pipe(destination: WritableStreamWrapper<Writable> | NodeJS.WritableStream, options?: { end?: boolean; }): typeof destination {
        if (destination instanceof WritableStreamWrapper<Writable>)
            destination = destination.stream();
        if (!(destination instanceof Writable))
            throw new Error("Streams not extending Writable are not supported");

        this.addConsumer(destination);
        return super.pipe(destination, options);
    };

    unpipe(destination?: WritableStreamWrapper<Writable> | NodeJS.WritableStream): this {
        if (destination) {
            if (destination instanceof WritableStreamWrapper<Writable>)
                destination = destination.stream();
            if (!(destination instanceof Writable))
                throw new Error("Streams not extending Writable are not supported");
            this.removeConsumer(destination)
        }
        else this.removeAllConsumers();

        return super.unpipe(destination);
    };

    end(cb?: (() => void) | undefined): this;
    end(chunk: any, cb?: (() => void) | undefined): this;
    end(chunk: any, encoding?: BufferEncoding | undefined, cb?: (() => void) | undefined): this;
    end(chunk?: unknown, encoding?: unknown, cb?: unknown): this {
        throw new Error(`Topics are not supporting end() method`)
    }

    protected attachEventListeners() {
        this.on("pipe", this.addProvider)
        this.on("unpipe", this.removeProvider)
        this.on("drain", () => this.updateState())
        this.on("pause", () => this.updateState())
        this.on("resume", () => this.updateState())
        this.on("error", () => this.updateState())
        this.on(TopicEvent.ProvidersChanged, () => this.updateState())
        this.on(TopicEvent.ConsumersChanged, () => this.updateState())


    }

    protected updateState() {
        const currentState = this.state();
        if (this._state === currentState) return;
        this._state = currentState;
        this.emit(TopicEvent.StateChanged, currentState);
    }
    protected emitProvidersChange() { this.emit(TopicEvent.ProvidersChanged); }
    protected emitConsumersChange() { this.emit(TopicEvent.ConsumersChanged); }

    protected addProvider<T extends NodeJS.ReadableStream>(source: T) {
        if (!(source instanceof Readable))
            throw new Error("Streams not extending Readable are not supported");

        this.addXndjsonException(source);

        if (!this.addStream(source, this.providers)) return;
        this.emitProvidersChange()
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

    protected removeProvider<T extends NodeJS.ReadableStream>(source: T) {
        if (!(source instanceof Readable))
            throw new Error("Streams not extending Readable are not supported");

        if (!this.removeStream(source, this.providers)) return;
        this.emitProvidersChange()
    }

    protected addConsumer<T extends Writable>(destination: T) {
        if (!this.addStream(destination, this.consumers)) return;
        this.emitConsumersChange()
    }
    protected removeConsumer<T extends Writable>(destination: T) {
        if (!this.removeStream(destination, this.consumers)) return;
        this.emitConsumersChange()
    }
    protected removeAllConsumers() { this.consumers.clear(); }

    private addStream(stream: Writable, destination: Consumers): boolean
    private addStream(stream: Readable, destination: Providers): boolean
    private addStream(stream: Writable | Readable, destination: Consumers | Providers) {
        let streamHandler: StreamHandler;
        if (stream instanceof Topic) streamHandler = stream;
        else if (stream instanceof Readable) streamHandler = ReadableStreamWrapper.retrive(stream);
        else if (stream instanceof Writable) streamHandler = WritableStreamWrapper.retrive(stream);
        else throw new Error("Unsupported stream type");

        const streamExist = destination.has(stream);
        if (streamExist) return false;
        destination.set(stream, streamHandler);
        this.updateState();
        return true;
    }

    private removeStream(stream: Writable, destination: Consumers): boolean
    private removeStream(stream: Readable, destination: Providers): boolean
    private removeStream(stream: Writable | Readable, destination: Consumers | Providers) {
        const removed = destination.delete(stream);
        if (removed) this.updateState();
        return removed;
    }
}

export default Topic;