import { LoggerOptions, PassThoughStream, WritableStream } from "@scramjet/types";
import { Console } from "console";
import { DataStream } from "scramjet";
import { Writable } from "stream";
import { inspect, InspectOptions } from "util";
import { getName } from "./lib/get-name";


export type MessageFormatter = <Z extends any[]>(name: string, func: string, args: Z) => string;

const loggerOutputs: {[key: string]: WritableStream<any[]>[]} = {
    err: [],
    out: []
};
const writeLog = (streamSpec: keyof typeof loggerOutputs, ...args: any[]) => {
    for (const logStream of loggerOutputs[streamSpec]) {
        const inspectedArgs = args.map(x => {
            if (typeof x === "object" || typeof x === "function")
                return inspect(x);
            return x;
        });

        logStream.write([new Date().toISOString(), ...inspectedArgs]);
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
        writeLog("err", this.name, "error", ...args);
    }
    log(...args: any[]): void {
        writeLog("out", this.name, "log", ...args);
    }
    dir(obj: any, options?: InspectOptions): void {
        writeLog("out", this.name, obj, options);
    }
    debug(...args: any[]) {
        writeLog("out", this.name, "debug", ...args);
    }
    info(...args: any[]): void {
        writeLog("out", this.name, "info", ...args);
    }
    warn(...args: any[]): void {
        writeLog("err", this.name, "warn", ...args);
    }

    dirxml = this.log;
    groupCollapsed = this.group;
}

const defaultFormatMessage: MessageFormatter = (ts, name, func, ...args) => {
    return `${[ts, func, `(${name})`, ...args].join(" ")}\n`;
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

export const close = () => {
    loggerOutputs.out.forEach((stream: Writable) => { stream.end(); });
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
