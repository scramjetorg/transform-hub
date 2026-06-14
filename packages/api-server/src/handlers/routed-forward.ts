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
        await Promise.race([transport.waitForRoute(domain, routeReadinessMs), abortPromise]);
        throwIfAborted();

        const response = await Promise.race([transport.request({
            domain,
            method: req.method || "GET",
            path,
            headers,
            body: req,
            signal: abortController.signal
        }), abortPromise]);
        throwIfAborted();

        responseBody = response.body;
        responseBody.once("end", cleanup);
        res.once("finish", cleanup);
        responseBody.once("error", (error) => {
            if (!res.writableEnded && !res.writableFinished) {
                res.destroy(error);
            }
            abortRequest();
        });

        res.writeHead(response.statusCode, response.headers || {});
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
