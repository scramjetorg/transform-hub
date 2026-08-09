import { Readable, Writable } from "stream";

/**
 * This is a polyfill to TypeScripts rather poor expression of `function*`
 */
export type Gen<W, R, C extends any[] = any[]> = (...config: C) => Generator<R | undefined, void, W | undefined>;

/**
 * This is a polyfill to TypeScripts rather poor expression of `async function*`
 */
export type AsyncGen<W, R, C extends any[] = any[]> = (...config: C) => AsyncGenerator<R, void, W>;

/**
 * This is a simple utility type for an argument for `Promise.resolve`
 */
export type MaybePromise<T> = Promise<T> | T;

/**
 * This is a simple utility type for a function that can be passed to `Promise.then`
 */
export type FReturns<T, Z extends any[] = any[]> = MaybePromise<T> | ((...args: Z) => MaybePromise<T>);

/**
 * Represents any pipeable type (a stream) that outputs the generic <Produces>.
 */
export interface PipeableStream<Produces> extends Readable {
    read(count?: number): Produces[] | null;
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T;
    pipe<T extends WritableStream<Produces>>(destination: T, options?: { end?: boolean }): T;
}

/**
 * A readable stream representation with generic chunks.
 */
export interface ReadableStream<Produces> extends PipeableStream<Produces> {
    [Symbol.asyncIterator](): AsyncIterableIterator<Produces>;
    destroy(): this;
}

/**
 * Writable stream representation with generic chunks.
 */
export interface WritableStream<Consumes> extends Writable {
    objectMode?: true;
    writable: boolean;
    destroy(): this;
    write(item: Consumes, cb?: (err?: Error | null) => void): boolean;
    write(str: never, encoding: never, cb?: (err?: Error | null) => void): boolean;
    end(cb?: () => void): this;
    end(data: Consumes, cb?: () => void): this;
    end(str: never, encoding: never, cb?: () => void): this;
}

export type DuplexStream<Consumes, Produces> = WritableStream<Consumes> & ReadableStream<Produces> & {
    allowHalfOpen: boolean;
};

export type PassThoughStream<Passes> = DuplexStream<Passes, Passes>;

/**
 * Delayed stream - stream with lazy initialization
 */
export type SynchronousStreamablePayload<Produces> =
    | PipeableStream<Produces>
    | AsyncGen<Produces, Produces>
    | Gen<Produces, void>
    | Iterable<Produces>
    | AsyncIterable<Produces>;

export type HasTopicInformation = {
    contentType?: string;
    topic?: string;
};

export type SynchronousStreamable<Produces> = SynchronousStreamablePayload<Produces> & HasTopicInformation;

/**
 * Represents all readable stream types that will be accepted as return values
 * from TFunction.
 */
export type Streamable<Produces> = MaybePromise<SynchronousStreamable<Produces>>;

/**
 * Helper: A maybe function that returns maybe a promise of a streamable.
 */
export type StreambleMaybeFunction<Produces> = FReturns<Streamable<Produces>>;

export type DeepPartial<T> = {
    [K in keyof T]?: DeepPartial<T[K]>;
};

export type IdString = string;
export type UrlPath = string;
export type Port = number;
export type ApiVersion = string;

export type Validator = (message: string) => (value: any, object: Record<string, any>) => string | boolean;
export type ValidationSchema = { [key: string]: ((value: any, obj: Record<string, any>) => string | boolean)[] };
export type ValidationResult = { name: string; isValid: boolean; message?: string };
