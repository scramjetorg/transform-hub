import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";
import { Readable } from "stream";

export interface RoutedForwardTransportResponse {
    statusCode: number;
    headers?: Record<string, string | string[] | number | undefined>;
    body: Readable;
}

export interface RoutedForwardTransport {
    waitForRoute(domain: string, timeoutMs?: number): Promise<void>;
    request(request: {
        domain: string;
        method: string;
        path: string;
        headers?: Record<string, string>;
        body?: Readable;
        signal?: AbortSignal;
    }): Promise<RoutedForwardTransportResponse>;
}

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

export function normalizeForwardedHeaders(headers: IncomingHttpHeaders): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [name, value] of Object.entries(headers)) {
        if (value === undefined) {
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

    for (const [name, value] of Object.entries(headers || {})) {
        if (value === undefined || name.toLowerCase() === "trailer") {
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
    const cleanup = () => {
        if (cleanedUp) {
            return;
        }

        cleanedUp = true;
        res.off("close", abortRequest);
        req.off("close", abortRequest);
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

    try {
        res.once("close", abortRequest);
        req.once("close", abortRequest);
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
