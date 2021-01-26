import {exposeSequenceSymbol} from "@scramjet/symbols";

/**
 * This is a polyfill to TypeScripts rather poor expression of `function*`
 * @ignore
 */
type Gen<W, R, C extends any[] = []> = 
    (...config: C) => Generator<R, W, W>;
/**
 * This is a polyfill to TypeScripts rather poor expression of `async function*`
 * @ignore
 */
type AsyncGen<W, R, C extends any[] = []> = 
    (...config: C) => AsyncGenerator<R, W, W>;

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
    pipe<T extends WritableStream<Produces>>(destination: T, options?: { end?: boolean; }): T;
}

/**
 * A readable stream representation with generic chunks.
 * 
 * @see https://nodejs.org/api/stream.html#stream_readable_streams Node.js Readable stream documentation
 */
export interface ReadableStream<Produces> extends PipeableStream<Produces> {
    [Symbol.asyncIterator](): AsyncIterableIterator<Produces>;
};

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
export type Streamable<Produces> = PipeableStream<Produces> | AsyncGen<Produces, void> | Gen<Produces, void> | Iterable<Produces> | AsyncIterable<Produces>;

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
export type TranformFunction<Consumes, Produces> = (stream: ReadableStream<Consumes>, ...parameters: any[]) => StreambleMaybeFunction<Produces>;

export type RFunction<Produces> = Streamable<Produces> | ReadFunction<Produces>;
export type TFunction<Consumes, Produces> = AsyncGen<Produces, Consumes> | Gen<Produces, Consumes> | TranformFunction<Consumes, Produces>;
export type WFunction<Consumes> = WritableStream<Consumes> | Gen<any, Consumes> | AsyncGen<any, Consumes> | WriteFunction<Consumes>;

type MulTFunction<T,S,Z=any,Y=any,X=any,W=any,V=any> = 
    [TFunction<T, S>] |
    [TFunction<T, Z>, TFunction<Z, S>] |
    [TFunction<T, Z>, TFunction<Z, Y>, TFunction<Y, S>] |
    [TFunction<T, Z>, TFunction<Z, Y>, TFunction<Y, X>, TFunction<X, S>] |
    [TFunction<T, Z>, TFunction<Z, Y>, TFunction<Y, X>, TFunction<X, W>, TFunction<W, S>] |
    [TFunction<T, Z>, TFunction<Z, Y>, TFunction<Y, X>, TFunction<X, W>, TFunction<W, V>, TFunction<V, S>]
;

type MulMulTFunction<T,S,Z=any,Y=any,X=any,W=any> = 
    [TFunction<T, S>] |
    [TFunction<T, Z>, TFunction<Z, S>] |
    [TFunction<T, Z>, TFunction<Z, Y>, TFunction<Y, S>] |
    [TFunction<T, Z>, TFunction<Z, Y>, TFunction<Y, X>, TFunction<X, S>] |
    [TFunction<T, Z>, TFunction<Z, Y>, ...MulTFunction<Y,X>, TFunction<X, S>] |
    [TFunction<T, Z>, TFunction<Z, Y>, ...MulTFunction<Y,X>, ...MulTFunction<X,W>, TFunction<W, S>]
;

type TFunctionChain<Consumes,Produces,Z=any,Y=any,X=any> = 
    [TFunction<Consumes, Z>, ...MulMulTFunction<Z, Y>, TFunction<Y, Produces>] |
    [TFunction<Consumes, Z>, ...MulMulTFunction<Z, Y>, ...MulMulTFunction<Y, X>, TFunction<X, Produces>] |
    never
;

type CleanSequence<Z=any,Y=any> = TFunctionChain<Y,Z>;
type WriteSequence<Consumes,Z=any> = 
    WFunction<Consumes> |
    [WFunction<Consumes>] | 
    [...TFunctionChain<Consumes,Z>, WFunction<Z>]
;
type ReadSequence<Produces,Z=any,Y=any> = 
    RFunction<Produces> | 
    [RFunction<Produces>] | 
    [RFunction<Z>, TFunction<Z,Produces>] | 
    [RFunction<Z>, ...TFunctionChain<Z,Y>, TFunction<Y,Produces>]
;
type TransformSeqence<Consumes,Produces,Z=any,Y=any> = 
    TFunction<Consumes,Produces> | 
    [TFunction<Consumes,Produces>] | 
    [TFunctionChain<Z,Y>, TFunction<Z,Produces>] | 
    [TFunction<Consumes,Z>, ...TFunctionChain<Z,Y>, TFunction<Y,Produces>]
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


type TransformAppAcceptableSequence<Consumes,Produces> = CleanSequence | TransformSeqence<Consumes,Produces>;

export type TransformApp<Consumes = any, Produces = any, Z extends any[] = any[], AppConfigType extends AppConfig = AppConfig> = 
   (
        this: App2Context<AppConfigType>, 
        source: ReadableStream<Consumes>,
        ...args: Z
    ) => MaybePromise<TransformAppAcceptableSequence<Consumes,Produces>>
;

export type ReadableApp<Produces = any, Z extends any[] = any[], AppConfigType extends AppConfig = AppConfig> = 
    (
        this: App2Context<AppConfigType>, 
        source: ReadableStream<never>,
        ...args: Z
    ) => MaybePromise<ReadSequence<Produces>>
;

export type WritableApp<Consumes = any, Z extends any[] = any[], AppConfigType extends AppConfig = AppConfig> = 
    (
        this: App2Context<AppConfigType>, 
        source: ReadableStream<Consumes>,
        ...args: Z
    ) => MaybePromise<WriteSequence<Consumes>|void>
;

export type InertApp<Z extends any[] = any[], AppConfigType extends AppConfig = AppConfig> = 
(
    this: App2Context<AppConfigType>, 
    source: ReadableStream<void>,
    ...args: Z
) => MaybePromise<WriteSequence<void>|void>
;

export type ApplicationExpose<
    Consumes = any, Produces = any, Z extends any[] = any[], 
    AppConfigType extends AppConfig = AppConfig
> = {
    [exposeSequenceSymbol]: Application<Consumes, Produces, Z, AppConfigType>;
};

export type Application<Consumes = any, Produces = any, Z extends any[] = any[], AppConfigType extends AppConfig = AppConfig> = 
    TransformApp<Consumes, Produces, Z, AppConfigType> |
    ReadableApp<Produces, Z, AppConfigType> |
    WritableApp<Consumes, Z, AppConfigType> |
    InertApp<Z> |
    ApplicationExpose<Consumes, Produces, Z, AppConfigType>
;
