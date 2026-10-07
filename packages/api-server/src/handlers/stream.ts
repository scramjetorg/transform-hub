import { IDuplexStream, ParsedMessage, StreamConfig, StreamInput, StreamOutput } from "@scramjet/api-types";
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";
import { Writable, Readable } from "stream";
import { DuplexStream } from "../lib/duplex-stream";
import { getStream, getWritable } from "../lib/data-extractors";
import { CeroError, SequentialCeroRouter } from "../lib/definitions";
import { mimeAccepts } from "../lib/mime";
import { ObjLogger } from "@scramjet/obj-logger";
import { getStatusCode } from "http-status-codes";

const logger = new ObjLogger("ApiServer-stream");
let tempStderrApiRequestOrdinal = 0;

const TEMP_STDERR_SYMBOL = Symbol.for("scramjet.temp.pr1137.stderr-boundary");
const TEMP_STDERR_PREFIX = "[pr1137-stderr-boundary] ";
const TEMP_STDERR_MARKER = "TestException: This exception should appear on stderr";
const TEMP_STDERR_MARKER_BYTES = Buffer.from(TEMP_STDERR_MARKER);
const TEMP_STDERR_TAIL_BYTES = TEMP_STDERR_MARKER_BYTES.length - 1;
const TEMP_STDERR_MAX_LINE_BYTES = 4096;
const TEMP_STDERR_REASONS = ["none", "child-close", "disconnect", "connect-failed", "lease-end", "lease-close", "lease-error", "replacement", "finalize", "unhook", "reconnect", "auto-unpipe", "source-end", "source-close", "source-error", "response-finish", "response-close", "response-error", "socket-end", "socket-close", "marker-missing", "byte-budget", "input-rejected", "scenario-clear", "other-error"] as const;
const TEMP_STDERR_ERROR_CODES = ["none", "ECONNRESET", "EPIPE", "ERR_STREAM_PREMATURE_CLOSE", "ERR_STREAM_DESTROYED", "ERR_HTTP2_STREAM_CANCEL", "ERR_HTTP2_INVALID_STREAM", "ABORT_ERR", "other-error"] as const;

type TempStderrCounter = Readonly<{ bytes: number; chunks: number; markerFound: boolean; active: boolean; observedEnd: boolean; observedClose: boolean; observedError: boolean }>;
interface TempStderrView {
    readonly capture: "pr1137-stderr-boundary";
    readonly instanceId: string;
    readonly sequenceId?: string;
    readonly csiOrdinal: number;
    readonly pid: number;
    readonly counter: TempStderrCounter;
    readonly retired: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function ownDataValue(value: object, key: PropertyKey): unknown {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function isSafeIntegerAtLeast(value: unknown, minimum: number): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}

function validTempStderrView(value: unknown): value is TempStderrView {
    if (!isRecord(value) || ownDataValue(value, "capture") !== "pr1137-stderr-boundary") return false;
    const viewKeys = Reflect.ownKeys(value);
    if (viewKeys.some(key => typeof key !== "string" || !["capture", "instanceId", "sequenceId", "csiOrdinal", "pid", "counter", "retired"].includes(key)) ||
        !["capture", "instanceId", "csiOrdinal", "pid", "counter", "retired"].every(key => viewKeys.includes(key))) return false;
    const instanceId = ownDataValue(value, "instanceId");
    const sequenceId = ownDataValue(value, "sequenceId");
    const counter = ownDataValue(value, "counter");
    if (typeof instanceId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(instanceId) ||
        (sequenceId !== undefined && (typeof sequenceId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(sequenceId))) ||
        !isSafeIntegerAtLeast(ownDataValue(value, "csiOrdinal"), 1) || !isSafeIntegerAtLeast(ownDataValue(value, "pid"), 1) ||
        typeof ownDataValue(value, "retired") !== "boolean" || !isRecord(counter)) return false;
    const counterKeys = Reflect.ownKeys(counter);
    if (counterKeys.length !== 7 || counterKeys.some(key => typeof key !== "string" || !["bytes", "chunks", "markerFound", "active", "observedEnd", "observedClose", "observedError"].includes(key))) return false;
    return isSafeIntegerAtLeast(ownDataValue(counter, "bytes"), 0) && isSafeIntegerAtLeast(ownDataValue(counter, "chunks"), 0) &&
        typeof ownDataValue(counter, "markerFound") === "boolean" && typeof ownDataValue(counter, "active") === "boolean" &&
        typeof ownDataValue(counter, "observedEnd") === "boolean" && typeof ownDataValue(counter, "observedClose") === "boolean" &&
        typeof ownDataValue(counter, "observedError") === "boolean";
}

function tempStderrProcessState(): { nextSeq: number } | undefined {
    const existing = ownDataValue(process, TEMP_STDERR_SYMBOL);
    if (existing !== undefined) {
        if (!isRecord(existing) || !isSafeIntegerAtLeast(ownDataValue(existing, "nextSeq"), 1) || Reflect.ownKeys(existing).length !== 1) return;
        return existing as { nextSeq: number };
    }
    const state = { nextSeq: 1 };
    Object.defineProperty(process, TEMP_STDERR_SYMBOL, { value: state, configurable: true, enumerable: false, writable: false });
    return state;
}

function tempStderrSnapshot(stream: object): Record<string, unknown> | undefined {
    const result: Record<string, unknown> = {};
    const fields = ["readableLength", "writableLength", "readableEnded", "writableEnded", "writableFinished", "writableNeedDrain", "destroyed"] as const;
    for (const key of fields) {
        const descriptor = Object.getOwnPropertyDescriptor(stream, key);
        if (!descriptor || !("value" in descriptor)) continue;
        const value = descriptor.value;
        if ((key.endsWith("Length") && isSafeIntegerAtLeast(value, 0)) || (key === "destroyed" && typeof value === "boolean") || (key.startsWith("readable") || key.startsWith("writable")) && typeof value === "boolean") result[key] = value;
    }
    return Object.keys(result).length ? result : undefined;
}

function tempStderrErrorCode(error: unknown): typeof TEMP_STDERR_ERROR_CODES[number] {
    if (!isRecord(error)) return "other-error";
    const code = ownDataValue(error, "code");
    return (TEMP_STDERR_ERROR_CODES as readonly unknown[]).includes(code) && code !== "none" ? code as typeof TEMP_STDERR_ERROR_CODES[number] : "other-error";
}

function tempStderrReason(reason: string): typeof TEMP_STDERR_REASONS[number] {
    return (TEMP_STDERR_REASONS as readonly string[]).includes(reason) ? reason as typeof TEMP_STDERR_REASONS[number] : "other-error";
}

function attachTempStderrCapture(source: Readable, response: ServerResponse): ((reason: string) => void) | undefined {
    let view: TempStderrView;
    let sequenceState: { nextSeq: number } | undefined;
    let requestOrdinal: number;
    try {
        const candidate = ownDataValue(source, TEMP_STDERR_SYMBOL);
        if (!validTempStderrView(candidate) || candidate.retired) return;
        sequenceState = tempStderrProcessState();
        if (!sequenceState || !isSafeIntegerAtLeast(sequenceState.nextSeq, 1) || sequenceState.nextSeq === Number.MAX_SAFE_INTEGER) return;
        requestOrdinal = tempStderrApiRequestOrdinal + 1;
        if (!isSafeIntegerAtLeast(requestOrdinal, 1)) return;
        tempStderrApiRequestOrdinal = requestOrdinal;
        view = candidate;
    } catch {
        return;
    }

    let bytes = 0;
    let chunks = 0;
    let tail = Buffer.alloc(0);
    let markerFound = false;
    let active = true;
    let sourceEnd = false;
    let sourceClose = false;
    let sourceError = false;
    let sourceErrorCode: typeof TEMP_STDERR_ERROR_CODES[number] = "none";
    let terminal = false;
    let sourceRetired = false;

    const counter = (): TempStderrCounter => ({ bytes, chunks, markerFound, active, observedEnd: sourceEnd, observedClose: sourceClose, observedError: sourceError });
    const emit = (event: string, outcome: "pending" | "fulfilled" | "rejected", reason: string, errorCode: typeof TEMP_STDERR_ERROR_CODES[number] = "none") => {
        try {
            if (!sequenceState || sequenceState.nextSeq >= Number.MAX_SAFE_INTEGER) return;
            const seq = sequenceState.nextSeq;
            sequenceState.nextSeq = seq + 1;
            const record: Record<string, unknown> = {
                capture: "pr1137-stderr-boundary", level: outcome === "rejected" ? "WARN" : "DEBUG", boundary: "api-to-http", event,
                pid: process.pid, seq, wallMs: Date.now(), monoMs: Number(process.hrtime.bigint()) / 1e6,
                instanceId: view.instanceId, csiOrdinal: view.csiOrdinal, apiRequestOrdinal: requestOrdinal,
                outcome, reason: tempStderrReason(reason), errorCode,
                counter: counter(), upstreamCounter: {
                    bytes: view.counter.bytes, chunks: view.counter.chunks, markerFound: view.counter.markerFound,
                    active: view.counter.active, observedEnd: view.counter.observedEnd, observedClose: view.counter.observedClose,
                    observedError: view.counter.observedError
                }
            };
            if (view.sequenceId !== undefined) record.sequenceId = view.sequenceId;
            const sourceState = tempStderrSnapshot(source);
            const targetState = tempStderrSnapshot(response);
            if (sourceState) record.source = sourceState;
            if (targetState) record.target = targetState;
            if (Number.isSafeInteger(response.statusCode) && response.statusCode >= 100 && response.statusCode <= 599) record.statusCode = response.statusCode;
            const line = `${TEMP_STDERR_PREFIX}${JSON.stringify(record)}\n`;
            if (Buffer.byteLength(line, "utf8") <= TEMP_STDERR_MAX_LINE_BYTES) console.error(line.slice(0, -1));
        } catch {
            // Diagnostics must not affect stream delivery or existing error handling.
        }
    };
    const removeSourceObservers = () => {
        source.off("data", onData);
        source.off("end", onEnd);
        source.off("close", onClose);
        source.off("unpipe", onUnpipe);
        active = false;
        tail = Buffer.alloc(0);
    };
    const retireSource = (reason: string) => {
        if (sourceRetired) return;
        sourceRetired = true;
        try {
            // Read only Node's public Readable.errored state; never add a source error listener.
            const sourceErrored = (source as Readable & { errored?: unknown }).errored;
            if (sourceErrored !== null && sourceErrored !== undefined) {
                sourceError = true;
                sourceErrorCode = tempStderrErrorCode(sourceErrored);
            }
        } catch {
            // Unavailable public error state leaves source completion unknown.
        }
        active = false;
        const outcome = sourceError ? "rejected" : sourceEnd ? "fulfilled" : "pending";
        emit("http-retired", outcome, reason, sourceError ? sourceErrorCode : "none");
        removeSourceObservers();
    };
    const removeTerminalObservers = () => {
        response.off("finish", onResponseFinish);
        response.off("close", onResponseClose);
        response.off("error", onResponseError);
    };
    const settleTerminal = (event: string, outcome: "fulfilled" | "pending" | "rejected", reason: string, errorCode?: typeof TEMP_STDERR_ERROR_CODES[number]) => {
        if (terminal) return;
        terminal = true;
        if (event === "response-close" && response.writableFinished) return removeTerminalObservers();
        emit(event, outcome, reason, errorCode);
        removeTerminalObservers();
    };
    const onData = (chunk: Buffer | string) => {
        try {
            const incoming = Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(chunk, "utf8");
            const combined = tail.length ? Buffer.concat([tail, incoming]) : incoming;
            if (!markerFound && combined.indexOf(TEMP_STDERR_MARKER_BYTES) !== -1) markerFound = true;
            bytes += incoming.length;
            chunks++;
            tail = Buffer.from(combined.subarray(Math.max(0, combined.length - TEMP_STDERR_TAIL_BYTES)));
        } catch {
            // A failed observation is intentionally invisible to the product stream.
        }
    };
    const onEnd = () => { sourceEnd = true; emit("source-end", "fulfilled", "source-end"); retireSource("source-end"); };
    const onClose = () => { sourceClose = true; emit("source-close", sourceEnd ? "fulfilled" : "pending", "source-close"); retireSource("source-close"); };
    const onUnpipe = (destination: unknown) => { if (destination === response) retireSource("auto-unpipe"); };
    const onResponseFinish = () => { settleTerminal("response-finish", "fulfilled", "response-finish"); retireSource("response-finish"); };
    const onResponseClose = () => { settleTerminal("response-close", "pending", "response-close"); };
    const onResponseError = (error: unknown) => { settleTerminal("response-error", "rejected", "response-error", tempStderrErrorCode(error)); };

    source.on("data", onData);
    source.on("end", onEnd);
    source.on("close", onClose);
    source.on("unpipe", onUnpipe);
    response.on("finish", onResponseFinish);
    response.on("close", onResponseClose);
    response.on("error", onResponseError);
    emit("http-attached", "pending", "none");
    return (reason: string) => retireSource(reason);
}

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
            res.writeHead(200);
            res.flushHeaders();

            // Error handling on disconnect!
            let retireCapture: ((reason: string) => void) | undefined;
            const disconnect = (reason: string) => {
                // Existing error boundary is preserved; the observer itself never handles source errors.
                retireCapture?.(reason);
                out.unpipe(res);
            };

            res
                .on("error", () => disconnect("response-error"))
                .on("unpipe", () => disconnect("auto-unpipe"));

            res.socket?.on("end", () => disconnect("socket-end"));
            res.socket?.on("close", () => disconnect("socket-close"));
            res.once("close", () => disconnect("response-close"));

            const result = out.pipe(res);
            retireCapture = attachTempStderrCapture(out, res);
            return result;
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

                if (data && typeof (data as Writable).writable !== "undefined") {
                    if (end) {
                        res.writeHead(200, "OK");
                    } else {
                        res.writeHead(202, "Accepted");
                    }

                    res.flushHeaders();

                    await new Promise<void>((resolve, reject) => {
                        let requestEnded = false;
                        let writableFinalized = false;
                        let settled = false;
                        const cleanup = () => {
                            req.unpipe(data as Writable);
                            req.off("error", onRequestError);
                            req.off("end", onRequestEnd);
                            (data as Writable).off("error", onWritableError);
                            (data as Writable).off("close", onWritableClose);
                            (data as Writable).off("finish", onWritableFinish);
                        };
                        const finish = (error?: Error) => {
                            if (settled) return;
                            settled = true;
                            cleanup();
                            if (error) reject(error);
                            else resolve();
                        };
                        const onRequestError = () => {
                            logger.error("Downstream request error.");
                            finish(new CeroError("DOWNSTREAM_REQUEST_ERROR"));
                        };
                        const onRequestEnd = () => {
                            requestEnded = true;
                            logger.debug("Downstream request end.");
                            if (!end || writableFinalized) finish();
                        };
                        const abortDownstream = () => {
                            req.destroy();
                            // Let the router's error path own the response. Ending it
                            // here causes a second response when next() handles the error.
                            finish(new CeroError("DOWNSTREAM_REQUEST_ERROR"));
                        };
                        const onWritableError = () => {
                            if (!writableFinalized) abortDownstream();
                        };
                        const onWritableClose = () => {
                            if (!writableFinalized) abortDownstream();
                        };
                        const onWritableFinish = () => {
                            writableFinalized = true;
                            if (requestEnded) finish();
                        };

                        if (encoding) {
                            req.setEncoding(encoding);
                            (data as Writable).setDefaultEncoding(encoding);
                        }

                        req
                            .once("error", onRequestError)
                            .once("end", onRequestEnd);
                        (data as Writable)
                            .once("error", onWritableError)
                            .once("close", onWritableClose)
                            .once("finish", onWritableFinish);

                        req
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
        callback: (stream: IDuplexStream, headers: IncomingHttpHeaders) => void,
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
