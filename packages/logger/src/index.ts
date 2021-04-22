import { Console } from "console";
import { PassThrough } from "stream";
import { LoggerOutput, LoggerOptions, WritableStream } from "@scramjet/types";
import { getName } from "./lib/get-name";

class Logger extends Console {
    private name: string;
    /**
     * @param reference - A reference passed to logger (log4j style)
     * @param _options - Logger options
     * @param output - Output streams
     */
    constructor(reference: any, _options: LoggerOptions, { out, err }: LoggerOutput) {
        super(out, err);
        this.name = getName(reference);
    }

    debug(...args: any[]) {
        super.log(...this.formatMessage("debug", args));
    }
    error(...args: any[]) {
        super.error(...this.formatMessage("error", args));
    }
    info(...args: any[]): void {
        super.log(...this.formatMessage("info", args));
    }
    log(...args: any[]): void {
        super.log(...this.formatMessage("log", args));
    }
    warn(...args: any[]): void {
        super.error(...this.formatMessage("warn", args));
    }

    private formatMessage<Z extends any[]>(func: string, args: Z): [string, string, string, ...Z] {
        return [new Date().toISOString(), func, `(${this.name})`, ...args];
    }

    dirxml = this.log;
    groupCollapsed = this.group;
}

const loggerOut = new PassThrough();
const loggerErr = new PassThrough();

/**
 * Pipes log streams to the provided outputs in serialized format
 *
 * @param out - stream for stdout logging
 * @param err - stream for stderr logging
 */
export function addLoggerOutput(out: WritableStream<any>, err: WritableStream<any> = out) {
    loggerOut.pipe(out);
    loggerErr.pipe(err);
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
 * @param options.out - the "standard output" stream used for `log`, `debug` and `info` methods
 * @param options.err - the "standard error" stream used for `error`, `warn` and `trace` methods
 *
 * @returns a Console compatible logger
 */
export function getLogger(
    reference: any,
    options: LoggerOptions = { useCallsite: false }
): Logger {
    // TODO: return same object on the same reference
    return new Logger(reference, options, {
        out: loggerOut,
        err: loggerErr
    });
}
