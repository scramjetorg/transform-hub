import { StreamConfig, StreamInput, StreamOutput } from "@scramjet/types";
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";
import { Writable, Readable, Duplex } from "stream";
import { DuplexStream } from "../lib/duplex-stream";
import { getStream, getWritable } from "../lib/data-extractors";
import { CeroError, SequentialCeroRouter } from "../lib/definitions";
import { mimeAccepts } from "../lib/mime";

function checkAccepts(acc: string | undefined, text: boolean, json: boolean) {
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

function checkEndHeader(req: IncomingMessage, _default?: boolean) {
    if (typeof req.headers["x-end-stream"] === "string" && ["true", "false", "success"].includes(req.headers["x-end-stream"])) {
        return req.headers["x-end-stream"] === "true";
    }
    return _default;
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

            out.setEncoding(encoding);

            res.setHeader("content-type", cType);
            res.setHeader("transfer-encoding", "chunked");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.writeHead(200);

            // Error handling on disconnect!
            const disconnect = () => out.unpipe(res);

            res
                .on("error", disconnect)
                .on("unpipe", disconnect);

            return out.pipe(res);
        } catch (e: any) {
            throw new CeroError("ERR_FAILED_TO_SERIALIZE", e);
        }
    };
    const upstream = (
        path: string | RegExp,
        stream: StreamInput,
        { json = false, text = false, encoding = "utf-8" }: StreamConfig = {}
    ): void => {
        router.get(path, async (req, res, next) => {
            try {
                const type = checkAccepts(req.headers.accept, text, json);
                const data = await getStream(req, res, stream);

                return decorator(data, type, encoding, res);
            } catch (e: any) {
                return next(new CeroError("ERR_FAILED_FETCH_DATA", e));
            }
        });
    };
    const downstream = (
        path: string | RegExp,
        stream: StreamOutput,
        { json = false, text = false, end: _end = false, encoding = "utf-8", checkContentType = true }: StreamConfig = {}
    ): void => {
        router.post(path, async (req, res, next) => {
            try {
                if (checkContentType) {
                    checkAccepts(req.headers["content-type"], text, json);
                }

                if (req.headers.expect === "100-continue") res.writeContinue();

                const end = checkEndHeader(req, _end);
                const data = await getWritable(stream, req, res);

                // eslint-disable-next-line no-extra-parens
                if (typeof (data as Writable).writable !== "undefined") {
                    await new Promise<void>((resolve, reject) => {
                        if (encoding) {
                            req.setEncoding(encoding);
                        }

                        if (data) {
                            req.pipe(data as Writable, { end });
                            // eslint-disable-next-line no-extra-parens
                            (data as Writable).once("error", reject);
                        } else {
                            resolve();
                        }

                        req.once("end", resolve);
                    });
                } else {
                    let status = 202;

                    // eslint-disable-next-line no-extra-parens
                    if ((data as any).opStatus) {
                        // eslint-disable-next-line no-extra-parens
                        status = (data as any).opStatus;
                        // eslint-disable-next-line no-extra-parens
                        delete (data as any).opStatus;
                    }

                    res.writeHead(status, { "Content-type": "application/json" });
                    res.end(JSON.stringify(data));

                    return;
                }

                if (end) {
                    res.writeHead(200, "OK");
                } else {
                    res.writeHead(202, "Accepted");
                }

                res.end();
            } catch (e: any) {
                // eslint-disable-next-line no-console
                console.error(e);
                next(new CeroError("ERR_INTERNAL_ERROR", e));
            }
        });
    };
    const duplex = (
        path: string | RegExp,
        callback: (stream: Duplex, headers: IncomingHttpHeaders) => void
    ): void => {
        router.post(path, (req, res, next) => {
            if (req.headers.expect === "100-continue") {
                res.writeContinue();
            }

            try {
                const d = new DuplexStream({}, req, res);

                callback(d, req.headers);
            } catch (e: any) {
                return next(new CeroError("ERR_FAILED_FETCH_DATA", e));
            }

            return undefined;
        });
    };

    return {
        downstream,
        duplex,
        upstream
    };
}
