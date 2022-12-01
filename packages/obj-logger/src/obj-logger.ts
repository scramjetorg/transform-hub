import { DataStream, StringStream } from "scramjet";
import { IObjectLogger, LogEntry, LogLevel } from "@scramjet/types";
import { PassThrough, Readable, Writable } from "stream";
import { LogLevelStrings } from "@scramjet/utility";

import { getName } from "./utils/get-name";
import { JSONParserStream } from "./utils/streams";

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
    inputLogStream = new PassThrough({ objectMode: true }).resume();

    /**
     * Input log stream in string mode.
     */
    inputStringifiedLogStream = new PassThrough({ objectMode: true }).resume();

    /**
     * Output stream in object mode.
     */
    output = new DataStream({ objectMode: true }).resume();

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
     * Other logger sources
     */
    sources: Set<Readable | IObjectLogger> = new Set();

    /**
     * Logging levels hierarchy.
     */
    static levels: LogLevel[] = LogLevelStrings;

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

        this.inputStringifiedLogStream
            .pipe(new JSONParserStream())
            .pipe(this.inputLogStream)
            .on("data", (entry: LogEntry) => {
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

        const a: any = { ...entry, level, ts: entry.ts || Date.now() };

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
        Object.assign(this.baseLog, baseLog);
    }

    private _stringifiedOutput?: StringStream;

    get stringifiedOutput(): StringStream {
        // eslint-disable-next-line no-console
        if (!this._stringifiedOutput) this._stringifiedOutput = this.output.JSONStringify().catch((e: any) => { console.error(e); });
        return this._stringifiedOutput;
    }

    addObjectLoggerSource(source: IObjectLogger): void {
        if (this.sources.has(source)) return;

        this.sources.add(source);
        source.outputLogStream.on("data", (entry) => this.inputLogStream.write(entry));
    }

    addSerializedLoggerSource(source: Readable): void {
        if (this.sources.has(source)) return;

        this.sources.add(source);
        source.on("data", (entry) => this.inputStringifiedLogStream.write(entry));
    }

    /**
     * Pipes output logger to provided target. The target can be a writable stream
     * or an Instance of class fulfilling IObjectLogger interface.
     *
     * @param {Writable | IObjectLogger} target Target for log stream.
     * @param options Pipe options. If option `stringified` is set to true, the output will be stringified.
     * @returns {Writable} Piped stream
     */
    pipe(
        target: Writable | IObjectLogger,
        { end = false, stringified }: { end?: boolean, stringified?: boolean } = {}
    ): typeof target {
        if (target instanceof ObjLogger) {
            this.baseLog.id ||= target.baseLog.id;
            this.logLevel = target.logLevel;

            target.addObjectLoggerSource(this);
            return target;
        }

        target = target as Writable;

        if (stringified || !target.writableObjectMode)
            return this.stringifiedOutput.pipe(target, { end });

        return this.output.pipe(target, { end });
    }

    /**
     * Pipes output logger to provided target. The target can be a writable stream
     * or an instance of class fulfiling IObjectLogger interface.
     *
     * @param {Writable | IObjectLogger} target Target for log stream.
     * @param {ObjLogPipeOptions} [options] Pipe options. Should be the same as passed to @see ObjectLogger.pipe
     * @returns {Writable} Unpiped stream
     */
    unpipe(target: Writable | IObjectLogger | undefined, options: ObjLogPipeOptions = {}) {
        if (!target) {
            this.stringifiedOutput.unpipe();
            this.output.unpipe();
            return undefined;
        }

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
        if (this.ended) return;

        this.ended = true;
        this.inputStringifiedLogStream.end();
    }
}

