import { Readable, Writable } from "stream";

/**
 * This is a polyfill to TypeScripts rather poor expression of `function*`
 * @ignore
 */
export type Gen<W, R, C extends any[] = any[]> = (...config: C) => Generator<R | undefined, void, W | undefined>;
/**
 * This is a polyfill to TypeScripts rather poor expression of `async function*`
 * @ignore
 */
export type AsyncGen<W, R, C extends any[] = any[]> = (...config: C) => AsyncGenerator<R, void, W>;
/**
 * This is a simple utility type for an argument for `Promise.resolve`
 *
 * @ignore
 */
export type MaybePromise<T> = Promise<T> | T;
/**
 * This is a simple utility type for a function that can be passed to `Promise..then`
 *
 * @ignore
 */
export type FReturns<T, Z extends any[] = any[]> = MaybePromise<T> | ((...args: Z) => MaybePromise<T>);

/**
 * Represents any pipeable type (a stream) that outputs the generic <Produces>.
 *
 * @ignore
 */
export interface PipeableStream<Produces> extends Readable {
    read(count?: number): Produces[] | null;
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T;
    // Again a hen-egg issue
    // eslint-disable-next-line no-use-before-define
    pipe<T extends WritableStream<Produces>>(destination: T, options?: { end?: boolean; }): T;
}
/**
 * A readable stream representation with generic chunks.
 *
 * @see https://nodejs.org/api/stream.html#stream_readable_streams Node.js Readable stream documentation
 */

export interface ReadableStream<Produces> extends PipeableStream<Produces> {
    [Symbol.asyncIterator](): AsyncIterableIterator<Produces>;
    destroy(): void;
}
/**
 * Writable stream representation with generic chunks.
 *
 * @see https://nodejs.org/api/stream.html#stream_writable_streams Node.js Writable stream documentation
 */

export interface WritableStream<Consumes> extends Writable {
    objectMode?: true;
    writable: boolean;
    destroy(): void;
    write(item: Consumes, cb?: (err?: Error | null) => void): boolean;
    write(str: never, encoding: never, cb?: (err?: Error | null) => void): boolean;
    end(cb?: () => void): void;
    end(data: Consumes, cb?: () => void): void;
    end(str: never, encoding: never, cb?: () => void): void;
}

export type DuplexStream<Consumes, Produces> = WritableStream<Consumes> & ReadableStream<Produces>;
export type PassThoughStream<Passes> = DuplexStream<Passes, Passes>;

/**
 * Delayed stream - stream with lazy initialization
 * in first phase PassThrough stream is created by calling getStream() method
 * is second phase the stream is piped from external stream by running run() method.
 */

export type SynchronousStreamablePayload<Produces> =
    PipeableStream<Produces> | AsyncGen<Produces, Produces> |
    Gen<Produces, void> | Iterable<Produces> |
    AsyncIterable<Produces>;

export type HasTopicInformation = {
    contentType?: string,
    topic?: string
};

export type SynchronousStreamable<Produces> = SynchronousStreamablePayload<Produces> & HasTopicInformation;
/**
 * Represents all readable stream types that will be accepted as return values
 * from {@see TFunction}
 */
export type Streamable<Produces> = MaybePromise<SynchronousStreamable<Produces>>;

/**
 * Helper: A maybe function that returns maybe a promise of a streamable.
 *
 * Acceptable results:
 *
 * - Streamable<Produces>
 * - () => Streamable<Produces>
 * - Promise<Streamable<Produces>>
 * - () => Promise<Streamable<Produces>>
 *
 * @ignore
 */
export type StreambleMaybeFunction<Produces> = FReturns<Streamable<Produces>>;

export type DeepPartial<T> = {
    [K in keyof T]?: DeepPartial<T[K]>;
};

/**
 * Basic pattern used in modules id checks
 */
const idPattern = /^[a-zA-z0-9_-]+$/;

/**
 * Function to check for valid id pattern
 */
export const isIdPattern = (id: string): boolean => {
    if (id.length > 50) return false;
    return idPattern.test(id);
}

export type UrlPath = string;

const urlPathPart = /^[\b/](([a-z0-9]+(?:-[a-z0-9]+)*)[\b/]{0,1})*$/;
/**
 * Function checking slugs in url
 * 
 * Example valid paterns: /xx /xx/ /xxx/aa /xxx-ddd/ /xxx/aaa-ddd/ /xx-cc/aaa-ddd etc.
 * @param url url to check
 * @returns true if valid slug format
 */
export const isUrlPath = (url: string): boolean => urlPathPart.test(url);

export type Port = number;
export const isPort = (port: number): port is Port => {
    return Number.isInteger(port) && port >= 0 && port <= 65535;
}

export type ApiVersion = string;

const apiVersionPattern = /^v[0-9]+([.][0-9]+)*$/
/**
 * Function checking proper version format
 * 
 * Example valid formats: v1, v2.13, v3.333.111
 * @param version version to check
 * @returns true if valid version format
 */
export const isApiVersion = (version: string): version is ApiVersion => apiVersionPattern.test(version)