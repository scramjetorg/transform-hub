import { StreamInput } from "@scramjet/types";
import { IncomingMessage } from "http";
import { ServerResponse } from "node:http";
import { Readable, Writable } from "stream";
import { CeroError } from "./definitions";

export async function getObject(object: any, req: IncomingMessage): Promise<any> {
    if (typeof object === "function") {
        return await object(req);
    }

    return object;
}

export async function getWritable(object: any, req: IncomingMessage, res: ServerResponse): Promise<Writable | Object> {
    if (typeof object === "function") {
        return object(req, res);
    }

    return object;
}

export async function getStream(
    req: IncomingMessage,
    stream: StreamInput
): Promise<Readable> {
    if (!stream)
        throw new CeroError("ERR_FAILED_FETCH_DATA");
    // eslint-disable-next-line no-extra-parens
    else if (typeof (stream as Readable).readable === "boolean")
        return stream as Readable;
    else if (stream instanceof Promise)
        return getStream(req, await stream);
    else if (typeof stream === "function")
        return getStream(req, await stream(req));

    throw new CeroError("ERR_FAILED_FETCH_DATA");
}
