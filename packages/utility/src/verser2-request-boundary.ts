type BoundaryStream = {
    aborted?: boolean;
    closed?: boolean;
    destroyed?: boolean;
    readableEnded?: boolean;
    writableEnded?: boolean;
    rstCode?: number;
    body?: BoundaryStream;
    bodyStream?: BoundaryStream;
    headersStarted?: boolean;
    raw?: BoundaryStream;
    stream?: BoundaryStream;
    on?: (event: string, listener: (...args: any[]) => void) => unknown;
    off?: (event: string, listener: (...args: any[]) => void) => unknown;
    removeListener?: (event: string, listener: (...args: any[]) => void) => unknown;
};

const EXPECTED_DISCONNECT_CODES = new Set(["ECONNRESET", "EPIPE", "ERR_HTTP2_STREAM_CANCEL", "NGHTTP2_CANCEL", "disconnected-target"]);

function streamIsClosed(stream: BoundaryStream | undefined): boolean {
    const directlyClosed = Boolean(
        stream?.aborted || stream?.closed || stream?.destroyed || stream?.readableEnded || stream?.writableEnded || (stream?.rstCode !== undefined && stream.rstCode !== 0)
    );
    return directlyClosed;
}

function errorCode(error: unknown): string | undefined {
    const seen = new Set<unknown>();
    const unwrap = (value: unknown): string | undefined => {
        if (!value || typeof value !== "object" || seen.has(value)) return undefined;
        seen.add(value);
        const candidate = value as { code?: string; cause?: unknown; reason?: unknown; source?: unknown; error?: unknown };
        if (EXPECTED_DISCONNECT_CODES.has(candidate.code || "")) return candidate.code;
        for (const nested of [candidate.cause, candidate.reason, candidate.source, candidate.error]) {
            const nestedCode = unwrap(nested);
            if (nestedCode) return nestedCode;
        }
        return candidate.code;
    };
    return unwrap(error);
}

export function isExpectedVerser2DisconnectError(error: unknown, request?: BoundaryStream, response?: BoundaryStream, source?: BoundaryStream, owner?: BoundaryStream): boolean {
    const code = errorCode(error);
    const nestedSource = Boolean(source && owner && source !== request && source !== response);
    const nestedOwnerClosed = nestedSource && (
        streamIsClosed(owner) ||
        (source === response?.bodyStream && streamIsClosed(request))
    );
    const responseCascadeClosed = source === response && streamIsClosed(request) && streamIsClosed(response?.bodyStream);
    const boundaryClosed = source
        ? (nestedSource ? nestedOwnerClosed : source === response ? responseCascadeClosed : streamIsClosed(source) || streamIsClosed(owner))
        : streamIsClosed(request) || streamIsClosed(response);
    return EXPECTED_DISCONNECT_CODES.has(code || "") && boundaryClosed;
}

export function handleVerser2RequestBoundary(
    request: any,
    response: any,
    dispatch: () => unknown,
    logger: any,
    fatal = (error: unknown) =>
        process.nextTick(() => {
            throw error;
        })
): unknown {
    let settled = false;
    let cascadeToken: { sources: Set<BoundaryStream>; codes: Set<string> } | undefined;
    const listeners: Array<[BoundaryStream, string, (...args: any[]) => void]> = [];

    const cleanup = () => {
        for (const [stream, event, listener] of listeners.splice(0)) {
            (stream.off || stream.removeListener)?.call(stream, event, listener);
        }
    };

    const settle = () => {
        if (settled) return false;
        settled = true;
        return true;
    };

    const addListener = (stream: BoundaryStream | undefined, event: string, listener: (...args: any[]) => void) => {
        if (!stream?.on) return;
        stream.on(event, listener);
        listeners.push([stream, event, listener]);
    };

    const complete = () => {
        if (settle()) cleanup();
    };

    const reportFatal = (error: unknown) => {
        cleanup();
        logger.error?.("Fatal Verser2 local request error", error);
        fatal(error);
    };

    const containDisconnect = (error: unknown, source?: BoundaryStream, owner?: BoundaryStream): boolean => {
        if (!source || !isExpectedVerser2DisconnectError(error, request, response, source, owner) || !settle()) return false;
        const code = errorCode(error);
        cascadeToken = {
            sources: new Set([source, owner, response, response.bodyStream].filter(Boolean)),
            codes: new Set([code].filter(Boolean) as string[])
        };
        logger.debug?.("Ignoring expected Verser2 request disconnect", error);
        try {
            if (!response.headersSent && !response.headersStarted) {
                response.statusCode = 499;
                response.end?.();
            } else {
                response.destroy?.();
            }
        } finally {
            if (source === response.bodyStream) process.nextTick(cleanup);
            else cleanup();
        }
        return true;
    };

    const onEmitterError = (error: unknown, source?: BoundaryStream, owner?: BoundaryStream) => {
        if (cascadeToken) {
            if (source && cascadeToken.sources.has(source) && cascadeToken.codes.has(errorCode(error) || "")) return;
            reportFatal(error);
            return;
        }
        if (containDisconnect(error, source, owner)) return;
        settle();
        reportFatal(error);
    };

    const onDispatchError = (error: unknown): never => {
        settle();
        reportFatal(error);
        throw error;
    };

    const addBoundaryErrorListener = (source: BoundaryStream | undefined, owner: BoundaryStream) => {
        if (!source?.on) return;
        const onError = (error: unknown) => onEmitterError(error, source, owner);
        addListener(source, "error", onError);
    };
    addBoundaryErrorListener(request, request);
    addBoundaryErrorListener(request.body, request);
    addBoundaryErrorListener(request.raw, request);
    addBoundaryErrorListener(request.stream, request);
    addBoundaryErrorListener(response, response);
    addBoundaryErrorListener(response.bodyStream, response);

    // These events mark completion, so later duplicate resets cannot affect a
    // completed request and all boundary listeners are released.
    addListener(response, "finish", complete);
    addListener(response, "close", complete);
    addListener(response, "aborted", complete);

    try {
        const result = dispatch();
        if (result && typeof (result as Promise<unknown>).then === "function") {
            return Promise.resolve(result).then((value) => {
                complete();
                return value;
            }, onDispatchError);
        }
        return result;
    } catch (error) {
        return onDispatchError(error);
    }
}

export function attachVerser2ServerStreamBoundary(
    server: any,
    logger: any,
    fatal = (error: unknown) =>
        process.nextTick(() => {
            throw error;
        })
): void {
    server.on("stream", (stream: any) => {
        let settled = false;
        const cleanup = () => {
            stream.off?.("error", onError);
            stream.off?.("close", cleanup);
        };
        const onError = (error: unknown) => {
            if (settled) return;
            if (EXPECTED_DISCONNECT_CODES.has(errorCode(error) || "")) {
                process.nextTick(() => {
                    if (settled) return;
                    if (isExpectedVerser2DisconnectError(error, undefined, undefined, stream)) {
                        settled = true;
                        logger.debug?.("Ignoring expected Verser2 server-stream disconnect", error);
                        cleanup();
                        stream.close?.();
                        return;
                    }
                    settled = true;
                    cleanup();
                    logger.error?.("Fatal Verser2 server-stream error", error);
                    fatal(error);
                });
                return;
            }
            settled = true;
            cleanup();
            logger.error?.("Fatal Verser2 server-stream error", error);
            fatal(error);
        };
        stream.on("error", onError);
        stream.once?.("close", cleanup);
    });
}
