import { Readable } from "stream";
import { createVerserBroker, type VerserBrokerOptions, type VerserBrokerRequest, type VerserBrokerResponse } from "@signicode/verser2-guest-node";

export class Verser2RouteUnavailableError extends Error {
    constructor(domain: string, message = `Verser2 route is unavailable: ${domain}`) {
        super(message);
        this.name = "Verser2RouteUnavailableError";
    }
}

export class Verser2DuplicateRouteError extends Error {
    constructor(domain: string) {
        super(`Verser2 route has duplicate targets: ${domain}`);
        this.name = "Verser2DuplicateRouteError";
    }
}

export type Verser2Route = {
    targetId: string;
    domain: string;
};

export type ManagerSthRoutedRequest = {
    domain: string;
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: readonly Buffer[] | Readable;
    signal?: AbortSignal;
};

export type RouteChangeEvent = {
    type: "added" | "removed" | "changed" | "degraded";
    targetId: string;
    domain: string;
    reason?: string;
};

export type RouteChangeListener = (event: RouteChangeEvent) => void;

export interface ManagerSthBrokerTransport {
    connect(): Promise<void>;
    close(reason?: string): Promise<void>;
    getRoutes(): Verser2Route[];
    isRouteReady(domain: string): boolean;
    waitForRoute(domain: string, timeoutMs?: number): Promise<void>;
    request(request: ManagerSthRoutedRequest): Promise<VerserBrokerResponse>;
    onRouteChange?(listener: RouteChangeListener): () => void;
}

export interface Verser2BrokerLike {
    connect?(): Promise<void>;
    close(reason?: string): Promise<void>;
    getRoutes(): Verser2Route[];
    request(request: VerserBrokerRequest): Promise<VerserBrokerResponse>;
    onRouteChange?(listener: (event: RouteChangeEvent) => void): () => void;
}

export class Verser2ManagerSthBrokerTransport implements ManagerSthBrokerTransport {
    private closed = false;
    private suppressedRouteSignature: string | undefined;
    private readonly routeWaiters = new Set<{
        promise: Promise<void>;
        reject: (error: Error) => void;
        timer: NodeJS.Timeout;
        timeout?: NodeJS.Timeout;
    }>();

    constructor(private readonly broker: Verser2BrokerLike) {}

    async connect(): Promise<void> {
        await this.broker.connect?.();
        this.closed = false;
    }

    async close(reason?: string): Promise<void> {
        this.suppressedRouteSignature = this.routeSignature(this.broker.getRoutes());
        this.closed = true;
        this.rejectRouteWaiters(new Verser2RouteUnavailableError("*", reason || "Verser2 broker transport closed"));
        await this.broker.close(reason);
    }

    getRoutes(): Verser2Route[] {
        if (this.closed) {
            return [];
        }

        const routes = this.broker.getRoutes();

        if (this.suppressedRouteSignature !== undefined) {
            const routeSignature = this.routeSignature(routes);

            if (routeSignature === this.suppressedRouteSignature) {
                return [];
            }

            this.suppressedRouteSignature = undefined;
        }

        return routes;
    }

    isRouteReady(domain: string): boolean {
        return this.findRoute(domain) !== undefined;
    }

    async waitForRoute(domain: string, timeoutMs?: number): Promise<void> {
        if (this.isRouteReady(domain)) {
            return;
        }

        if (this.closed) {
            throw new Verser2RouteUnavailableError(domain, `Verser2 broker transport is closed: ${domain}`);
        }

        await this.createRouteWaiter(domain, timeoutMs);
    }

    async request(request: ManagerSthRoutedRequest): Promise<VerserBrokerResponse> {
        if (request.signal?.aborted) {
            throw new Verser2RouteUnavailableError(request.domain, `Verser2 request aborted before dispatch: ${request.domain}`);
        }

        const route = this.findRoute(request.domain);

        if (!route) {
            throw new Verser2RouteUnavailableError(request.domain);
        }

        const abortBody = () => {
            if (request.body instanceof Readable) {
                request.body.destroy(new Error(`Verser2 request aborted: ${request.domain}`));
            }
        };

        request.signal?.addEventListener("abort", abortBody, { once: true });

        try {
            return await this.broker.request({
                targetId: route.targetId,
                method: request.method,
                path: request.path,
                headers: request.headers,
                body: request.body
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            throw new Verser2RouteUnavailableError(request.domain, `Verser2 request failed for route ${request.domain}: ${message}`);
        } finally {
            request.signal?.removeEventListener("abort", abortBody);
        }
    }

    private findRoute(domain: string): Verser2Route | undefined {
        const routes = this.getRoutes().filter((route) => route.domain === domain);

        if (routes.length > 1) {
            // Tolerate duplicate {domain, targetId} entries (identical route table duplication).
            const uniqueTargetIds = new Set(routes.map((r) => r.targetId));

            if (uniqueTargetIds.size > 1) {
                throw new Verser2DuplicateRouteError(domain);
            }
        }

        return routes[0];
    }

    private createRouteWaiter(domain: string, timeoutMs?: number): Promise<void> {
        let resolveWaiter!: () => void;
        let rejectWaiter!: (error: Error) => void;
        let finished = false;

        const waiter: {
            promise: Promise<void>;
            reject: (error: Error) => void;
            timer: NodeJS.Timeout;
            timeout?: NodeJS.Timeout;
        } = {
            promise: Promise.resolve() as Promise<void>,
            reject: (() => {}) as unknown as (error: Error) => void,
            timer: undefined as unknown as NodeJS.Timeout
        };

        const finish = (error?: Error) => {
            if (finished) {
                return;
            }

            finished = true;
            clearInterval(waiter.timer);

            if (waiter.timeout) {
                clearTimeout(waiter.timeout);
            }

            this.routeWaiters.delete(waiter);

            if (error) {
                rejectWaiter(error);
            } else {
                resolveWaiter();
            }
        };

        const check = () => {
            try {
                if (this.closed) {
                    finish(new Verser2RouteUnavailableError(domain, `Verser2 broker transport is closed: ${domain}`));
                } else if (this.isRouteReady(domain)) {
                    finish();
                }
            } catch (error) {
                finish(error instanceof Error ? error : new Error(String(error)));
            }
        };

        waiter.timer = setInterval(check, 10);
        waiter.reject = finish;

        waiter.promise = new Promise<void>((resolve, reject) => {
            resolveWaiter = resolve;
            rejectWaiter = reject;
        });

        if (timeoutMs !== undefined) {
            waiter.timeout = setTimeout(() => finish(new Verser2RouteUnavailableError(domain, `Timed out waiting for verser2 route: ${domain}`)), timeoutMs);
        }

        this.routeWaiters.add(waiter);
        check();

        return waiter.promise;
    }

    onRouteChange(listener: RouteChangeListener): () => void {
        if (typeof this.broker.onRouteChange === "function") {
            return this.broker.onRouteChange(listener);
        }

        return () => {};
    }

    private rejectRouteWaiters(error: Error) {
        for (const waiter of this.routeWaiters.values()) {
            waiter.promise.catch(() => undefined);
            waiter.reject(error);
        }

        this.routeWaiters.clear();
    }

    private routeSignature(routes: Verser2Route[]): string {
        return routes
            .map((route) => `${route.domain}\u0000${route.targetId}`)
            .sort()
            .join("\u0001");
    }
}

export function createManagerSthBrokerTransport(options: VerserBrokerOptions): ManagerSthBrokerTransport {
    return new Verser2ManagerSthBrokerTransport(createVerserBroker(options));
}

export function createManagerSthLocalBrokerTransport(broker: Verser2BrokerLike): ManagerSthBrokerTransport {
    return new Verser2ManagerSthBrokerTransport(broker);
}
