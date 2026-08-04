import { Readable } from "stream";

export type RoutedBrokerRoute = {
    domain: string;
    targetId: string;
};

export type RoutedBrokerRequest = {
    routeDomain: string;
    method: string;
    path: string;
    query?: Record<string, string | string[]>;
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs?: number;
    signal?: AbortSignal;
};

export type RoutedBrokerResponse = {
    status: number;
    headers: Record<string, string | string[]>;
    body: Readable;
    cleanup(): Promise<void>;
};

/** Transport-neutral contract used by both manifest-backed and raw broker callers. */
export interface RoutedBrokerTransport {
    getRoutes(): readonly RoutedBrokerRoute[];
    isRouteReady?(domain: string): boolean;
    waitForRoute(domain: string, timeoutMs?: number, signal?: AbortSignal): Promise<void>;
    request(request: RoutedBrokerRequest): Promise<RoutedBrokerResponse>;
    close?(): Promise<void>;
}

/** HTTP-forwarding view of the neutral routed transport, shared with api-server. */
export type RoutedForwardRequest = {
    domain: string;
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: Readable;
    signal?: AbortSignal;
};
export type RoutedForwardResponse = {
    statusCode: number;
    headers?: Record<string, string | string[] | number | undefined>;
    body: Readable;
};
export interface RoutedForwardTransport {
    waitForRoute(domain: string, timeoutMs?: number): Promise<void>;
    request(request: RoutedForwardRequest): Promise<RoutedForwardResponse>;
}

export class RoutedBrokerRouteUnavailableError extends Error {
    constructor(readonly domain: string, message = `Broker route is unavailable: ${domain}`) {
        super(message);
        this.name = "RoutedBrokerRouteUnavailableError";
    }
}

export class RoutedBrokerDuplicateRouteError extends Error {
    constructor(readonly domain: string) {
        super(`Broker route has duplicate targets: ${domain}`);
        this.name = "RoutedBrokerDuplicateRouteError";
    }
}

export class RoutedBrokerTimeoutError extends Error {
    constructor(readonly timeoutMs: number, readonly domain: string) {
        super(`Broker request timed out after ${timeoutMs}ms for route: ${domain}`);
        this.name = "RoutedBrokerTimeoutError";
    }
}

export class RoutedBrokerRequestError extends Error {
    constructor(message: string, readonly cause: Error | undefined) {
        super(message);
        this.name = "RoutedBrokerRequestError";
    }
}

export class RoutedBrokerCancelledError extends Error {
    constructor(readonly domain: string) {
        super(`Broker request cancelled for route: ${domain}`);
        this.name = "RoutedBrokerCancelledError";
    }
}

export class RoutedBrokerResponseLimitError extends Error {
    constructor(readonly limitBytes: number) {
        super(`Broker response exceeded ${limitBytes} byte limit`);
        this.name = "RoutedBrokerResponseLimitError";
    }
}

export class RoutedBrokerRedirectError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RoutedBrokerRedirectError";
    }
}

export type RoutedBrokerRedirect = { routeDomain: string; targetPath: string };

/** Parses the existing HTTP resolver redirect protocol without depending on api-server. */
export function parseRoutedBrokerRedirect(response: Pick<RoutedBrokerResponse, "status" | "headers">): RoutedBrokerRedirect | undefined {
    if (response.status !== 308) return undefined;
    const header = (name: string): string => {
        const matches = Object.entries(response.headers).filter(([key]) => key.toLowerCase() === name);
        if (matches.length !== 1 || Array.isArray(matches[0][1])) {
            throw new RoutedBrokerRedirectError(`Invalid routed redirect ${name} header`);
        }
        const value = matches[0][1];
        if (typeof value !== "string" || !value.trim()) {
            throw new RoutedBrokerRedirectError(`Missing routed redirect ${name} header`);
        }
        return value;
    };
    const decision = header("x-scramjet-route-decision");
    const routeDomain = header("x-scramjet-route-domain");
    const targetPath = header("x-scramjet-route-target-path");
    if (decision !== "redirect" && decision !== "follow") throw new RoutedBrokerRedirectError("Invalid routed redirect decision");
    if (!targetPath.startsWith("/") || targetPath.startsWith("//") || targetPath.includes("://") || targetPath.includes("\\")) {
        throw new RoutedBrokerRedirectError("Invalid routed redirect target path");
    }
    return { routeDomain, targetPath };
}

export function resolveRoutedBrokerDomain(transport: RoutedBrokerTransport, domain: string): RoutedBrokerRoute | undefined {
    if (!domain) {
        throw new RoutedBrokerRouteUnavailableError(domain, "Broker route domain is required");
    }

    const routes = transport.getRoutes().filter(route => route.domain === domain);
    if (routes.length > 1) {
        throw new RoutedBrokerDuplicateRouteError(domain);
    }
    return routes[0];
}

export function assertRoutedBrokerDomain(transport: RoutedBrokerTransport, domain: string): RoutedBrokerRoute {
    const route = resolveRoutedBrokerDomain(transport, domain);
    if (!route) throw new RoutedBrokerRouteUnavailableError(domain);
    return route;
}

export async function waitForRoutedBrokerDomain(transport: RoutedBrokerTransport, domain: string, timeoutMs?: number, signal?: AbortSignal): Promise<RoutedBrokerRoute> {
    if (signal?.aborted) throw new RoutedBrokerCancelledError(domain);
    const route = resolveRoutedBrokerDomain(transport, domain);

    if (route && transport.isRouteReady?.(domain)) {
        return route;
    }

    await new Promise<void>((resolve, reject) => {
        const abort = () => reject(new RoutedBrokerCancelledError(domain));
        signal?.addEventListener("abort", abort, { once: true });
        transport.waitForRoute(domain, timeoutMs, signal).then(resolve, reject).finally(() => signal?.removeEventListener("abort", abort));
    });
    return assertRoutedBrokerDomain(transport, domain);
}
