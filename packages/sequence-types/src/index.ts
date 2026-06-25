// ---------------------------------------------------------------------------
// @scramjet/sequence-types — Sequence-author-facing frozen API
// ---------------------------------------------------------------------------
// Exports the frozen sequence AppContext API backed by BaseAppContext from
// @scramjet/runtime-types, plus canonical sequence application/function
// types for sequence authors.
//
// Sequence authors can import everything they need from this single
// package: AppContext, application/function types, and the full runtime
// canonical surface re-exported from @scramjet/runtime-types.
// ---------------------------------------------------------------------------

export * from "./app-context";
export * from "./application";

// Re-export canonical runtime-types surface so sequence authors have
// a single import target.
export {
    AppConfig,
    BaseAppContext,
    FunctionDefinition,
    IObjectLogger,
    ILocalStorage,
    AppError,
    AppErrorCode,
    AppErrorConstructor,
    StorageAdapterType,
    LogLevel,
    LogEntry,
    IObjectLoggerOptions,
    MaybePromise,
    Streamable,
    ReadableStream,
    WritableStream,
    DuplexStream,
    PassThoughStream,
    ReadFunction,
    WriteFunction,
    TranformFunction,
    RFunction,
    TFunction,
    WFunction,
    TFunctionChain,
    InertSequence,
    WriteSequence,
    ReadSequence,
    TransformSequence,
    StopHandler,
    KillHandler,
    MonitoringHandler,
    MonitoringMessageFromRunnerData,
    FunctionStatus,
    RunnerOptions,
    DeepPartial,
    IdString,
    UrlPath,
    Port,
    ApiVersion,
    Validator,
    ValidationSchema,
    ValidationResult,
    Gen,
    AsyncGen,
    FReturns,
    PipeableStream,
    SynchronousStreamablePayload,
    HasTopicInformation,
    SynchronousStreamable,
    StreambleMaybeFunction,
    Logger,
    LoggerOutput,
    LoggerOptions,
    IComponent,
} from "@scramjet/runtime-types";
