import { DataStream } from "scramjet";
import { PassThrough, Writable } from "stream";
import { DeepPartial } from "./utils";

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "FATAL" | "TRACE";

/**
 * Single log entry.
 */
export type LogEntry = DeepPartial<{
    id: string;
    msg: string;
    level: LogLevel;
    error: string;
    ts: number;
    data?: any[];
    from: string;
}>

export interface IObjectLogger {
    inputLogStream: PassThrough;
    inputStringifiedLogStream: PassThrough;
    outputLogStream: PassThrough;
    output: DataStream;

    addOutput(output: Writable): void;

    write(level: LogEntry["level"], entry: LogEntry | string, ...optionalParams: any[]): void;
    debug(entry: LogEntry | string, ...optionalParams: any[]): void;
    error(entry: LogEntry | string, ...optionalParams: any[]): void;
    fatal(entry: LogEntry | string, ...optionalParams: any[]): void;
    info(entry: LogEntry | string, ...optionalParams: any[]): void;
    trace(entry: LogEntry | string, ...optionalParams: any[]): void;
    warn(entry: LogEntry | string, ...optionalParams: any[]): void;
    pipe(target: Writable | IObjectLogger, options?: { stringified?: boolean }): void;
}
