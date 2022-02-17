/* eslint-disable no-console */
import { Command } from "commander";
import { Readable, Stream, Writable } from "stream";

/**
 * Command from commander contains obj with whole params, that user provides to the console.
 */

/**
 * Helper method to shows output in proper format provided by user.
 * If no value is provided the default will be taken.
 * Default: "pretty".
 *
 * @param {"json" | "pretty"} type get format provided by user form _program.opts.format
 * @param {any} object get object with response from Interface
 */
function display(type: "json" | "pretty" = "pretty", object: any) {
    if (type === "json") {
        console.log(JSON.stringify(object));
    } else {
        console.dir(object);
    }
}

/**
 * Displays object.
 *
 * @param _program commander options object contains user input config etc.
 * @param object returned object form
 */
export async function displayObject(_program: Command, object: any) {
    display(_program.opts().format, object);
}

/**
 * Displays stream.
 *
 * @param {Command} _program commander object.
 * @param {Promise<ResponseStream>} response Response object with stream to be displayed.
 * @param {Writable} output Output stream.
 * @returns {Promise} Promise resolving on stream finish or rejecting on error.
 */
export async function displayStream(
    _program: Command,
    response: Promise<Stream | ReadableStream<any>>,
    output: Writable = process.stdout
): Promise<void> {
    try {
        const resp = (await response) as unknown as Readable;

        resp.pipe(output);
        return new Promise((res, rej) => resp.on("finish", res).on("error", rej));
    } catch (e: any) {
        console.error((e && e.stack) || e);
        process.exitCode = e.exitCode || 1;
        return Promise.reject();
    }
}

/**
 * Displays reponse data.
 *
 * @param _program { _program } commander object
 * @param {Promise<Response|void>} response Response object with data to be displayed.
 */
export async function displayEntity(_program: Command, response: Promise<any>): Promise<void> {
    // todo: different displays depending on _program.opts().format
    const res = await response;

    if (!res) {
        return;
    }

    display(_program.opts().format, res);
}
