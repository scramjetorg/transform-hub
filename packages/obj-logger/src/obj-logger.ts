import { DataStream, StringStream } from "scramjet";
import { IObjectLogger, LogEntry, LogLevel } from "@scramjet/types";
import { PassThrough, Writable } from "stream";

import { getName } from "./utils/get-name";

type ObjLogPipeOptions = {
    stringified?: boolean;
};

export class ObjLogger implements IObjectLogger {
    /**
     * Identifies if you can still write messages.
     */
    ended: boolean = false;

    /**
     * @type {PassThrough} Stream used to write logs.
     */
    outputLogStream = new PassThrough({ objectMode: true });

    /**
     * Input log stream in object mode.
     */
    inputLogStream = new PassThrough({ objectMode: true });

    /**
     * Input log stream in string mode.
     */
    inputStringifiedLogStream = new PassThrough({ objectMode: true });;

    /**
     * Output stream in object mode.
     */
    output = new DataStream({ objectMode: true });

    /**
     * Name used to indicate the source of the log.
     */
    name: string;

    /**
     * Default log object.
     */
    baseLog: LogEntry;

    /**
     * Log level.
     */
    logLevel: LogLevel;

    /**
     * Additional output streams.
     */
    outputs: Writable[] = [];

    /**
     * Logging levels hierarchy.
     */
    static levels: LogLevel[] = ["FATAL", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"];

    /**
     *
     * @param {any} reference Used to obtain a name for the logger.
     * @param {LogEntry} baseLog Default log object.
     * @param {LogLevel} logLevel Log level.
     */
    constructor(reference: any, baseLog: LogEntry = {}, logLevel: LogLevel = "TRACE") {
        this.name = getName(reference);

        this.baseLog = baseLog;
        this.logLevel = logLevel;

        StringStream.from(this.inputStringifiedLogStream)
            .JSONParse(true)
            .catch((e: any) => {
                this.error("Error parsing incoming log", e.chunk);
            })
            .pipe(this.inputLogStream);

        DataStream
            .from(this.inputLogStream)
            .each((entry: LogEntry) => {
                const a: any = { ...entry };

                a.from = entry.from || this.name;
                a[this.name] = {
                    ...this.baseLog
                };

                this.write(entry.level!, entry, ...entry.data || []);
            });

        this.outputLogStream.pipe(this.output);
    }

    write(level: LogLevel, entry: LogEntry | string, ...optionalParams: any[]) {
        if (this.ended)
            throw new Error("Cannot write to the stream anymore.");

        if (ObjLogger.levels.indexOf(level) > ObjLogger.levels.indexOf(this.logLevel)) {
            return;
        }

        if (typeof entry === "string") {
            entry = { msg: entry };
        }

        const a: any = { level, msg: entry.msg, ts: entry.ts || Date.now() };

        a.from = entry.from || this.name;

        a[this.name] = {
            ...this.baseLog
        };

        if (optionalParams.length) {
            a.data = optionalParams;
        }

        this.outputs.forEach(output => {
            if (output.writableObjectMode) {
                output.write(a);
            } else {
                output.write(JSON.stringify(a) + "\n");
            }
        });

        this.outputLogStream.write(a);
    }

    addOutput(output: Writable) {
        this.outputs.push(output);
    }

    trace(entry: LogEntry | string, ...optionalParams: any[]) {
        this.write("TRACE", entry, ...optionalParams);
    }

    info(entry: LogEntry | string, ...optionalParams: any[]) {
        this.write("INFO", entry, ...optionalParams);
    }

    error(entry: LogEntry | string, ...optionalParams: any[]) {
        this.write("ERROR", entry, ...optionalParams);
    }

    debug(entry: LogEntry | string, ...optionalParams: any[]) {
        this.write("DEBUG", entry, ...optionalParams);
    }

    fatal(entry: LogEntry | string, ...optionalParams: any[]) {
        this.write("FATAL", entry, ...optionalParams);
    }

    warn(entry: LogEntry | string, ...optionalParams: any[]) {
        this.write("WARN", entry, ...optionalParams);
    }

    updateBaseLog(baseLog: LogEntry) {
        this.baseLog = baseLog;
    }

    private _stringifiedOutput?: StringStream;
    get stringifiedOutput(): StringStream {
        if (!this._stringifiedOutput) this._stringifiedOutput = this.output.JSONStringify();
        return this._stringifiedOutput;
    }

    /**
     * Pipes output logger to provided target. The target can be a writable stream
     * or an Instance of class fulfilling IObjectLogger interface.
     *
     * @param {Writable | IObjectLogger} target Target for log stream.
     * @param options Pipe options. If option `stringified` is set to true, the output will be stringified.
     * @returns {Writable} Piped stream
     */
    pipe(target: Writable | IObjectLogger, options: { stringified?: boolean } = {}): Writable {
        if (target instanceof ObjLogger) {
            this.logLevel = target.logLevel;

            target = target.inputLogStream;
        }

        target = target as Writable;

        if (options.stringified || !target.writableObjectMode) {
            return this.stringifiedOutput.pipe(target);
        }

        return this.output.pipe(target);
    }

    /**
     * Pipes output logger to provided target. The target can be a writable stream
     * or an instance of class fulfiling IObjectLogger interface.
     *
     * @param {Writable | IObjectLogger} target Target for log stream.
     * @param options Pipe options. Should be the same as passed to @see ObjectLogger.pipe
     * @returns {Writable} Unpiped stream
     */
    unpipe(target: Writable | IObjectLogger | undefined, options: ObjLogPipeOptions = {}) {
        if (target instanceof ObjLogger) {
            this.logLevel = target.logLevel;

            target = target.inputLogStream;
        }

        target = target as Writable;

        if (options.stringified || !target.writableObjectMode) {
            return this.stringifiedOutput.unpipe(target);
        }

        return this.output.unpipe(target);
    }

    end() {
        this.ended = true;

        this.inputStringifiedLogStream.unpipe();
        this.outputLogStream.end();
    }
}

