/* eslint-disable no-console */
import { Response, ResponseStream } from "@scramjet/api-client";
import { Command } from "commander";

/**
 * Command from commander contains obj with whole params, that user provides to the console.
 */

/**
 * Helper method to show output in proper format provided by user.
 * If no value is provided the default will be taken.
 * Default: "pretty"
 * @param type { string } get format provided by user form _program.opts.format
 * @param object { any } get object with response from Interface
 */
function display(type: "json" | "pretty" = "pretty", object: any) {
    switch (type) {
    case "json":
        console.log(JSON.stringify(object));
        break;
    default:
        console.dir(object);
        break;
    }
}

/**
 * Display object
 * @param _program commander options object contains user input config etc.
 * @param object returned object form
 */
export async function displayObject(_program: Command, object: any) {
    display(_program.opts().format, object);
}

/**
 * Display stream
 * @param _program commander object
 * @param request
 * @param output
 * @returns {Object} with response or error
 */
export async function displayStream(
    _program: Command,
    request: Promise<ResponseStream>,
    output = process.stdout
): Promise<void> {
    try {
        const req = await request;

        req.data?.pipe(output);
        return new Promise((res, rej) => req.data?.on("finish", res).on("error", rej));
    } catch (e: any) {
        console.error(e && e.stack || e);
        process.exitCode = e.exitCode || 1;
        return Promise.reject();
    }
}

/**
 * Display
 * @param _program { _program } commander object
 * @param request { Promise }
 */
export async function displayEntity(_program: Command, request: Promise<Response|void>): Promise<void> {
    // todo: different displays depending on _program.opts().format
    const req = await request;

    if (!req) return;
    display(_program.opts().format, req.data);
}
