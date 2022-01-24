/* eslint-disable no-console */
import { DataStream, StringStream } from "scramjet";
import { PassThrough, Writable } from "stream";
import { IObjectLogger, LogEntry, LogLevel } from "@scramjet/types";
import { getName } from "./utils/get-name";

export class ObjLogger implements IObjectLogger {
    outLogStream = new PassThrough({ objectMode: true });
    inLogStream = new PassThrough({ objectMode: true });
    inStringStream = new PassThrough({ objectMode: false });

    output = new DataStream({ objectMode: true });

    name: string;
    baseLog: LogEntry;
    logLevel: LogLevel;

    outputs: Writable[] = [];

    static levels: LogLevel[] = ["FATAL", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"];

    constructor(reference: any, baseLog: LogEntry = {}, logLevel: LogLevel = "ERROR") {
        this.name = getName(reference);

        this.baseLog = baseLog;
        this.logLevel = logLevel;

        StringStream
            .from(this.inStringStream)
            .JSONParse(true)
            .pipe(this.inLogStream);

        DataStream
            .from(this.inLogStream)
            .each((entry: LogEntry) => {
                const a: any = { ...entry };

                a.from = entry.from || this.name;
                a[this.name] = {
                    ...this.baseLog
                };

                this.write(entry.level!, entry, ...entry.data || []);
            });

        this.outLogStream.pipe(this.output);
    }

    write(level: LogLevel, entry: LogEntry | string, ...optionalParams: any[]) {
        if (ObjLogger.levels.indexOf(level) <= ObjLogger.levels.indexOf(this.logLevel)) {
            //return;
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

        this.outLogStream.write(a);
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

    pipe(target: Writable | IObjectLogger, options: { stringified?: boolean } = {}): Writable {
        if (target instanceof ObjLogger) {
            target = target.inLogStream;
        }

        target = target as Writable;

        if (options.stringified || !target.writableObjectMode) {
            return this.output.JSONStringify().pipe(target);
        }

        return this.output.pipe(target);
    }
}

