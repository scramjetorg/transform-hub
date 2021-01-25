
type Gen<W, R, C extends any[] = []> = 
    (...config: C) => Generator<R, W, W>;
type AsyncGen<W, R, C extends any[] = []> = 
    (...config: C) => AsyncGenerator<R, W, W>;

type MaybePromise<R> = Promise<R> | R;

export interface ReadableStream<Produces> {
    [Symbol.asyncIterator](): AsyncIterableIterator<Produces>;
    read(count?: number): Produces[];
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T;
    pipe<T extends WritableStream<Produces>>(destination: T, options?: { end?: boolean; }): T;
};

export interface WritableStream<Consumes> extends NodeJS.WritableStream {
    objectMode: true;
    writable: boolean;
    write(item: Consumes, cb?: (err?: Error | null) => void): boolean;
    write(str: string, encoding: never, cb?: (err?: Error | null) => void): boolean;
    end(cb?: () => void): void;
    end(data: Consumes, cb?: () => void): void;
    end(str: string, encoding: never, cb?: () => void): void;
}

export type StreamReadable<Produces> = ReadableStream<Produces> | Iterable<Produces> | AsyncIterable<Produces>;
export type ReadFunction<Produces> = (...parameters: any[]) => MaybePromise<StreamReadable<Produces>>;

type WriteFunction<Consumes> = (stream: ReadableStream<Consumes>) => MaybePromise<void>;
type TranformFunction<Consumes, Produces> = (stream: ReadableStream<Consumes>, ...parameters: any[]) => FReturns<StreamReadable<Produces>>;

type FReturns<T> = T | (<Z extends any[]>(...args: Z) => MaybePromise<T>);

type RFunction<Produces> = Gen<Produces, any> | AsyncGen<Produces, any> | Iterable<Produces> | ReadFunction<Produces> | string;
type TFunction<Consumes, Produces> = AsyncGen<Produces, Consumes> | Gen<Produces, Consumes> | TranformFunction<Consumes, Produces> | string;
type WFunction<Consumes> = Gen<any, Consumes> | AsyncGen<any, Consumes> | WriteFunction<Consumes> | string;

type MMultipleTFunction<T,S,Z=any> = 
    [TFunction<T, S>] |
    [TFunction<T, Z>, TFunction<Z, S>] |
    [TFunction<T, Z>, TFunction<Z, any>, TFunction<any, S>] |
    [TFunction<T, Z>, TFunction<Z, any>, TFunction<any, any>, MultipleTFunction<any, S>];

type MultipleTFunction<T,S,Z=any,Y=any,X=any,W=any> = 
    [TFunction<T, S>] |
    [TFunction<T, Z>, TFunction<Z, S>] |
    [TFunction<T, Z>, TFunction<Z, Y>, TFunction<Y, S>] |
    [TFunction<T, Z>, TFunction<Z, Y>, TFunction<Y, X>, TFunction<X, S>] |
    [TFunction<T, Z>, TFunction<Z, Y>, MMultipleTFunction<Y,X>, TFunction<X, S>] |
    [TFunction<T, Z>, TFunction<Z, Y>, MMultipleTFunction<Y,X>, MMultipleTFunction<X,W>, TFunction<W, S>]
;

type TFunctionChain<Consumes,Produces,Z=any,Y=any,X=any> = 
    [TFunction<Consumes, Z>, ...MultipleTFunction<Z, Y>, TFunction<Y, Produces>] |
    [TFunction<Consumes, Z>, ...MultipleTFunction<Z, Y>, ...MultipleTFunction<Y, X>, TFunction<X, Produces>] |
    never
;

type CleanSequence<Z=any,Y=any> = TFunctionChain<Y,Z>;
type WriteSequence<Consumes,Z=any,Y=any> = 
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

export type SequenceStatus = {
    throughput: number;
    pressure: number;
}

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

export type MonitoringResponse = {
    sequences?: SequenceStatus[];
    healthy?: boolean;
};

type AppConfig = {[key: string]: null|string|number|boolean|AppConfig};

type AppError = Error & {
    exitcode?: number;
};

export interface App2Context {
    monitor?: (resp: MonitoringResponse) => MaybePromise<MonitoringResponse>;
    describe?: (tx: SequenceDefinition[]) => void;
    inspect?: (status: any) => void;
    stopHandler?: () => Promise<void>;
    killHandler?: () => Promise<void>;

    keepAlive(milliseconds: number): this;
    end(): this;
    destroy(): this;
    
    on(ev: string, handler: (message: any) => void): this;
    on(ev: "error", handler: (message: Error) => void): this;
    
    emit(ev: string, message?: any): this;
    emit(ev: "error", message: AppError): this;

    readonly config: AppConfig;
}


type TransformAppAcceptableSequence<Consumes,Produces> = CleanSequence | TransformSeqence<Consumes,Produces>;

export type TransformApp2<Consumes = any, Produces = any, Z extends any[] = any[]> = 
   (
        this: App2Context, 
        source: ReadableStream<Consumes>,
        ...args: Z
    ) => MaybePromise<TransformAppAcceptableSequence<Consumes,Produces>>
;

export type ReadableApp2<Produces = any, Z extends any[] = any[]> = 
    (
        this: App2Context, 
        source: ReadableStream<void>,
        ...args: Z
    ) => MaybePromise<ReadSequence<Produces>>
;

export type WritableApp2<Consumes = any, Z extends any[] = any[]> = 
    (
        this: App2Context, 
        source: ReadableStream<Consumes>,
        ...args: Z
    ) => MaybePromise<WriteSequence<Consumes>|void>
;

export type InertApp2<Z extends any[] = any[]> = 
(
    this: App2Context, 
    source: ReadableStream<void>,
    ...args: Z
) => MaybePromise<WriteSequence<void>|void>
;

export type Application<Consumes = any, Produces = any, Z extends any[] = any[]> = 
    TransformApp2<Consumes, Produces, Z> |
    ReadableApp2<Produces, Z> |
    WritableApp2<Consumes, Z> |
    InertApp2<Z>
;
