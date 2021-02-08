/**
 * This is a polyfill to TypeScripts rather poor expression of `function*`
 * @ignore
 */
export type Gen<W, R, C extends any[] = []> = (...config: C) => Generator<R, W | void, W>;
/**
 * This is a polyfill to TypeScripts rather poor expression of `async function*`
 * @ignore
 */
export type AsyncGen<W, R, C extends any[] = []> = (...config: C) => AsyncGenerator<R, W | void, W>;
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
export interface PipeableStream<Produces> {
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
}
/**
 * Writable stream representation with generic chunks.
 *
 * @see https://nodejs.org/api/stream.html#stream_writable_streams Node.js Writable stream documentation
 */

export interface WritableStream<Consumes> {
    objectMode: true;
    writable: boolean;
    write(item: Consumes, cb?: (err?: Error | null) => void): boolean;
    write(str: never, encoding: never, cb?: (err?: Error | null) => void): boolean;
    end(cb?: () => void): void;
    end(data: Consumes, cb?: () => void): void;
    end(str: never, encoding: never, cb?: () => void): void;
}
