import { Console } from "console";
import { getName } from "./lib/get-name";

type LoggerOptions = {
    /** Output stream */
    out: NodeJS.WritableStream;
    /** Errror stream */
    err: NodeJS.WritableStream;
    /** Should we show callsites to show originating line */
    useCallsite?: boolean;
};

class Logger extends Console {
    private name: string;
    /**
     * @param reference - A reference passed to logger (log4j style)
     */
    constructor(reference: any, { out, err }: LoggerOptions) {
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
    options: LoggerOptions = { out: process.stdout, err: process.stderr }
): Console {
    // TODO: return same object on the same reference
    return new Logger(reference, options);
}
