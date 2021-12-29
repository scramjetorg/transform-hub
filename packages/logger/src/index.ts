import { LoggerOptions, WritableStream } from "@scramjet/types";

import { Console } from "console";
import { inspect, InspectOptions } from "util";

import { DataStream } from "scramjet";

import { getName } from "./lib/get-name";
import { COLORS } from "./lib/colors";

export type MessageFormatter = <Z extends any[]>(
    colors: boolean, ts: string, name: string, func: string, args: Z
) => string;

type LoggerOutputStream<IN extends any> = { output: WritableStream<IN>; origin?: WritableStream<IN> };

const inspectOpts: InspectOptions = {
    colors: true,
    depth: null,
};
const loggerOutputs: {[key: string]: LoggerOutputStream<any[]>[]} = {
    err: [],
    out: []
};
const writeLog = (streamSpec: keyof typeof loggerOutputs, ...args: any[]) => {
    for (const logStream of loggerOutputs[streamSpec]) {
        const inspectedArgs = args.map(x => {
            if (typeof x === "object" || typeof x === "function")
                return inspect(x, inspectOpts);
            return x;
        });

        logStream.output.write([new Date().toISOString(), ...inspectedArgs]);
    }
};

export class Logger implements Console {
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
        writeLog("out", this.name, "dir", obj, options);
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

const withColor = (txt: string, color: COLORS) => `${color}${txt}${COLORS.Reset}`;
const colorizeLogFunctionName = (func: string) => {
    const m: { [key: string]: COLORS} = {
        info: COLORS.FgCyan,
        log: COLORS.FgBlue,
        dir: COLORS.FgBlue,
        trace: COLORS.FgBlue,
        debug: COLORS.FgYellow,
        error: COLORS.FgRed,
        warn: COLORS.FgMagenta
    };

    return withColor(func, m[func] || COLORS.Reset);
};
const defaultFormatMessage: MessageFormatter = (colors, ts, name, func, ...args) => {
    return `${[ts, colors ? colorizeLogFunctionName(func) : func, `(${name})`, ...args].join(" ")}\n`;
};
const addLoggerStream = (stream: WritableStream<any>, dest: LoggerOutputStream<any>[]) => {
    // Prevent adding the same source to dest stream more than once. This was causing log duplication.
    if (dest.findIndex(src => src.origin === stream || src.output === stream) !== -1) {
        return;
    }

    const outputStream: LoggerOutputStream<any> = { output: stream };

    // Transform source stream into "objectMode" stream.
    if (!stream.objectMode) {
        // eslint-disable-next-line no-extra-parens
        const colors = (stream as typeof stream & { hasColors?: Function }).hasColors?.();

        outputStream.output = new DataStream();
        outputStream.origin = stream;

        DataStream
            .from(outputStream.output as DataStream)
            .stringify(
                (msg: [string, string, string, any[]]) => defaultFormatMessage(colors, ...msg)
            )
            .pipe(outputStream.origin);
    }

    dest.push(outputStream);
};

export const close = () => {
    loggerOutputs.out.forEach((stream: LoggerOutputStream<any>) => {
        stream.output.end();
    });
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
