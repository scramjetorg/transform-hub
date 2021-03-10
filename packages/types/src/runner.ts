import { exposeSequenceSymbol } from "@scramjet/symbols";
import {
    AppErrorCode,
    AppError,
    AsyncGen,
    FReturns,
    Gen,
    MaybePromise,
    PipeableStream,
    ReadableStream
} from "@scramjet/types";

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
type MulTFunction<T, S, W = any, X = any, Y = any> =
    [TFunction<T, S>] |
    [TFunction<T, Y>, TFunction<Y, S>] |
    [TFunction<T, Y>, TFunction<Y, X>, TFunction<X, S>] |
    [TFunction<T, Y>, TFunction<Y, X>, TFunction<X, W>, TFunction<W, S>] |
    never
    ;

// @ts-ignore
// eslint-disable-next-line no-use-before-define, @typescript-eslint/no-unused-vars
type MulMulTFunction<T, S, Z extends ArrayMin<[Y, X, W, ...V, ...U]>, Y = any, X = any, W = any, V = any[], U = any[]> =
    [TFunction<T, Y>, TFunction<Y, S>] |
    [TFunction<T, Y>, TFunction<Y, X>, TFunction<X, S>] |
    [TFunction<T, Y>, ...MulTFunction<Y, X, V>, TFunction<X, S>] |
    [TFunction<T, Y>, ...MulTFunction<Y, X, U>, ...MulTFunction<X, W, V>, TFunction<W, S>]
    ;

type TFunctionChain<Consumes, Produces, Z extends any[]> =
    [TFunction<Consumes, Produces>] |
    [...MulMulTFunction<Consumes, Produces, Z>]
    ;

/**
 * Minimal type of Sequence that doesn't read anything from the outside, doesn't
 * write anything to outside. It may be doing anything, but it's not able to report
 * the progress via streaming.
 */
export type InertSequence<Z = any, Y = any, X extends any[] = any[]> = TFunctionChain<Y, Z, X>;

/**
 * A Sequence of functions that accept some input, transforms it through
 * a number of functions and writes to some destination.
 */
export type WriteSequence<Consumes, Y extends any[] = any[], Z = any> =
    [WFunction<Consumes>] |
    [...TFunctionChain<Consumes, Z, Y>, WFunction<Z>] |
    [RFunction<Consumes>, WFunction<Consumes>] |
    [RFunction<Consumes>, ...TFunctionChain<Consumes, Z, Y>, WFunction<Z>]
    ;

/**
 * A sequence of functions reads input from a source and outputs it after
 * a chain of transforms.
 */
export type ReadSequence<Produces, Y extends any[] = any[], Z = any> =
    [RFunction<Produces>] |
    [RFunction<Z>, ...TFunctionChain<Z, Produces, Y>]
    ;

/**
 * A Transform Sequence is a sequence that accept input, perform operations on it, and
 * outputs the result.
 */
export type TransformSeqence<Consumes, Produces, Z = any, X extends any[] = any[]> =
    [TFunction<Consumes, Produces>] |
    [...TFunctionChain<Consumes, Z, X>, TFunction<Z, Produces>]
    ;

/**
 * Defines scalability options for writable or readable side of the Function:
 *
 * * C - Concurrency - the funcion accepts and processes more than one item at the
 *   same time, and therefore can be composed with consecutive ones.
 * * S - Sequentiality - the function can be executed on a different host to it's neighbours.
 * * P - Parallelism - the function can be spawned to multiple hosts at the same time
 */
type ScalabilityOptions = "CSP" | "CS" | "CP" | "SP" | "C" | "S" | "V" | "";

/**
 * Definition that informs the platform of the details of a single function.
 */
export type FunctionDefinition = {
    /**
     * Stream mode:
     *
     * * buffer - carries binary/string chunks that have no fixed size chunks and can be passed through sockets
     * * object - carries any type of object, that is serializable via JSON or analogue
     * * reference - carries non-serializable object references that should not be passed outside of a single process
     */
    mode: "buffer" | "object" | "reference";
    /**
     * Optional name for the function (which will be shown in UI/CLI)
     */
    name?: string;
    /**
     * Addtional description of the function
     */
    description?: string;
    /**
     * Describes how head (readable side) and tail (writable side) of this Function can be
     * scaled to other machines.
     */
    scalability?: {
        /**
         * Writable side scalability
         */
        head?: ScalabilityOptions;
        /**
         * Readable side scalability
         */
        tail?: ScalabilityOptions;
    }
}

/**
 * Provides basic function status information
 */
export type FunctionStatus = {
    /**
     * Average number of stream entries passing that specific function over the duration
     * of 1 second during the last 10 seconds.
     */
    throughput: number;
    /**
     * The amount of stream entries that this function will accept in queue for processing
     * before `pause` is called (i.e. highWaterMark - processing)
     */
    buffer: number;
    /**
     * The number of stream entries currently being processed.
     */
    processing: number;
    /**
     * Calculated backpressure: processing * throughput / buffer
     */
    readonly pressure: number;
}

/**
 * The response an Sequence sends as monitoring responses
 */
export type MonitoringMessage = {
    /**
     *
     */
    sequences?: FunctionStatus[];
    healthy?: boolean;
};

/**
 * App configuration primitive.
 */
export type AppConfig = { [key: string]: null | string | number | boolean | AppConfig };

/**
 * Constructs an AppError
 *
 * @param code One of the predefined error codes
 * @param message Optional additional explanatory message
 */
type AppErrorConstructor = new (code: AppErrorCode, message?: string) => AppError;

/**
 * Object of this interface is passed to Application context and allows it to communicate
 * with the Platform to ensure that it's in operation and should be kept alive without
 * interruption.
 *
 *
 */
interface AutoAppContext<AppConfigType extends AppConfig, State extends any> {
    /**
     * This method should be overridden by the Sequence if auto detection of the Sequence
     * state is not precise enough.
     *
     * The Runner will call this message periodically to obtain information on the
     * condition of the Sequence.
     *
     * If not provided, a monitoring function will be determined based on the
     * return value from the Sequence.
     *
     * @param resp passed if the system was able to determine monitoring message by itself.
     * @returns the monitoring information
     */
    monitor?: (resp?: MonitoringMessage) => MaybePromise<MonitoringMessage>;

    /**
     * This method can be overridden to handle the stop signal from the Runner and perform
     * a graceful shutdown. The platform will provide a grace period in order to save current
     * work and provide.
     *
     * This method can be called under two conditions:
     * * the instance will be terminated for extraneous reasons
     * * the instance was not able to confirm if the Sequence is alive
     *
     * The method can call @{see this.state} as many times as it likes, the valkue from the
     * last call will be made sure to be saved before the process will be terminated.
     *
     * @param timeout the number of seconds before the operation will be killed
     * @param canCallKeepalive informs if keepAlive can be called to prolong the operation
     * @returns the returned value can be a promise, once it's resolved the system will
     *          assume that it's safe to terminate the process.
     */
    stopHandler?: (timeout: number, canCallKeepalive: boolean) => MaybePromise<void>;

    /**
     * This method can be overridden to handle the kill signal from the Runner and perform
     * the final cleanup. This method is synchroneous and once it's exits the process will be
     * synchronously terminated.
     *
     * The method can call @{see this.state} as many times as it likes, the valkue from the
     * last call will be made sure to be saved before the process will be terminated.
     *
     * If this methods fails to exit within `100 ms` the process will be forcefully terminated
     * and the data will be lost.
     */
    killHandler?: () => void;

    /**
     * The Sequence may call this process in order to confirm continued operation and provide
     * an information on how long the Sequence should not be considered stale.
     *
     * Sequences that expose read or write functions do not need to call this when the data
     * is flowing.
     *
     * If the platform finds no indication that the Sequence is still alive it will attempt to
     * stop it.
     *
     * @param milliseconds provides information on how long the process should wait before
     */
    keepAlive(milliseconds?: number): this;

    /**
     * Calling this method will inform the Instance that the Sequence has completed the
     * operation and can be gracefully terminated.
     *
     * If the Sequence is Writable or Inert then it will call the stopHandler immediatelly.
     * If the Sequence is Readable of Transform then it will call the stopHandler when all the
     * data is passed to the neighours.
     *
     * This method will be called automatically when the readable side of the sequence ends.
     */
    end(): this;
    /**
     * Calling this method will inform the Instance that the Sequence has enountered a fatal
     * exception and should not be kept alive.
     *
     * If the Sequence is Writable or Inert then it will call the stopHandler immediatelly.
     * If the Sequence is Readable of Transform then it will call the stopHandler when any
     * error occurs on the readable side or it reaches end and all the data is passed to the
     * neighours.
     *
     * This method will be called automatically when the readable side of the sequence errors
     * out.
     *
     * @param error optional error object for inspection
     */
    destroy(error?: AppError): this;

    /**
     * This method can be used to ensure that the data is passed here will be stored for
     * another process. The operation is synchroneous and blocking.
     *
     * You can call the method as many times as you want, the last state will be safely
     * passed to the process that will take over after this one is terminated.
     *
     * @param state any serializable value
     */
    save(state: State): void;

    /**
     * Holds the previous state if there was a previous process in existance and it called the
     * {@link this#save}.
     */
    initialState?: State;

    /**
     * Receives events sent by the Instance that can be triggered via CLI and configured
     * actions.
     *
     * @param ev
     * @param handler
     */
    on(ev: string, handler: (message?: any) => void): this;
    on(ev: "error", handler: (message: Error) => void): this;

    /**
     * Sends events to the Instance that can be received by CLI and configured actions
     *
     * @param ev event name
     * @param message any serializable object
     */
    emit(ev: string, message?: any): this;
    emit(ev: "error", message: AppError): this;

    /**
     * Provides automated definition as understood by
     */
    definition?: FunctionDefinition[];

    readonly config: AppConfigType;
    readonly AppError: AppErrorConstructor;
}

/**
 * Object of this interface is passed to Application context and allows it to communicate
 * with the Platform to ensure that it's in operation and should be kept alive without
 * interruption.
 */
interface FullAppContext<
    AppConfigType extends AppConfig,
    State extends any
    > extends AutoAppContext<AppConfigType, State> {
    /**
     * This method must be overridden by the Sequence if definition is not
     * providing the correct outcome.
     *
     * The Runner will call this message periodically to obtain information on the
     * condition of the Sequence.
     *
     * If not provided, a monitoring function will be determined based on the
     * return value from the Sequence.
     *
     * @param resp passed if the system was able to determine monitoring message by itself.
     * @returns the monitoring information
     */
    monitor: (resp?: MonitoringMessage) => MaybePromise<MonitoringMessage>;
    /**
     * This method should be overridden by the sequence if auto detection of the Sequence
     * definition is not providing the correct outcome.
     */
    describe: () => FunctionDefinition[];
}

/**
 * Application context
 *
 * @interface
 */
export type AppContext<AppConfigType extends AppConfig, State extends any> =
    AutoAppContext<AppConfigType, State> | FullAppContext<AppConfigType, State>;

type TransformAppAcceptableSequence<Consumes, Produces> =
    TFunction<Consumes, Produces> |
    InertSequence |
    TransformSeqence<Consumes, Produces>
    ;

/**
 * A Transformation App that accepts data from the platform, performs operations on the data,
 * and returns the data to the platforms for further use.
 *
 * Has both active readable and writable sides.
 *
 * @interface
 */
export type TransformApp<
    Consumes = any,
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig
    > =
    (
        this: AppContext<AppConfigType, S>,
        source: ReadableStream<Consumes>,
        ...args: Z
    ) => MaybePromise<TransformAppAcceptableSequence<Consumes, Produces>>
    ;

/**
 * A Readable App is an app that obtains the data by it's own means and preforms
 * 0 to any number of transforms on that data before returning it.
 *
 * @interface
 */
export type ReadableApp<
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig
    > =
    (
        this: AppContext<AppConfigType, S>,
        source: ReadableStream<never>,
        ...args: Z
    ) => MaybePromise<RFunction<Produces> | ReadSequence<Produces>>;

/**
 * A Writable App is an app that accepts the data from the platform, performs any number
 * of transforms and then saves it to the data destination by it's own means.
 *
 * @interface
 */
export type WritableApp<
    Consumes = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig
    > =
    (
        this: AppContext<AppConfigType, S>,
        source: ReadableStream<Consumes>,
        ...args: Z
    ) => MaybePromise<WFunction<Consumes> | WriteSequence<Consumes> | void>;

/**
 * An Inert App is an app that doesn't accept data from the platform and doesn't output it.
 *
 * @interface
 */
export type InertApp<
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig
    > =
    (
        this: FullAppContext<AppConfigType, S>,
        source: ReadableStream<void>,
        ...args: Z
    ) => MaybePromise<WFunction<void> | WriteSequence<void> | void>;

export type ApplicationExpose<
    Consumes = any,
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig
    > = {
        // Because we need this a bit lower again, so it's an egg-hen problem.
        // eslint-disable-next-line no-use-before-define
        [exposeSequenceSymbol]: Application<Consumes, Produces, Z, S, AppConfigType>;
    };

/**
 * Application is an acceptable input for the runner.
 *
 * @interface
 */
export type Application<
    Consumes = any,
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig
    > =
    TransformApp<Consumes, Produces, Z, S, AppConfigType> |
    ReadableApp<Produces, Z, S, AppConfigType> |
    WritableApp<Consumes, Z, S, AppConfigType> |
    InertApp<Z, S> |
    ApplicationExpose<Consumes, Produces, Z, S, AppConfigType>
;

export namespace MessageCodes {
    export type PONG = "PONG";
    export type ACKNOWLEDGE = "ACKNOWLEDGE";
    export type PING = "PING";
    export type STOP = "STOP";
    export type KILL = "KILL";
    export type MONITORING_RATE = "MONITORING_RATE";
    export type ALIVE = "ALIVE";
    export type FORCE_CONFIRM_ALIVE = "FORCE_CONFIRM_ALIVE";
    export type DESCRIBE_SEQUENCE = "DESCRIBE_SEQUENCE";
    export type ERROR = "ERROR";
    export type MONITORING = "MONITORING";

    export type ANY = STOP | KILL;
}

export type MessageCode = MessageCodes.ANY;

export type RunnerOptions = {
    monitoringInterval?: number
};
