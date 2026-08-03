import { finished } from "stream/promises";
import { Readable, Stream, Transform, Writable } from "stream";
import { MaybePromise } from "@scramjet/runtime-types";
import { inspect } from "util";
import { displayFormat, isJsonFormat } from "../types";
import { ApiCommandError } from "./apiCommandError";

/**
 * Displays object.
 *
 * @param object returned object form
 * @param format format of displayed data: pretty|json
 */
export function displayObject(object: any, format: displayFormat) {
    if (isJsonFormat(format)) {
        console.log(JSON.stringify(object));
    } else {
        console.dir(object, { depth: null });
    }
}

/**
 * Displays stream.
 *
 * @param {Promise<ResponseStream>} response Response object with stream to be displayed.
 * @param {Writable} output Output stream.
 * @returns {Promise} Promise resolving on stream finish or rejecting on error.
 */
export async function displayStream(
    response: Stream | ReadableStream<any> | Promise<Stream | ReadableStream<any>>,
    output: Writable = process.stdout
): Promise<void> {
    const resp = await response as unknown as Readable & { cleanup?: () => Promise<void> };

    if (!resp) {
        throw new Error("Stream is not available");
    }

    let terminalError: Error | undefined;
    const closeSource = () => {
        const error = terminalError || new ApiCommandError("CANCELLED", 60, "Output stream closed");
        terminalError ||= error;
        if (!resp.destroyed) resp.destroy(error);
    };
    const rememberError = (error: Error) => { terminalError ||= error; };
    output.once("close", closeSource);
    resp.once("error", rememberError);
    try {
        resp.pipe(output, { end: false });
        await finished(resp);
    } finally {
        resp.unpipe(output);
        output.removeListener("close", closeSource);
        resp.removeListener("error", rememberError);
        await resp.cleanup?.();
    }
}

/** Render newline-delimited log records without changing the underlying request stream. */
export function displayLogStream(
    response: Stream | ReadableStream<any> | Promise<Stream | ReadableStream<any>>,
    format: "pretty" | "json" | "raw" | undefined
): Promise<void> {
    if (format && !["pretty", "json", "raw"].includes(format)) throw new Error("--log-format must be pretty, json, or raw");
    if (!format || format === "raw") return displayStream(response);

    let remainder = "";
    const renderer = new Transform({
        transform(chunk, _encoding, callback) {
            remainder += chunk.toString();
            const lines = remainder.split(/\r?\n/);
            remainder = lines.pop() || "";
            for (const line of lines) this.push(renderLogRecord(line, format));
            callback();
        },
        flush(callback) {
            if (remainder) this.push(renderLogRecord(remainder, format));
            callback();
        }
    });
    return displayStream(Promise.resolve(response).then(stream => {
        const source = stream as Readable & { cleanup?: () => Promise<void> };
        const rendered = source.pipe(renderer) as Transform & { cleanup?: () => Promise<void> };
        // pipe() does not propagate source errors to a Transform.  Preserve the
        // original error so errorHandler can retain its ApiCommandError exit code.
        const forwardSourceError = (error: Error) => {
            if (!rendered.destroyed) rendered.destroy(error);
        };
        source.on("error", forwardSourceError);
        let cleanupResult: Promise<void> | undefined;
        rendered.cleanup = () => cleanupResult ||= (async () => {
            source.unpipe(rendered);
            source.removeListener("error", forwardSourceError);
            if (!source.destroyed && !source.readableEnded) source.destroy();
            await source.cleanup?.();
        })();
        return rendered;
    }));
}

function renderLogRecord(line: string, format: "pretty" | "json") {
    try {
        const record = JSON.parse(line);
        return format === "json" ? `${JSON.stringify(record)}\n` : `${inspect(record, { depth: null, colors: false })}\n`;
    } catch {
        return `${line}\n`;
    }
}

/**
 * Displays response data.
 *
 * @param response Response object with data to be displayed.
 * @param format format of displayed data: pretty|json
 */
export async function displayEntity(response: MaybePromise<any>, format: displayFormat): Promise<void> {
    // todo: different displays depending on _program.opts().format
    const res = await Promise.resolve(response).catch((e: any) => {
        throw e;
    });

    if (!res) {
        return;
    }

    displayObject(res, format);
}

export function displayMessage(message: string, ...args: any[]): void {
    console.error(message);
    for (const a of args) {
        console.error(">", inspect(a));
    }
}

export function displayError(error: Error | string, showStack: boolean = false) {
    if (error instanceof Error) {
        if (error.message)
            console.error("\x1b[31m%s\x1b[0m", "Error:", error.message);
        if (showStack && error.stack)
            console.error(error.stack);
    } else
        console.error("\x1b[31m%s\x1b[0m", "Error:", error);
}
