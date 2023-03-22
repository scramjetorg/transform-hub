import { Duplex, DuplexOptions, PassThrough, Readable, Stream, Writable } from "stream";
import { WorkState, StreamHandler, StreamType, TopicOptions, ReadableState } from "./StreamHandler";
import StreamWrapper from "./StreamWrapper";
import TopicName from "./topicName";

export enum TopicEvent {
    StateChanged = "stateChanged",
    ProvidersChanged = "providersChanged",
    ConsumersChanged = "consumersChanged"
}

type Providers = Map<Stream, StreamHandler>
type Consumers = Map<Stream, StreamHandler>
type Options = Pick<DuplexOptions, "encoding">

export type TopicState = WorkState.Initialized | WorkState.Waiting | WorkState.Flowing | WorkState.Error | ReadableState.Paused;

class Topic extends Duplex implements StreamHandler {
    protected _options: TopicOptions;
    protected _state: TopicState = WorkState.Initialized;
    providers: Providers
    consumers: Consumers
    protected inReadStream: PassThrough
    protected outWriteStream: PassThrough
    error?: Error

    name() { return this._options.name.toString() };
    options() { return this._options }
    type() { return StreamType.Topic }
    state() { return this._state }

    constructor(name: TopicName, contentType: string, options?: Options) {
        super(options);
        this._options = { name, contentType }
        this.providers = new Map();
        this.consumers = new Map();

        this.inReadStream = new PassThrough({ ...options, highWaterMark: 0 });
        this.outWriteStream = new PassThrough({ ...options, highWaterMark: 0 });
        this.setState(WorkState.Initialized);

        this.inReadStream.pipe(this.outWriteStream)

        this.inReadStream
            .on("error", (err: Error) => { this.setError(err); })
            .on("pause", () => { this.updateState() })
            .on("resume", () => { this.updateState() })

        this.outWriteStream
            .on("error", (err: Error) => { this.setError(err); })
            .on("readable", () => this.pushFromOutStream())
            .on("finish", () => {
                throw new Error(`Unexpected error: topic ${this.name()} finished on outWriteStream`)
            })

        this.on("pipe", this.addProvider)
        this.on("unpipe", this.removeProvider)
    }

    setState(state: TopicState) {
        if (this._state === state) return;
        this._state = state;
        this.emit(TopicEvent.StateChanged, state);
    }

    updateState() {
        if (this._state === WorkState.Error) return;
        else if (this.inReadStream.isPaused())
            this.setState(ReadableState.Paused)
        else if (this.providers.size === 0 || this.consumers.size === 0)
            this.setState(WorkState.Waiting)
        else
            this.setState(WorkState.Flowing)
    }

    pipe<T extends StreamWrapper<Writable>>(destination: T, options?: { end?: boolean; }): T
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T
    pipe(destination: StreamWrapper<Writable> | NodeJS.WritableStream, options?: { end?: boolean; }): typeof destination {
        if (destination instanceof StreamWrapper<Writable>)
            destination = destination.stream();

        if (!(destination instanceof Writable))
            throw new Error("Streams not extending Writable are not supported");

        this.addConsumer(destination);
        return super.pipe(destination, options);
    };

    unpipe(destination?: StreamWrapper<Writable> | NodeJS.WritableStream): this {
        if (destination) {
            if (destination instanceof StreamWrapper<Writable>)
                destination = destination.stream();
            if (!(destination instanceof Writable))
                throw new Error("Streams not extending Writable are not supported");
            this.removeConsumer(destination)
        }
        else this.removeAllConsumers();

        return super.unpipe(destination);
    };

    _read(size: number): void {
        this.pushFromOutStream(size);
    }
    setEncoding(encoding: BufferEncoding): this {
        this.inReadStream.setEncoding(encoding);
        this.outWriteStream.setEncoding(encoding);
        return this;
    }

    _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        this.inReadStream.write(chunk, encoding, callback)
    }
    setDefaultEncoding(encoding: BufferEncoding): this {
        this.inReadStream.setDefaultEncoding(encoding);
        this.outWriteStream.setDefaultEncoding(encoding);
        return this;
    }
    end(cb?: (() => void) | undefined): void;
    end(chunk: any, cb?: (() => void) | undefined): void;
    end(chunk: any, encoding?: BufferEncoding | undefined, cb?: (() => void) | undefined): void;
    end(chunk?: unknown, encoding?: unknown, cb?: unknown): void {
        throw new Error(`Topics are not supporting end() method`)
    }

    cork(): void {
        this.inReadStream.cork();
        super.cork();
    }
    uncork(): void {
        this.inReadStream.uncork();
        super.uncork();
    }
    destroy(error?: Error | undefined): void { throw new Error(`Topics are not supporting destroy() method`); }


    pause(): this {
        this.inReadStream.pause();
        super.pause();
        return this;
    }
    resume(): this {
        this.inReadStream.resume();
        super.resume();
        return this;
    }

    protected setError(error: Error) {
        this.error = error;
        this.emit("error", error);
        this.setState(WorkState.Error);
    }

    protected addProvider<T extends NodeJS.ReadableStream>(source: T) {
        if (!(source instanceof Readable))
            throw new Error("Streams not extending Readable are not supported");

        if (!this.addStream(source, this.providers)) return
        this.updateState();
        this.emit(TopicEvent.ProvidersChanged);
    }
    protected removeProvider<T extends NodeJS.ReadableStream>(source: T) {
        if (!(source instanceof Readable))
            throw new Error("Streams not extending Readable are not supported");

        if (!this.removeStream(source, this.providers)) return;
        this.updateState()
        this.emit(TopicEvent.ProvidersChanged);
    }

    protected addConsumer<T extends Writable>(destination: T) {
        if (!this.addStream(destination, this.consumers)) return
        this.updateState();
        this.emit(TopicEvent.ConsumersChanged);
    }
    protected removeConsumer<T extends Writable>(destination: T) {
        if (!this.removeStream(destination, this.consumers)) return;
        this.updateState()
        this.emit(TopicEvent.ConsumersChanged);
    }
    protected removeAllConsumers() { this.consumers.clear(); }

    private addStream(stream: Writable, destination: Consumers): boolean
    private addStream(stream: Readable, destination: Providers): boolean
    private addStream(stream: Writable | Readable, destination: any) {
        let streamHandler: StreamHandler;
        if (stream instanceof Topic) streamHandler = stream;
        else streamHandler = StreamWrapper.retrive(stream);

        const streamExist = destination.has(stream);
        if (streamExist) return false;
        destination.set(stream, streamHandler);
        return true;
    }

    private removeStream(stream: Writable, destination: Consumers): boolean
    private removeStream(stream: Readable, destination: Providers): boolean
    private removeStream(stream: Writable | Readable, destination: Consumers | Providers) {
        return destination.delete(stream)
    }

    private pushFromOutStream(size?: number) {
        let chunk;
        while (null !==
            (chunk = this.outWriteStream.read(size))) {
            if (!this.push(chunk)) break;
        }
    }
}

export default Topic;