import { PassThrough, Writable } from "stream";

import { DataStream } from "scramjet";

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "FATAL" | "TRACE";

/**
 * Single log entry.
 */
export type LogEntry = Partial<{
    /**
     * Id of source.
     */
    id: string;

    /**
     * Log message.
     */
    msg: string;

    /**
     * Log level.
     * @type {LogLevel}
     */
    level: LogLevel;

    /**
     * Additional error message.
     */
    error: string;

    /**
     * Timestamp. Unix time.
     */
    ts: number;

    /**
     * Additional log data.
     */
    data: any[];

    /**
     * Log source (auto filled).
     */
    from: string;
}>

export interface IObjectLogger {
    inputLogStream: PassThrough;
    inputStringifiedLogStream: PassThrough;
    outputLogStream: PassThrough;
    output: DataStream;

    addOutput(output: Writable): void;
    flush(): Promise<void>;
    write(level: LogEntry["level"], entry: LogEntry | string, ...optionalParams: any[]): void;
    debug(entry: LogEntry | string, ...optionalParams: any[]): void;
    error(entry: LogEntry | string, ...optionalParams: any[]): void;
    fatal(entry: LogEntry | string, ...optionalParams: any[]): void;
    info(entry: LogEntry | string, ...optionalParams: any[]): void;
    trace(entry: LogEntry | string, ...optionalParams: any[]): void;
    warn(entry: LogEntry | string, ...optionalParams: any[]): void;
    pipe(target: Writable | IObjectLogger, options?: { stringified?: boolean }): void;
}
