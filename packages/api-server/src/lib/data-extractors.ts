import { ParsedMessage, StreamInput } from "@scramjet/types";
import { ServerResponse, IncomingMessage } from "http";
import { Readable, Writable } from "stream";
import { CeroError } from "./definitions";

/**
 * Returns result of the function call if object is a function or the object itself.
 *
 * @param {any} object Object.
 * @param {IncomingMessage} req Request.
 * @returns {Promise<any>} Promise resolving to the result of the function call or to the object itself.
 */
export async function getObject(object: any, req: IncomingMessage): Promise<any> {
    if (typeof object === "function") {
        return object(req);
    }

    return object;
}

// @TODO: Refactor.
/**
 * Returns result of the function call if object is a function or the object itself.
 *
 * @param {any} object Object.
 * @param {IncomingMessage} req Request.
 * @param {ServerResponse} res Response.
 * @returns {Promise<any>} Promise resolving to the result of the function call or to the object itself.
 */
export async function getWritable(object: any, req: IncomingMessage, res: ServerResponse): Promise<Writable | Object> {
    if (typeof object === "function") {
        return object(req, res);
    }

    return object;
}

/**
 * Returns readable stream from given object. If object is a function it will be called and it should return a stream.
 *
 * @param req Request object.
 * @param res Response object.
 * @param stream Object to identify.
 * @returns Readable if object is a stream or results of function call if object is a function.
 */
export async function getStream(
    req: ParsedMessage,
    res: ServerResponse,
    stream: StreamInput
): Promise<Readable> {
    if (!stream)
        throw new CeroError("ERR_FAILED_FETCH_DATA");
    // eslint-disable-next-line no-extra-parens
    else if (typeof (stream as Readable).readable === "boolean")
        return stream as Readable;
    else if (stream instanceof Promise)
        return getStream(req, res, await stream);
    else if (typeof stream === "function")
        return getStream(req, res, await stream(req, res));

    throw new CeroError("ERR_FAILED_FETCH_DATA");
}
