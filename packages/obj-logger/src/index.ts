/* eslint-disable no-console */
import { DataStream } from "scramjet";
import { PassThrough, Writable } from "stream";
import { IObjectLogger, LogEntry } from "@scramjet/types";
import { getName } from "./get-name";

export class ObjLogger implements IObjectLogger {
    outLogStream = new PassThrough({ objectMode: true });
    inLogStream = new PassThrough({ objectMode: true });

    output: DataStream;

    name: string;
    baseLog: LogEntry;

    movePropUp(obj: any, prop: string) {
        Object.keys(obj).forEach(key => {
            if (obj[key][prop]) {
                obj[prop] = obj[key][prop];
                delete obj[key][prop];
            }
        });
    }

    constructor(reference: any, baseLog: LogEntry = {}) {
        this.name = getName(reference);
        this.baseLog = baseLog;

        DataStream.from(this.inLogStream).map((entry: LogEntry) => {
            const { level, msg, ts } = { ...entry };

            const a: any = { ...entry, level, msg, ts };

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

        const a: any = { };

        a.level = level;
        a.msg = entry.msg;
        a.ts = entry.ts || Date.now();

        a[this.name] = {
            ...this.baseLog
        };

        if (optionalParams.length) {
            a.data = optionalParams;
        }

        this.outLogStream.write(a);
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

/*
class A {
    constructor() {
        const objLa = new ObjLogger(this, { id: "some-id" });

        objLa.write({ msg: "Message from Host", level: "ERROR" });
        objLa.pipe(process.stdout, { stringified: true });

        const objLb = new ObjLogger("Adapter", { id: "adapter-id" });

        objLb.write({ msg: "Error message from adapter", level: "ERROR" });
        objLb.pipe(objLa.inLogStream);

        const objLc = new ObjLogger("Runner", { id: "Runner logger" });

        objLc.write({ msg: "Message from Runner", level: "DEBUG" });
        objLc.pipe(objLb.inLogStream);
    }

    async wait() {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
/*
const a = new A();

// eslint-disable-next-line @levelscript-eslint/no-floating-promises
a.wait();
*/
