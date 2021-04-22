import { Console } from "console";
import { PassThrough } from "stream";
import { LoggerOptions, WritableStream } from "@scramjet/types";
import { getName } from "./lib/get-name";
import { DataStream } from "scramjet";
import { InspectOptions } from "util";

export type MessageFormatter = <Z extends any[]>(name: string, func: string, args: Z) => string;

const doInspect = Symbol("doInspect");
const loggerOut = new PassThrough({ objectMode: true });
const loggerErr = new PassThrough({ objectMode: true });

class Logger implements Console {
    private name: string;
    Console: NodeJS.ConsoleConstructor;
    /**
     * @param reference - A reference passed to logger (log4j style)
     * @param _options - Logger options
     * @param output - Output streams
     */
    constructor(reference: any, _options: LoggerOptions) {
        this.name = getName(reference);
        this.Console = Console;
    }

    assert(_value: any, _message?: string, ..._optionalParams: any[]): void {
        throw new Error("Method not implemented.");
    }
    clear(): void {
        throw new Error("Method not implemented.");
    }
    count(_label?: string): void {
        throw new Error("Method not implemented.");
    }
    countReset(_label?: string): void {
        throw new Error("Method not implemented.");
    }
    group(..._label: any[]): void {
        throw new Error("Method not implemented.");
    }
    groupEnd(): void {
        throw new Error("Method not implemented.");
    }
    table(_tabularData: any, _properties?: readonly string[]): void {
        throw new Error("Method not implemented.");
    }
    time(_label?: string): void {
        throw new Error("Method not implemented.");
    }
    timeEnd(_label?: string): void {
        throw new Error("Method not implemented.");
    }
    timeLog(_label?: string, ..._data: any[]): void {
        throw new Error("Method not implemented.");
    }
    trace(_message?: any, ..._optionalParams: any[]): void {
        throw new Error("Method not implemented.");
    }
    profile(_label?: string): void {
        throw new Error("Method not implemented.");
    }
    profileEnd(_label?: string): void {
        throw new Error("Method not implemented.");
    }
    timeStamp(_label?: string): void {
        throw new Error("Method not implemented.");
    }
    memory() {}
    exception() {}

    error(...args: any[]) {
        loggerErr.write([this.name, "error", ...args]);
    }
    log(...args: any[]): void {
        loggerOut.write([this.name, "log", ...args]);
    }
    dir(obj: any, options?: InspectOptions): void {
        loggerOut.write([this.name, doInspect, obj, options]);
    }
    debug(...args: any[]) {
        loggerOut.write([this.name, "debug", ...args]);
    }
    info(...args: any[]): void {
        loggerOut.write([this.name, "info", ...args]);
    }
    warn(...args: any[]): void {
        loggerErr.write([this.name, "warn", ...args]);
    }

    dirxml = this.log;
    groupCollapsed = this.group;
}

const defaultFormatMessage: MessageFormatter = (name, func, ...args) => {
    return `${[new Date().toISOString(), func, `(${name})`, ...args].join(" ")}\n`;
};

/**
 * Pipes log streams to the provided outputs in serialized format
 *
 * @param out - stream for stdout logging
 * @param err - stream for stderr logging
 */
export function addLoggerOutput(out: WritableStream<any>, err: WritableStream<any> = out) {
    let lout = loggerOut;
    let lerr = loggerErr;

    if (!out.objectMode) {
        lout = DataStream.from(lout).stringify(
            (msg: [string, string, any[]]) => defaultFormatMessage(...msg)
        ) as unknown as PassThrough;
    }
    if (!err.objectMode) {
        lerr = DataStream.from(lerr).stringify(
            (msg: [string, string, any[]]) => defaultFormatMessage(...msg)
        ) as unknown as PassThrough;
    }

    lout.pipe(out);
    lerr.pipe(err);
}

export function removeLoggerOutput(out: WritableStream<any>, err: WritableStream<any> = out) {
    loggerOut.unpipe(out);
    loggerErr.unpipe(err);
}

/**
 * Creates a Console compatible logger with basic decorations
 *
 * @param reference - a reference object to get the name from
 * @param options - the logger options
 *
 * @returns a Console compatible logger
 */
export function getLogger(
    reference: any,
    options: LoggerOptions = { useCallsite: false }
): Logger {
    // TODO: return same object on the same reference
    return new Logger(reference, options);
}
