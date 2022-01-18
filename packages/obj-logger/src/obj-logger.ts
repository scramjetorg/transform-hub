/* eslint-disable no-console */
import { DataStream, StringStream } from "scramjet";
import { PassThrough, Writable } from "stream";
import { IObjectLogger, LogEntry } from "@scramjet/types";
import { getName } from "./get-name";

export class ObjLogger implements IObjectLogger {
    outLogStream = new PassThrough({ objectMode: true });
    inLogStream = new PassThrough({ objectMode: true });
    inStringStream = new StringStream().JSONParse().catch((error: any) => {
        this.error("inStringStream.JSONParse() failed", error.message);
    });

    output: DataStream;

    name: string;
    baseLog: LogEntry;
    outputs: Writable[] = [];

    constructor(reference: any, baseLog: LogEntry = {}) {
        this.name = getName(reference);
        this.baseLog = baseLog;

        this.inStringStream.pipe(this.inLogStream);

        DataStream.from(this.inLogStream).map((entry: LogEntry) => {
            const a: any = { ...entry };

            a[this.name] = {
                ...this.baseLog
            };

            return a;
        }).pipe(this.outLogStream);

        this.output = new DataStream({ objectMode: true });
        this.outLogStream.pipe(this.output);
    }

    write(level: LogEntry["level"], entry: LogEntry | string, ...optionalParams: any[]) {
        if (typeof entry === "string") {
            entry = { msg: entry };
        }

        const a: any = { level, msg: entry.msg, ts: entry.ts || Date.now() };

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

    warn(entry: LogEntry | string, ...optionalParams: any[]) {
        this.write("WARN", entry, ...optionalParams);
    }

    updateBaseLog(baseLog: LogEntry) {
        this.baseLog = baseLog;
    }

    pipe(target: Writable | this, options: { stringified?: boolean } = {}): Writable {
        if (target instanceof ObjLogger) {
            target = target.inLogStream;
        }

        if (options.stringified || !target.writableObjectMode) {
            return this.output.JSONStringify().pipe(target);
        }

        return this.output.pipe(target);
    }
}

