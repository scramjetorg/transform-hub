import { Duplex, PassThrough } from "stream";
import { ContentType } from "./contentType";
import { ReadableState, StreamOrigin, WorkState, WritableState } from "./streamHandler";
import { Topic, TopicEvent, TopicStreamOptions } from "./topic";
import TopicId from "./topicId";
import { TopicState } from "./topicHandler";

class PersistentTopic extends Topic {
    // inReadStream: Duplex
    persistentSequence: Duplex;
    // outWriteStream: Duplex

    constructor(id: TopicId, contentType: ContentType, origin: StreamOrigin, options?: TopicStreamOptions) {
        super(id, contentType, origin, options);

        // this.inReadStream = new PassThrough({ highWaterMark: 0 })
        this.persistentSequence = new PassThrough();
        // this.outWriteStream = new PassThrough({ highWaterMark: 0 })

        // this.inReadStream.pipe(this.persistentSequence).pipe(this.outWriteStream)

        this.persistentSequence.on("readable", () => { this.pushFromOutStream(); });

        this.persistentSequence.on("drain", () => this.updateState());
        this.persistentSequence.on("pause", () => this.updateState());
        this.persistentSequence.on("resume", () => this.updateState());
        this.persistentSequence.on("error", () => this.updateState());
    }
    protected attachEventListeners() {
        this.on("pipe", this.addProvider);
        this.on("unpipe", this.removeProvider);
        this.on(TopicEvent.ProvidersChanged, () => this.updateState());
        this.on(TopicEvent.ConsumersChanged, () => this.updateState());
    }
    state(): TopicState {
        if (this.persistentSequence.errored) return WorkState.Error;
        if (this.persistentSequence.isPaused() || this.providers.size === 0 || this.consumers.size === 0)
            return ReadableState.Pause;
        if (this.persistentSequence.writableNeedDrain) return WritableState.Drain;
        return WorkState.Flowing;
    }

    _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        this.persistentSequence.write(chunk, encoding, callback)
    }
    _read(size: number): void {
        this.pushFromOutStream(size);
    }
    private pushFromOutStream(size?: number) {
        let chunk;

        while ((chunk = this.persistentSequence.read(size)) !== null) {
            if (!this.push(chunk)) break;
        }
    }
}

export default PersistentTopic;

// class Topic extends Duplex implements TopicBase {
//     protected _options: TopicOptions;
//     protected _origin: StreamOrigin;
//     protected _state: TopicState;
//     providers: Providers
//     consumers: Consumers
//     protected inReadStream: PassThrough
//     protected outWriteStream: PassThrough

//     id() { return this._options.name.toString() };
//     options() { return this._options }
//     type() { return StreamType.Topic }
//     state(): TopicState {
//         if (this.errored) return WorkState.Error;
//         if (this.isPaused() || this.providers.size === 0 || this.consumers.size === 0) return ReadableState.Pause;
//         if (this.inReadStream.writableNeedDrain || this.outWriteStream.writableNeedDrain) return WritableState.Drain;
//         return WorkState.Flowing;
//     }
//     origin() { return this._origin }

//     constructor(name: TopicName, contentType: string, origin: StreamOrigin, options?: Options) {
//         super(options);
//         this._origin = origin;
//         this._state = ReadableState.Pause;
//         this._options = { name, contentType }
//         this.providers = new Map();
//         this.consumers = new Map();

//         this.inReadStream = new PassThrough({ ...options, highWaterMark: 0 });
//         this.outWriteStream = new PassThrough({ ...options, highWaterMark: 0 });

//         this.inReadStream.pipe(this.outWriteStream)

//         this.inReadStream
//             .on("error", (err: Error) => this.destroy(err))
//             .on("pause", () => this.pause())
//             .on("resume", () => this.resume())
//             .on("drain", () => this.updateState())

//         this.outWriteStream
//             .on("error", (err: Error) => this.destroy(err))
//             .on("readable", () => this.pushFromOutStream())
//             .on("drain", () => this.updateState())
//             .on("end", () => { this.push(null) })
//             .on("finish", () => { throw new Error(`Unexpected error: topic ${this.id()} finished on outWriteStream`) })

//         this.on("pipe", this.addProvider)
//         this.on("unpipe", this.removeProvider)
//     }

//     updateState() {
//         const currentState = this.state();
//         if (this._state === currentState) return;
//         this._state = currentState;
//         this.emit(TopicEvent.StateChanged, currentState);
//     }

//     pipe<T extends WritableStreamWrapper<Writable>>(destination: T, options?: { end?: boolean; }): T
//     pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T
//     pipe(destination: WritableStreamWrapper<Writable> | NodeJS.WritableStream, options?: { end?: boolean; }): typeof destination {
//         if (destination instanceof WritableStreamWrapper<Writable>)
//             destination = destination.stream();

//         if (!(destination instanceof Writable))
//             throw new Error("Streams not extending Writable are not supported");

//         this.addConsumer(destination);
//         return super.pipe(destination, options);
//     };

//     unpipe(destination?: WritableStreamWrapper<Writable> | NodeJS.WritableStream): this {
//         if (destination) {
//             if (destination instanceof WritableStreamWrapper<Writable>)
//                 destination = destination.stream();
//             if (!(destination instanceof Writable))
//                 throw new Error("Streams not extending Writable are not supported");
//             this.removeConsumer(destination)
//         }
//         else this.removeAllConsumers();

//         return super.unpipe(destination);
//     };

//     _read(size: number): void {
//         this.pushFromOutStream(size);
//     }
//     setEncoding(encoding: BufferEncoding): this {
//         this.inReadStream.setEncoding(encoding);
//         this.outWriteStream.setEncoding(encoding);
//         return this;
//     }

//     _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
//         this.inReadStream.write(chunk, encoding, callback)
//     }
//     setDefaultEncoding(encoding: BufferEncoding): this {
//         this.inReadStream.setDefaultEncoding(encoding);
//         this.outWriteStream.setDefaultEncoding(encoding);
//         return this;
//     }

//     end(cb?: (() => void) | undefined): this;
//     end(chunk: any, cb?: (() => void) | undefined): this;
//     end(chunk: any, encoding?: BufferEncoding | undefined, cb?: (() => void) | undefined): this;
//     end(chunk?: unknown, encoding?: unknown, cb?: unknown): this {
//         throw new Error(`Topics are not supporting end() method`)
//     }

//     cork(): void {
//         this.inReadStream.cork();
//         super.cork();
//     }
//     uncork(): void {
//         this.inReadStream.uncork();
//         super.uncork();
//     }
//     destroy(error?: Error | undefined): this {
//         if (!this.inReadStream.errored)
//             this.inReadStream.destroy(error);
//         super.destroy(error);
//         this.updateState();
//         return this;
//     }

//     pause(): this {
//         if (!this.inReadStream.isPaused())
//             this.inReadStream.pause();
//         super.pause();
//         this.updateState();
//         return this;
//     }
//     resume(): this {
//         if (this.inReadStream.isPaused())
//             this.inReadStream.resume();
//         super.resume();
//         this.updateState();
//         return this;
//     }

//     protected addProvider<T extends NodeJS.ReadableStream>(source: T) {
//         if (!(source instanceof Readable))
//             throw new Error("Streams not extending Readable are not supported");

//         if (!this.addStream(source, this.providers)) return
//         this.emit(TopicEvent.ProvidersChanged);
//     }
//     protected removeProvider<T extends NodeJS.ReadableStream>(source: T) {
//         if (!(source instanceof Readable))
//             throw new Error("Streams not extending Readable are not supported");

//         if (!this.removeStream(source, this.providers)) return;
//         this.emit(TopicEvent.ProvidersChanged);
//     }

//     protected addConsumer<T extends Writable>(destination: T) {
//         if (!this.addStream(destination, this.consumers)) return
//         this.emit(TopicEvent.ConsumersChanged);
//     }
//     protected removeConsumer<T extends Writable>(destination: T) {
//         if (!this.removeStream(destination, this.consumers)) return;
//         this.emit(TopicEvent.ConsumersChanged);
//     }
//     protected removeAllConsumers() { this.consumers.clear(); }

//     private addStream(stream: Writable, destination: Consumers): boolean
//     private addStream(stream: Readable, destination: Providers): boolean
//     private addStream(stream: Writable | Readable, destination: Consumers | Providers) {
//         let streamHandler: StreamHandler;
//         if (stream instanceof Topic) streamHandler = stream;
//         else if (stream instanceof Readable) streamHandler = ReadableStreamWrapper.retrive(stream);
//         else if (stream instanceof Writable) streamHandler = WritableStreamWrapper.retrive(stream);
//         else throw new Error("Unsupported stream type");

//         const streamExist = destination.has(stream);
//         if (streamExist) return false;
//         destination.set(stream, streamHandler);
//         this.updateState();
//         return true;
//     }

//     private removeStream(stream: Writable, destination: Consumers): boolean
//     private removeStream(stream: Readable, destination: Providers): boolean
//     private removeStream(stream: Writable | Readable, destination: Consumers | Providers) {
//         const removed = destination.delete(stream);
//         if (removed) this.updateState();
//         return removed;
//     }

//     private pushFromOutStream(size?: number) {
//         let chunk;
//         while (null !==
//             (chunk = this.outWriteStream.read(size))) {
//             if (!this.push(chunk)) break;
//         }
//     }
// }
