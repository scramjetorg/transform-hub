import { ApiClientRequest, ApiClientResponse, ApiClientTransport } from "./client";
import { parseRoutedBrokerRedirect, RoutedBrokerCancelledError, RoutedBrokerDuplicateRouteError, RoutedBrokerRedirectError, RoutedBrokerRequestError, RoutedBrokerResponse, RoutedBrokerResponseLimitError, RoutedBrokerRouteUnavailableError, RoutedBrokerTimeoutError, RoutedBrokerTransport, waitForRoutedBrokerDomain } from "./routed-broker";
import { Readable } from "stream";

export type FetchLike = (url: string, init: {
    method: string;
    headers?: Record<string, string>;
    body?: any;
}) => Promise<{
    status: number;
    headers: { forEach(callback: (value: string, key: string) => void): void };
    json(): Promise<unknown>;
    text(): Promise<string>;
}>;

function materializePath(path: string, params: unknown): string {
    if (!params || typeof params !== "object") {
        return path;
    }

    return Object.entries(params as Record<string, string>).reduce(
        (current, [key, value]) => current.replace(`:${key}`, encodeURIComponent(String(value))),
        path
    );
}

function appendQuery(url: string, query: unknown): string {
    if (!query || typeof query !== "object") {
        return url;
    }

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
        if (value !== undefined) {
            params.set(key, String(value));
        }
    }

    const text = params.toString();

    return text ? `${url}?${text}` : url;
}

function appendRepeatedQuery(url: string, query: unknown): string {
    if (!query || typeof query !== "object") {
        return url;
    }

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
        if (value !== undefined) {
            if (Array.isArray(value)) {
                for (const item of value) params.append(key, String(item));
            } else {
                params.set(key, String(value));
            }
        }
    }

    const text = params.toString();

    return text ? `${url}?${text}` : url;
}

function minimumTimeout(...values: Array<number | undefined>): number | undefined {
    const finite = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
    return finite.length ? Math.min(...finite) : undefined;
}

function collectHeaders(headers: { forEach(callback: (value: string, key: string) => void): void }): Record<string, string> {
    const result: Record<string, string> = {};

    headers.forEach((value, key) => {
        result[key] = value;
    });

    return result;
}

export function createHttpClientTransport({ baseUrl, fetch }: { baseUrl: string; fetch: FetchLike }): ApiClientTransport {
    return {
        async request<T = unknown>(request: ApiClientRequest): Promise<ApiClientResponse<T>> {
            const path = materializePath(request.route.fullPath, request.params);
            const url = appendQuery(`${baseUrl.replace(/\/$/, "")}${path}`, request.query);
            const response = await fetch(url, {
                method: request.route.method.toUpperCase(),
                headers: request.headers,
                body: request.body === undefined ? undefined : JSON.stringify(request.body)
            });
            const text = await response.text();

            return {
                status: response.status,
                headers: collectHeaders(response.headers),
                body: (text ? JSON.parse(text) : undefined) as T
            };
        }
    };
}

export type Verser2BrokerLike = {
    request<T = unknown>(request: ApiClientRequest): Promise<ApiClientResponse<T>>;
};

export type Verser2ClientTransportOptions = {
    transport: RoutedBrokerTransport;
    routeDomain: string;
    routeReadinessMs?: number;
    requestTimeoutMs?: number;
    responseBodyLimitBytes?: number;
};

export type ManagedVerser2ClientTransport = ApiClientTransport & { close(): Promise<void> };

function isRoutedTransport(value: Verser2BrokerLike | Verser2ClientTransportOptions): value is Verser2ClientTransportOptions {
    return "transport" in value;
}

function normalizeHeaders(headers: RoutedBrokerResponse["headers"] | undefined): Record<string, string> {
    if (!headers) return {};
    return Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), Array.isArray(value) ? value.join(", ") : value]));
}

function responseCleanup(response: RoutedBrokerResponse, signals: Array<AbortSignal | undefined>, requestBody: unknown, abortBroker: () => void, release: () => void): () => Promise<void> {
    let cleanupPromise: Promise<void> | undefined;
    const cleanup = (): Promise<void> => {
        if (!cleanupPromise) {
            cleanupPromise = Promise.resolve().then(() => response.cleanup());
            cleanupPromise.finally(() => {
                signals.forEach(signal => signal?.removeEventListener("abort", abort));
                release();
            }).catch(() => {});
        }
        return cleanupPromise;
    };
    const autoCleanup = () => { void cleanup().catch(() => {}); };
    const abort = () => {
        abortBroker();
        if (requestBody instanceof Readable && !requestBody.destroyed) requestBody.destroy();
        if (!response.body.destroyed) response.body.destroy();
    };
    response.body.once("end", autoCleanup);
    response.body.once("close", autoCleanup);
    response.body.once("error", autoCleanup);
    signals.forEach(signal => signal?.addEventListener("abort", abort, { once: true }));
    if (signals.some(signal => signal?.aborted)) abort();
    if (response.body.readableEnded || response.body.destroyed) autoCleanup();
    return cleanup;
}

function awaitCleanupOrInterruption(cleanup: Promise<void>, dispatch: BrokerDispatch, routeDomain: string): Promise<void> {
    const interruption = () => dispatch.timeoutError() || new RoutedBrokerCancelledError(routeDomain);
    if (dispatch.signal.aborted) return Promise.reject(interruption());
    return new Promise((resolve, reject) => {
        const abort = () => reject(interruption());
        dispatch.signal.addEventListener("abort", abort, { once: true });
        cleanup.then(
            () => {
                dispatch.signal.removeEventListener("abort", abort);
                resolve();
            },
            error => {
                dispatch.signal.removeEventListener("abort", abort);
                reject(error);
            }
        );
    });
}

type BrokerDispatch = { response: RoutedBrokerResponse; signal: AbortSignal; abort(): void; release(): void; timeoutError(): RoutedBrokerTimeoutError | undefined };

async function readUnaryBody(body: Readable, headers: Record<string, string>, limitBytes: number, interruptionError: () => RoutedBrokerTimeoutError | RoutedBrokerCancelledError | undefined): Promise<unknown> {
    const chunks: Buffer[] = [];
    let size = 0;
    try {
        for await (const chunk of body) {
            const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += bytes.length;
            if (size > limitBytes) {
                body.destroy();
                throw new RoutedBrokerResponseLimitError(limitBytes);
            }
            chunks.push(bytes);
        }
    } catch (error) {
        const interruption = interruptionError();
        if (interruption) throw interruption;
        throw error;
    }
    const interruption = interruptionError();
    if (interruption) throw interruption;
    const bytes = Buffer.concat(chunks);
    if (!bytes.length) return undefined;
    const contentType = headers["content-type"]?.toLowerCase() || "";
    if (!contentType.includes("json")) return contentType.startsWith("text/") || !contentType ? bytes.toString() : bytes;
    try {
        return JSON.parse(bytes.toString());
    } catch (error) {
        throw new RoutedBrokerRequestError("Broker response JSON parsing failed", error);
    }
}

async function requestWithTimeout(transport: RoutedBrokerTransport, request: Parameters<RoutedBrokerTransport["request"]>[0], onLateResponse: (response: RoutedBrokerResponse) => void, onSettlement: (settlement: Promise<void>) => void): Promise<BrokerDispatch> {
    if (request.signal?.aborted) throw new RoutedBrokerCancelledError(request.routeDomain);
    const controller = new AbortController();
    let timedOut = false;
    let discardLateResponse = false;
    let rejectAbort: ((error: Error) => void) | undefined;
    const abort = () => {
        controller.abort();
        discardLateResponse = true;
        if (!timedOut) rejectAbort?.(new RoutedBrokerCancelledError(request.routeDomain));
    };
    request.signal?.addEventListener("abort", abort, { once: true });
    const signal = controller.signal;
    const timeoutMs = request.timeoutMs;
    let timer: NodeJS.Timeout | undefined;
    let handoff = false;
    const release = () => {
        request.signal?.removeEventListener("abort", abort);
        if (timer) clearTimeout(timer);
    };

    try {
        const response = transport.request({ ...request, signal });
        onSettlement(response.then(() => {}, () => {}));
        response.then(late => {
            if (discardLateResponse) {
                onLateResponse(late);
            }
        }, () => {});
        const cancelled = new Promise<never>((_, reject) => { rejectAbort = reject; });
        void cancelled.catch(() => {});
        if (!timeoutMs) {
            const result = await Promise.race([response, cancelled]);
            if (discardLateResponse) {
                onLateResponse(result);
                throw new RoutedBrokerCancelledError(request.routeDomain);
            }
            handoff = true;
            return { response: result, signal, abort: () => controller.abort(), release, timeoutError: () => undefined };
        }
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                timedOut = true;
                discardLateResponse = true;
                controller.abort();
                reject(new RoutedBrokerTimeoutError(timeoutMs, request.routeDomain));
            }, timeoutMs);
        });

        const result = await Promise.race([response, timeout, cancelled]);
        if (discardLateResponse) {
            onLateResponse(result);
            throw timedOut ? new RoutedBrokerTimeoutError(timeoutMs, request.routeDomain) : new RoutedBrokerCancelledError(request.routeDomain);
        }
        handoff = true;
        return { response: result, signal, abort: () => controller.abort(), release, timeoutError: () => timedOut ? new RoutedBrokerTimeoutError(timeoutMs, request.routeDomain) : undefined };
    } catch (error) {
        if (timedOut) throw new RoutedBrokerTimeoutError(timeoutMs || 0, request.routeDomain);
        if (request.signal?.aborted) throw new RoutedBrokerCancelledError(request.routeDomain);
        throw error;
    } finally {
        if (!handoff) release();
    }
}

export function createVerser2ClientTransport(options: Verser2ClientTransportOptions): ManagedVerser2ClientTransport;
/** @deprecated Use a RoutedBrokerTransport with an explicit route domain. */
export function createVerser2ClientTransport(broker: Verser2BrokerLike): ApiClientTransport;
export function createVerser2ClientTransport(options: Verser2BrokerLike | Verser2ClientTransportOptions): ApiClientTransport | ManagedVerser2ClientTransport {
    if (!isRoutedTransport(options)) {
        return { request: request => options.request(request) };
    }

    const lateCleanups = new Set<Promise<void>>();
    const lateResponses = new WeakSet<RoutedBrokerResponse>();
    const settlements = new Set<Promise<void>>();
    const activeResponses = new Set<{ body: Readable; abort: () => void; cleanup: () => Promise<void> }>();
    const ownSettlement = (settlement: Promise<void>) => {
        settlements.add(settlement);
        void settlement.finally(() => settlements.delete(settlement));
    };
    const ownLateCleanup = (response: RoutedBrokerResponse) => {
        if (lateResponses.has(response)) return;
        lateResponses.add(response);
        if (!response.body.destroyed) response.body.destroy();
        const cleanup = Promise.resolve(response.cleanup());
        ownCleanup(cleanup);
    };
    const ownCleanup = (cleanup: Promise<void>) => {
        lateCleanups.add(cleanup);
        void cleanup.catch(() => {}).finally(() => lateCleanups.delete(cleanup));
    };
    return {
        async request<T = unknown>(request: ApiClientRequest): Promise<ApiClientResponse<T>> {
            if (request.signal?.aborted) throw new RoutedBrokerCancelledError(options.routeDomain);
            const timeoutMs = request.timeoutMs ?? options.requestTimeoutMs;
            const deadline = timeoutMs && timeoutMs > 0 ? Date.now() + timeoutMs : undefined;
            const remaining = () => {
                if (!deadline) return undefined;
                const value = deadline - Date.now();
                if (value <= 0) throw new RoutedBrokerTimeoutError(timeoutMs as number, routeDomain);
                return value;
            };
            const disposeRedirect = async (current: BrokerDispatch, abortRequest: boolean) => {
                if (abortRequest) current.abort();
                if (request.body instanceof Readable && !request.body.destroyed) request.body.destroy();
                if (!current.response.body.destroyed) current.response.body.destroy();
                let timeout: NodeJS.Timeout | undefined;
                let abort: (() => void) | undefined;
                try {
                    const cleanup = current.response.cleanup();
                    ownCleanup(cleanup);
                    const cancelled = new Promise<never>((_, reject) => {
                        abort = () => {
                            current.abort();
                            reject(new RoutedBrokerCancelledError(routeDomain));
                        };
                        request.signal?.addEventListener("abort", abort, { once: true });
                    });
                    const timedOut = deadline ? new Promise<never>((_, reject) => {
                        timeout = setTimeout(() => {
                            current.abort();
                            reject(new RoutedBrokerTimeoutError(timeoutMs as number, routeDomain));
                        }, Math.max(0, deadline - Date.now()));
                    }) : undefined;
                    await Promise.race([cleanup, cancelled, ...(timedOut ? [timedOut] : [])]);
                } finally {
                    if (timeout) clearTimeout(timeout);
                    if (abort) request.signal?.removeEventListener("abort", abort);
                    current.release();
                }
            };
            let routeDomain = options.routeDomain;
            let path = appendRepeatedQuery(materializePath(request.route.fullPath, request.params), request.query);
            try {
                await waitForRoutedBrokerDomain(options.transport, routeDomain, minimumTimeout(options.routeReadinessMs, remaining()), request.signal);
            } catch (error) {
                if (request.signal?.aborted) throw new RoutedBrokerCancelledError(routeDomain);
                try { remaining(); } catch (timeout) { throw timeout; }
                if (error instanceof RoutedBrokerCancelledError || error instanceof RoutedBrokerTimeoutError || error instanceof RoutedBrokerRequestError || error instanceof RoutedBrokerRouteUnavailableError || error instanceof RoutedBrokerDuplicateRouteError) throw error;
                throw new RoutedBrokerRequestError(`Broker route readiness failed for ${routeDomain}: ${error instanceof Error ? error.message : String(error)}`, error);
            }
            let dispatch: BrokerDispatch;
            try {
                for (let redirects = 0; ; redirects++) {
                    dispatch = await requestWithTimeout(options.transport, {
                        routeDomain,
                        method: request.route.method.toUpperCase(),
                        path,
                        headers: request.headers,
                        body: request.body,
                        timeoutMs: remaining(),
                        signal: request.signal
                    }, ownLateCleanup, ownSettlement);
                    let redirect;
                    try {
                        redirect = parseRoutedBrokerRedirect(dispatch.response);
                    } catch (error) {
                        await disposeRedirect(dispatch, true).catch(() => {});
                        throw error;
                    }
                    if (!redirect) break;
                    if (request.body instanceof Readable) {
                        await disposeRedirect(dispatch, true).catch(() => {});
                        throw new RoutedBrokerRedirectError("Cannot follow routed redirect with a non-replayable readable request body");
                    }
                    if (redirects >= 4) {
                        await disposeRedirect(dispatch, true).catch(() => {});
                        throw new RoutedBrokerRedirectError("Too many routed redirects");
                    }
                    await disposeRedirect(dispatch, false);
                    if (request.signal?.aborted) throw new RoutedBrokerCancelledError(routeDomain);
                    routeDomain = redirect.routeDomain;
                    path = redirect.targetPath;
                    await waitForRoutedBrokerDomain(options.transport, routeDomain, minimumTimeout(options.routeReadinessMs, remaining()), request.signal);
                }
            } catch (error) {
                if (error instanceof RoutedBrokerTimeoutError || error instanceof RoutedBrokerRequestError || error instanceof RoutedBrokerCancelledError || error instanceof RoutedBrokerRedirectError) throw error;
                throw new RoutedBrokerRequestError(`Broker request failed for route ${options.routeDomain}: ${error instanceof Error ? error.message : String(error)}`, error);
            }

            const response = dispatch.response;
            const headers = normalizeHeaders(response.headers);
            const cleanup = responseCleanup(response, [request.signal, dispatch.signal], request.body, dispatch.abort, dispatch.release);
            if (request.route.kind === "upstream" || request.route.kind === "duplex") {
                const active = { body: response.body, abort: dispatch.abort, cleanup: undefined as unknown as () => Promise<void> };
                const remove = () => activeResponses.delete(active);
                const trackedCleanup = async () => {
                    try { return await cleanup(); } finally { remove(); }
                };
                active.cleanup = trackedCleanup;
                activeResponses.add(active);
                const complete = () => { void trackedCleanup().catch(() => {}); };
                response.body.once("end", complete);
                response.body.once("error", complete);
                response.body.once("close", complete);
                // The request deadline protects route readiness and response
                // headers. Stream owners manage their post-handoff lifetime;
                // retaining this timer would destroy a healthy active stream
                // with an unclassified transport error.
                dispatch.release();
                return { status: response.status, headers, body: response.body as unknown as T, cleanup: trackedCleanup, statusText: (response as any).statusText, headerPairs: (response as any).headerPairs };
            }
            try {
                const body = await readUnaryBody(response.body, headers, options.responseBodyLimitBytes ?? 1024 * 1024, () => dispatch.timeoutError() || (dispatch.signal.aborted ? new RoutedBrokerCancelledError(routeDomain) : undefined));
                await awaitCleanupOrInterruption(cleanup(), dispatch, routeDomain);
                return { status: response.status, headers, body: body as T, cleanup };
            } catch (error) {
                const pendingCleanup = cleanup();
                if (error instanceof RoutedBrokerTimeoutError || error instanceof RoutedBrokerCancelledError) {
                    ownCleanup(pendingCleanup);
                    throw error;
                }
                try {
                    await awaitCleanupOrInterruption(pendingCleanup, dispatch, routeDomain);
                } catch (cleanupError) {
                    if (cleanupError instanceof RoutedBrokerTimeoutError || cleanupError instanceof RoutedBrokerCancelledError) {
                        ownCleanup(pendingCleanup);
                        throw cleanupError;
                    }
                }
                throw error;
            }
        },
        async close() {
            const activeCleanups = [...activeResponses].map(async active => {
                active.abort();
                if (!active.body.destroyed) active.body.destroy();
                await active.cleanup();
            });
            let closeError: unknown;
            let closeFailed = false;
            try {
                await options.transport.close?.();
            } catch (error) {
                closeFailed = true;
                closeError = error;
            }
            await Promise.allSettled(activeCleanups);
            if (closeFailed) {
                while (lateCleanups.size) {
                    await Promise.allSettled([...lateCleanups]);
                }
                throw closeError;
            }
            while (settlements.size || lateCleanups.size) {
                await Promise.allSettled([...settlements, ...lateCleanups]);
            }
        }
    };
}
