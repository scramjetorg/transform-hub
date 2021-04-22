import { Console } from "console";

import { LoggerOptions, PassThoughStream, WritableStream } from "@scramjet/types";
import { getName } from "./lib/get-name";
import { DataStream } from "scramjet";
import { InspectOptions } from "util";

export type MessageFormatter = <Z extends any[]>(name: string, func: string, args: Z) => string;

const doInspect = Symbol("doInspect");
const loggerOutputs: {[key: string]: WritableStream<any[]>[]} = {
    err: [],
    out: []
};
const writeLog = (streamSpec: keyof typeof loggerOutputs, ...args: any[]) => {
    for (const logStream of loggerOutputs[streamSpec]) {
        if (logStream.writable) {
            logStream.write(args);
        }
    }
};

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
        writeLog("err", this.name, "error", _message, ..._optionalParams);
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
        //loggerErr.write([this.name, "error", ...args]);
        writeLog("err", this.name, "error", ...args);
    }
    log(...args: any[]): void {
        //loggerOut.write([this.name, "log", ...args]);
        writeLog("out", this.name, "log", ...args);
    }
    dir(obj: any, options?: InspectOptions): void {
        //loggerOut.write([this.name, doInspect, obj, options]);
        writeLog("out", this.name, doInspect, obj, options);
    }
    debug(...args: any[]) {
        //loggerOut.write([this.name, "debug", ...args]);
        writeLog("out", this.name, "debug", ...args);
    }
    info(...args: any[]): void {
        //loggerOut.write([this.name, "info", ...args]);
        writeLog("out", this.name, "info", ...args);
    }
    warn(...args: any[]): void {
        //loggerErr.write([this.name, "warn", ...args]);
        writeLog("err", this.name, "warn", ...args);
    }

    dirxml = this.log;
    groupCollapsed = this.group;
}

const defaultFormatMessage: MessageFormatter = (name, func, ...args) => {
    return `${[new Date().toISOString(), func, `(${name})`, ...args].join(" ")}\n`;
};
const addLoggerStream = (stream: WritableStream<any>, dest: WritableStream<any>[]) => {
    if (!stream.objectMode) {
        const lout = new DataStream();

        DataStream
            .from(lout)
            .stringify(
                (msg: [string, string, any[]]) => defaultFormatMessage(...msg)
            )
            .pipe(stream);

        dest.push(lout as unknown as PassThoughStream<any[]>);
    } else {
        dest.push(stream);
    }
};

/**
 * Pipes log streams to the provided outputs in serialized format
 *
 * @param out - stream for stdout logging
 * @param err - stream for stderr logging
 */
export function addLoggerOutput(out: WritableStream<any>, err: WritableStream<any> = out) {
    addLoggerStream(out, loggerOutputs.out);
    addLoggerStream(err, loggerOutputs.err);
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
