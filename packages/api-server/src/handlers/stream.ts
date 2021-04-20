import { ServerResponse } from "http";
import { Readable } from "stream";
import { mimeAccepts } from "../lib/mime";
import { CeroError, SequentialCeroRouter } from "../lib/definitions";
import { getStream, getWritable } from "../lib/data-extractors";
import { StreamConfig, StreamInput, StreamOutput } from "@scramjet/types";

function checkAccepts(acc: string|undefined, text: boolean, json: boolean) {
    const types = [];

    if (text && json)
        types.push("text/x-ndjson", "application/x-ndjson");
    else if (json)
        types.push("application/x-ndjson");
    else if (text)
        types.push("text/plain");
    else
        types.push("application/octet-stream");

    return mimeAccepts(acc, types);
}

export function createStreamHandlers(router: SequentialCeroRouter) {
    const decorator = (
        data: Readable,
        type: string,
        encoding: BufferEncoding,
        res: ServerResponse
    ) => {
        try {
            const out = data;
            const cType = type.startsWith("text/")
                ? `${type}; charset=${encoding}`
                : type;

            // TODO: I don't think this is necessary
            // if (data.readableObjectMode) {
            //     out = data.pipe(new PassThrough({
            //         writableObjectMode: true
            //     }));
            // }
            out.setEncoding(encoding);

            res.setHeader("content-type", cType);
            res.setHeader("transfer-encoding", "chunked");

            res.writeHead(200);

            // Error handling on disconnect!
            const disconnect = () => out.unpipe(res);

            res
                .on("error", disconnect)
                .on("unpipe", disconnect)
            ;

            return out.pipe(res);
        } catch (e) {
            throw new CeroError("ERR_FAILED_TO_SERIALIZE", e);
        }
    };
    const upstream = (
        path: string|RegExp,
        stream: StreamInput,
        { json = false, text = false, encoding = "utf-8" }: StreamConfig = {}
    ): void => {
        router.get(path, async (req, res, next) => {
            try {
                const type = checkAccepts(req.headers.accept, text, json);
                const data = await getStream(req, stream);

                return decorator(data, type, encoding, res);
            } catch (e) {
                return next(new CeroError("ERR_FAILED_FETCH_DATA", e));
            }

        });
    };
    const downstream = (
        path: string|RegExp,
        stream: StreamOutput,
        { json = false, text = false, end = false, encoding = "utf-8" }: StreamConfig = {}
    ): void => {
        router.post(path, async (req, res, next) => {
            try {
                checkAccepts(req.headers["content-type"], text, json);

                if (req.headers.expect === "100-continue") {
                    res.writeContinue();
                }

                const data = await getWritable(stream, req);

                await new Promise((resolve) => {
                    if (encoding) req.setEncoding(encoding);
                    req.pipe(data, { end });
                    req.on("end", resolve);
                });
                if (end) {
                    await new Promise(resolve => data.once("finish", resolve));
                }
                res.writeHead(202, "Accepted");
                res.end();
            } catch (e) {
                next(new CeroError("ERR_INTERNAL_ERROR", e));
            }
        });
    };

    return {
        upstream,
        downstream
    };
}
