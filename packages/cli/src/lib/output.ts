/* eslint-disable no-console */
import { Readable, Stream, Writable } from "stream";
import { MaybePromise } from "@scramjet/types";
import { inspect } from "util";
import { displayFormat, isJsonFormat } from "../types";

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
    try {
        const resp = await response as unknown as Readable;

        if (resp) {
            resp.pipe(output);
            return new Promise((res, rej) => resp.on("finish", res).on("error", rej));
        }

        return Promise.reject(new Error("Stream is not available"));
    } catch (e: any) {
        console.error(e && e.stack || e);
        process.exitCode = e.exitCode || 1;
        return Promise.reject();
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

export function displayError(error: Error | string) {
    const message = error instanceof Error ? error.message : error;

    console.error("\x1b[31m%s\x1b[0m", "Error:", message);
}
