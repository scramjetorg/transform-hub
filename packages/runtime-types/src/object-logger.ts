import { Readable } from "stream";

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "FATAL" | "TRACE";

/**
 * Single log entry.
 */
export type LogEntry = Partial<{
    id: string;
    msg: string;
    level: LogLevel;
    error: string;
    ts: number;
    data: any[];
    from: string;
}>;

export type IObjectLoggerOptions = { end?: boolean; stringified?: boolean };

/**
 * Structured logger interface.
 */
export interface IObjectLogger {
    inputLogStream: NodeJS.WritableStream;
    inputStringifiedLogStream: NodeJS.WritableStream;
    outputLogStream: NodeJS.ReadableStream;
    output: NodeJS.ReadableStream;

    logLevel: LogLevel;

    addOutput(output: NodeJS.WritableStream): void;

    write(level: LogEntry["level"], entry: LogEntry | string, ...optionalParams: any[]): void;
    end(): void;

    debug(entry: LogEntry | string, ...optionalParams: any[]): void;
    error(entry: LogEntry | string, ...optionalParams: any[]): void;
    fatal(entry: LogEntry | string, ...optionalParams: any[]): void;
    info(entry: LogEntry | string, ...optionalParams: any[]): void;
    trace(entry: LogEntry | string, ...optionalParams: any[]): void;
    warn(entry: LogEntry | string, ...optionalParams: any[]): void;

    addObjectLoggerSource(source: IObjectLogger): void;
    addSerializedLoggerSource(source: Readable): void;

    pipe(target: NodeJS.WritableStream | IObjectLogger, options?: IObjectLoggerOptions): void;
    unpipe(target?: NodeJS.WritableStream | IObjectLogger): void;

    updateBaseLog(entry: LogEntry): void;
}
