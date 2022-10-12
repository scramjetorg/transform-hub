import { PassThrough, Readable, Writable } from "stream";

import { DataStream } from "scramjet";

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "FATAL" | "TRACE";
export const LogLevelStrings: LogLevel[] = ["FATAL", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"];
export const isLogLevel = (lvl: string): lvl is LogLevel => {
    return (LogLevelStrings as string[]).includes(lvl);
};

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

    pipe(target: Writable | IObjectLogger, options?: { end?: boolean; stringified?: boolean }): void;
    unpipe(target: Writable | IObjectLogger): void;
}
