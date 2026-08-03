import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";
import { Readable } from "stream";
import type { RoutedForwardResponse, RoutedForwardTransport } from "@scramjet/api-router";

export type RoutedForwardTransportResponse = RoutedForwardResponse;
export type { RoutedForwardTransport };

export interface RoutedForwardOptions {
    transport: RoutedForwardTransport;
    domain: string;
    req: IncomingMessage;
    res: ServerResponse;
    path: string;
    headers?: Record<string, string>;
    routeReadinessMs?: number;
    requestTimeoutMs?: number;
    onError?: (error: unknown) => void;
}

function hopByHopHeaderSet(headers: IncomingHttpHeaders | Record<string, string | string[] | number | undefined>): Set<string> {
    const hopByHopHeaders = new Set([
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade"
    ]);
    const connectionEntry = Object.entries(headers).find(([name]) => name.toLowerCase() === "connection");
    const connection = connectionEntry?.[1];
    const connectionValues = Array.isArray(connection) ? connection.join(",") : connection;

    for (const value of String(connectionValues || "").split(",")) {
        const header = value.trim().toLowerCase();

        if (header) {
            hopByHopHeaders.add(header);
        }
    }

    return hopByHopHeaders;
}

export function normalizeForwardedHeaders(headers: IncomingHttpHeaders): Record<string, string> {
    const normalized: Record<string, string> = {};
    const hopByHopHeaders = hopByHopHeaderSet(headers);

    for (const [name, value] of Object.entries(headers)) {
        if (value === undefined || hopByHopHeaders.has(name.toLowerCase())) {
            continue;
        }

        normalized[name] = Array.isArray(value) ? value.join(", ") : value;
    }

    return normalized;
}

function isUnsupportedRequest(req: IncomingMessage): boolean {
    const method = (req.method || "GET").toUpperCase();
    const connection = String(req.headers.connection || "").toLowerCase();

    return method === "CONNECT" || req.headers.upgrade !== undefined || connection.split(",").map(value => value.trim()).includes("upgrade");
}

function normalizeResponseHeaders(headers: RoutedForwardTransportResponse["headers"]): Record<string, string | string[] | number> {
    const normalized: Record<string, string | string[] | number> = {};
    const hopByHopHeaders = hopByHopHeaderSet(headers || {});

    for (const [name, value] of Object.entries(headers || {})) {
        if (value === undefined || hopByHopHeaders.has(name.toLowerCase())) {
            continue;
        }

        normalized[name] = value;
    }

    return normalized;
}

export async function forwardRoutedRequest({
    transport,
    domain,
    req,
    res,
    path,
    headers = normalizeForwardedHeaders(req.headers),
    routeReadinessMs,
    requestTimeoutMs,
    onError
}: RoutedForwardOptions): Promise<void> {
    if (isUnsupportedRequest(req)) {
        res.writeHead(501);
        res.end();
        return;
    }

    const abortController = new AbortController();
    const requestTimeout = requestTimeoutMs && requestTimeoutMs > 0
        ? setTimeout(() => abortController.abort(), requestTimeoutMs)
        : undefined;
    let responseBody: Readable | undefined;
    const throwIfAborted = () => {
        if (abortController.signal.aborted) {
            throw new Error("Routed forward request aborted");
        }
    };
    const abortPromise = new Promise<never>((_, reject) => {
        abortController.signal.addEventListener("abort", () => reject(new Error("Routed forward request aborted")), { once: true });
    });
    let cleanedUp = false;
    let removeCloseListeners: () => void = () => undefined;

    const cleanup = () => {
        if (cleanedUp) {
            return;
        }

        cleanedUp = true;
        removeCloseListeners();
        if (requestTimeout) clearTimeout(requestTimeout);
    };

    const abortRequest = () => {
        if (res.writableEnded || res.writableFinished) {
            return;
        }

        abortController.abort();
        responseBody?.destroy();
        cleanup();
    };

    const abortOnRequestClose = () => {
        if (req.complete || req.readableEnded) {
            return;
        }

        abortRequest();
    };

    removeCloseListeners = () => {
        res.off("close", abortRequest);
        req.off("close", abortOnRequestClose);
    };

    try {
        res.once("close", abortRequest);
        req.once("close", abortOnRequestClose);
        await Promise.race([transport.waitForRoute(domain, routeReadinessMs), abortPromise]);
        throwIfAborted();

        const routedRequest = transport.request({
            domain,
            method: req.method || "GET",
            path,
            headers,
            body: req,
            signal: abortController.signal
        }).then(response => {
            if (abortController.signal.aborted) {
                response.body.destroy();
            }

            throwIfAborted();
            return response;
        });
        const response = await Promise.race([routedRequest, abortPromise]);

        throwIfAborted();

        if (requestTimeout) clearTimeout(requestTimeout);

        if (response.statusCode >= 100 && response.statusCode < 200) {
            response.body.destroy();
            throw new Error(`Unsupported routed informational response status: ${response.statusCode}`);
        }

        responseBody = response.body;
        responseBody.once("end", cleanup);
        res.once("finish", cleanup);
        responseBody.once("error", (error) => {
            if (!res.writableEnded && !res.writableFinished) {
                res.destroy(error);
            }
            abortRequest();
        });

        res.writeHead(response.statusCode, normalizeResponseHeaders(response.headers));
        res.flushHeaders();
        responseBody.pipe(res);
    } catch (error) {
        onError?.(error);

        if (!res.headersSent) {
            res.writeHead(503);
        }

        res.end();
        cleanup();
    } finally {
        if (requestTimeout && !responseBody) {
            clearTimeout(requestTimeout);
        }
    }
}
