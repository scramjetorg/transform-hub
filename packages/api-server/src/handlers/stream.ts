import { ParsedMessage, StreamConfig, StreamInput, StreamOutput } from "@scramjet/types";
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";
import { Writable, Readable, Duplex } from "stream";
import { DuplexStream } from "../lib/duplex-stream";
import { getStream, getWritable } from "../lib/data-extractors";
import { CeroError, SequentialCeroRouter } from "../lib/definitions";
import { mimeAccepts } from "../lib/mime";
import { ObjLogger } from "@scramjet/obj-logger";
import { getStatusCode } from "http-status-codes";

const logger = new ObjLogger("ApiServer-stream");

/**
 * Checks if given mime types are acceptable for given parameters.
 *
 * @param {string|undefined} acc Accepted mime types.
 * @param {boolean} text Indicates if text is expected as an output.
 * @param {boolean} json Indicates if json is expected as an output.
 * @returns True if mime types are acceptable.
 */
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

/**
 * Checks if x-stream-end is set to true.
 *
 * @param {IncomingMessage} req Request object.
 * @param {boolean} _default Value to be returned if x-end-stream header is not present.
 * @returns True if x-end-stream header is present or a given value.
 */
function shouldEndTargetStream(req: IncomingMessage, _default?: boolean) {
    if (typeof req.headers["x-end-stream"] === "string" && ["true", "false", "success"].includes(req.headers["x-end-stream"])) {
        return req.headers["x-end-stream"] === "true";
    }

    return _default;
}

/**
 * Creates methods to handle stream specific requests.
 *
 * @param {SequentialCeroRouter} router Router to create handlers for.
 * @returns Object with handlers.
 */
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

            logger.debug("encoding, cType, readableEncoding", encoding, cType, data.readableEncoding);

            res.setHeader("content-type", cType);
            res.setHeader("transfer-encoding", "chunked");
            res.writeHead(200);
            res.flushHeaders();

            // Error handling on disconnect!
            const disconnect = () => out.unpipe(res);

            res
                .on("error", disconnect)
                .on("unpipe", disconnect)
                .socket?.on("end", disconnect).on("close", disconnect);

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
        { json = false, text = false, end: _end = false, encoding = "utf-8", checkContentType = true, checkEndHeader = true, method = "post", postponeContinue = false }: StreamConfig = {}
    ): void => {
        // eslint-disable-next-line complexity
        router[method](path, async (req: ParsedMessage, res, next) => {
            try {
                if (checkContentType) {
                    checkAccepts(req.headers["content-type"], text, json);
                }

                if (req.headers.expect === "100-continue") {
                    if (!postponeContinue) {
                        res.writeContinue();
                    }
                } else {
                    req.writeContinue = () => {};
                }

                // Explicit pause causes next `on('data')` not to resume stream automatically.
                req.pause();

                const end = checkEndHeader ? shouldEndTargetStream(req, _end) : _end;
                const data = await getWritable(stream, req, res);

                // eslint-disable-next-line no-extra-parens
                if (data && typeof (data as Writable).writable !== "undefined") {
                    if (end) {
                        res.writeHead(200, "OK");
                    } else {
                        res.writeHead(202, "Accepted");
                    }

                    res.flushHeaders();

                    await new Promise<void>((resolve, reject) => {
                        if (encoding) {
                            req.setEncoding(encoding);
                            (data as Writable).setDefaultEncoding(encoding);
                        }

                        req
                            .on("error", reject)
                            .on("error", () => {
                                logger.error("Downstream request error.");
                                reject();
                            })
                            .on("end", () => {
                                logger.debug("Downstream request end.");
                                resolve();
                            })
                            .pipe(data as Writable, { end });

                        logger.debug("Request data piped");
                    });

                    res.end();
                } else {
                    let status = 202;

                    if ((data as any).opStatus) {
                        status = getStatusCode((data as any).opStatus);
                        delete (data as any).opStatus;
                    }

                    res.writeHead(status, { "Content-type": "application/json" });
                    res.end(JSON.stringify(data));

                    return;
                }
            } catch (e: any) {
                logger.error(e);
                next(new CeroError("ERR_INTERNAL_ERROR", e));
            }
        });
    };
    const duplex = (
        path: string | RegExp,
        callback: (stream: Duplex, headers: IncomingHttpHeaders) => void,
        { postponeContinue = false }: StreamConfig = {}
    ): void => {
        router.post(path, (req, res, next) => {
            if (req.headers.expect === "100-continue") {
                if (!postponeContinue) {
                    res.writeContinue();
                }
            }

            try {
                const d = new DuplexStream({}, req, res);

                callback(d, req.headers);
            } catch (e: any) {
                logger.error("Duplex error", e.error);
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
