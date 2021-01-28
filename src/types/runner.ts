import { exposeSequenceSymbol } from "@scramjet/symbols";

/**
 * This is a polyfill to TypeScripts rather poor expression of `function*`
 * @ignore
 */
type Gen<W, R, C extends any[] = []> =
    (...config: C) => Generator<R, W|void, W>;
/**
 * This is a polyfill to TypeScripts rather poor expression of `async function*`
 * @ignore
 */
type AsyncGen<W, R, C extends any[] = []> =
    (...config: C) => AsyncGenerator<R, W|void, W>;

/**
 * This is a simple utility type for an argument for `Promise.resolve`
 * 
 * @ignore
 */
type MaybePromise<T> = Promise<T> | T;

/**
 * This is a simple utility type for a function that can be passed to `Promise..then`
 * 
 * @ignore
 */
type FReturns<T, Z extends any[] = any[]> = MaybePromise<T> | ((...args: Z) => MaybePromise<T>);

/**
 * Represents any pipeable type (a stream) that outputs the generic <Produces>.
 * 
 * @ignore
 */
interface PipeableStream<Produces> {
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

/**
 * Represents all readable stream types that will be accepted as return values from {@see TFunction} 
 */
export type Streamable<Produces> =
    PipeableStream<Produces> |
    AsyncGen<Produces, void> |
    Gen<Produces, void> |
    Iterable<Produces> |
    AsyncIterable<Produces>;

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
type StreambleMaybeFunction<Produces> = FReturns<Streamable<Produces>>;

/**
 * 
 */
export type ReadFunction<Produces> = (...parameters: any[]) => StreambleMaybeFunction<Produces>;
export type WriteFunction<Consumes> = (stream: ReadableStream<Consumes>, ...parameters: any[]) => MaybePromise<void>;
export type TranformFunction<Consumes, Produces> =
    (stream: ReadableStream<Consumes>, ...parameters: any[]) => StreambleMaybeFunction<Produces>;

export type RFunction<Produces> = Streamable<Produces> | ReadFunction<Produces>;
export type TFunction<Consumes, Produces> =
    AsyncGen<Produces, Consumes> |
    Gen<Produces, Consumes> |
    TranformFunction<Consumes, Produces>
;
export type WFunction<Consumes> = TFunction<Consumes, never>;

type ArrayMin<Y, X, W, V extends any[]> = [] | [Y] | [Y, X] | [Y, X, W, V];

// @ts-ignore
type MulTFunction<T, S, W=any, X=any, Y=any> =
    [TFunction<T, S>] |
    [TFunction<T, Y>, TFunction<Y, S>] |
    [TFunction<T, Y>, TFunction<Y, X>, TFunction<X, S>] |
    [TFunction<T, Y>, TFunction<Y, X>, TFunction<X, W>, TFunction<W, S>] |
    never
;

// @ts-ignore
// eslint-disable-next-line no-use-before-define, @typescript-eslint/no-unused-vars
type MulMulTFunction<T, S, Z extends ArrayMin<[Y, X, W, ...V, ...U]>, Y=any, X=any, W=any, V=any[], U=any[]> =
    [TFunction<T, Y>, TFunction<Y, S>] |
    [TFunction<T, Y>, TFunction<Y, X>, TFunction<X, S>] |
    [TFunction<T, Y>, ...MulTFunction<Y, X, V>, TFunction<X, S>] |
    [TFunction<T, Y>, ...MulTFunction<Y, X, U>, ...MulTFunction<X, W, V>, TFunction<W, S>]
;

type TFunctionChain<Consumes, Produces, Z extends any[]> =
    [TFunction<Consumes, Produces>] |
    [...MulMulTFunction<Consumes, Produces, Z>]
;

export type InertSequence<Z=any, Y=any, X extends any[] = any[]> = TFunctionChain<Y, Z, X>;

export type WriteSequence<Consumes, Y extends any[] = any[], Z=any> =
    [WFunction<Consumes>] |
    [...TFunctionChain<Consumes, Z, Y>, WFunction<Z>] |
    [RFunction<Consumes>, WFunction<Consumes>] |
    [RFunction<Consumes>, ...TFunctionChain<Consumes, Z, Y>, WFunction<Z>]
;
export type ReadSequence<Produces, Y extends any[] = any[], Z=any> =
    [RFunction<Produces>] |
    [RFunction<Z>, ...TFunctionChain<Z, Produces, Y>]
;
export type TransformSeqence<Consumes, Produces, Z=any, X extends any[] = any[]> =
    [TFunction<Consumes, Produces>] |
    [...TFunctionChain<Consumes, Z, X>, TFunction<Z, Produces>]
;

type ScalabilityOptions = "CSP" | "CS" | "CP" | "SP" | "C" | "S" | "V";

export type SequenceDefinition = {
    mode: "buffer" | "object";
    name?: string;
    description?: string;
    scalability?: {
        head?: ScalabilityOptions;
        tail?: ScalabilityOptions;
    }
}

export type SequenceStatus = {
    throughput: number;
    pressure: number;
}

export type MonitoringResponse = {
    sequences?: SequenceStatus[];
    healthy?: boolean;
};

export type AppConfig = {[key: string]: null|string|number|boolean|AppConfig};

export type AppErrorCode =
    "GENERAL_ERROR" |
    "COMPILE_ERROR" |
    "SEQUENCE_MISCONFIGURED"
;

export type AppError = Error & {
    code: AppErrorCode;
    exitcode?: number;
};

/**
 * Constructs an AppError
 * 
 * @param code One of the predefined error codes
 * @param message Optional additional explanatory message
 */
type AppErrorConstructor = new (code: AppErrorCode, message?: string) => AppError;

export interface App2Context<AppConfigType extends AppConfig> {
    monitor?: (resp: MonitoringResponse) => MaybePromise<MonitoringResponse>;
    describe?: (tx: SequenceDefinition[]) => void;

    stopHandler?: () => Promise<void>;
    killHandler?: () => Promise<void>;

    keepAlive(milliseconds?: number): this;
    end(): this;
    destroy(): this;

    on(ev: string, handler: (message?: any) => void): this;
    on(ev: "error", handler: (message: Error) => void): this;

    emit(ev: string, message?: any): this;
    emit(ev: "error", message: AppError): this;

    definition?: SequenceDefinition[];
    readonly config: AppConfigType;
    readonly AppError: AppErrorConstructor;
}

type TransformAppAcceptableSequence<Consumes, Produces> =
    TFunction<Consumes, Produces> |
    InertSequence |
    TransformSeqence<Consumes, Produces>
;

export type TransformApp<
    Consumes = any,
    Produces = any,
    Z extends any[] = any[],
    AppConfigType extends AppConfig = AppConfig
> =
   (
        this: App2Context<AppConfigType>,
        source: ReadableStream<Consumes>,
        ...args: Z
    ) => MaybePromise<TransformAppAcceptableSequence<Consumes, Produces>>
;

export type ReadableApp<Produces = any, Z extends any[] = any[], AppConfigType extends AppConfig = AppConfig> =
    (
        this: App2Context<AppConfigType>,
        source: ReadableStream<never>,
        ...args: Z
    ) => MaybePromise<RFunction<Produces> | ReadSequence<Produces>>
;

export type WritableApp<Consumes = any, Z extends any[] = any[], AppConfigType extends AppConfig = AppConfig> =
    (
        this: App2Context<AppConfigType>,
        source: ReadableStream<Consumes>,
        ...args: Z
    ) => MaybePromise<WFunction<Consumes>|WriteSequence<Consumes>|void>
;

export type InertApp<Z extends any[] = any[], AppConfigType extends AppConfig = AppConfig> =
(
    this: App2Context<AppConfigType>,
    source: ReadableStream<void>,
    ...args: Z
) => MaybePromise<WFunction<void>|WriteSequence<void>|void>
;

export type ApplicationExpose<
    Consumes = any, Produces = any, Z extends any[] = any[],
    AppConfigType extends AppConfig = AppConfig
> = {
    // Because we need this a bit lower again, so it's an egg-hen problem.
    // eslint-disable-next-line no-use-before-define
    [exposeSequenceSymbol]: Application<Consumes, Produces, Z, AppConfigType>;
};

export type Application<
    Consumes = any,
    Produces = any,
    Z extends any[] = any[],
    AppConfigType extends AppConfig = AppConfig
> =
    TransformApp<Consumes, Produces, Z, AppConfigType> |
    ReadableApp<Produces, Z, AppConfigType> |
    WritableApp<Consumes, Z, AppConfigType> |
    InertApp<Z> |
    ApplicationExpose<Consumes, Produces, Z, AppConfigType>
;
