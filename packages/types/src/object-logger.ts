import { Writable } from "stream";
import { DeepPartial } from "./utils";

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "FATAL" | "TRACE";

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
    write(level: LogEntry["level"], entry: LogEntry | string, ...optionalParams: any[]): void;
    trace(entry: LogEntry | string, ...optionalParams: any[]): void;
    debug(entry: LogEntry | string, ...optionalParams: any[]): void;
    info(entry: LogEntry | string): void
    pipe(target: Writable | IObjectLogger): void;
}
