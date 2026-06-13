import type { Readable } from "stream";
import {
    createVerserBroker,
    type VerserBroker,
    type VerserBrokerOptions,
    type VerserBrokerResponse,
} from "@signicode/verser2-guest-node";

export class Verser2RouteUnavailableError extends Error {
    constructor(domain: string, message = `Verser2 route is unavailable: ${domain}`) {
        super(message);
        this.name = "Verser2RouteUnavailableError";
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
};

export interface ManagerSthBrokerTransport {
    connect(): Promise<void>;
    close(reason?: string): Promise<void>;
    getRoutes(): Verser2Route[];
    isRouteReady(domain: string): boolean;
    waitForRoute(domain: string, timeoutMs?: number): Promise<void>;
    request(request: ManagerSthRoutedRequest): Promise<VerserBrokerResponse>;
}

export class Verser2ManagerSthBrokerTransport implements ManagerSthBrokerTransport {
    constructor(private readonly broker: VerserBroker) {}

    connect(): Promise<void> {
        return this.broker.connect();
    }

    close(reason?: string): Promise<void> {
        return this.broker.close(reason);
    }

    getRoutes(): Verser2Route[] {
        return this.broker.getRoutes();
    }

    isRouteReady(domain: string): boolean {
        return this.findRoute(domain) !== undefined;
    }

    async waitForRoute(domain: string, timeoutMs?: number): Promise<void> {
        if (this.isRouteReady(domain)) {
            return;
        }

        const routeWait = this.broker.waitForRoute(domain);

        if (timeoutMs === undefined) {
            await routeWait;
            return;
        }

        let timeout: NodeJS.Timeout | undefined;

        try {
            await Promise.race([
                routeWait,
                new Promise<void>((_resolve, reject) => {
                    timeout = setTimeout(() => reject(new Verser2RouteUnavailableError(
                        domain,
                        `Timed out waiting for verser2 route: ${domain}`
                    )), timeoutMs);
                }),
            ]);
        } finally {
            if (timeout) {
                clearTimeout(timeout);
            }
        }
    }

    async request(request: ManagerSthRoutedRequest): Promise<VerserBrokerResponse> {
        const route = this.findRoute(request.domain);

        if (!route) {
            throw new Verser2RouteUnavailableError(request.domain);
        }

        return this.broker.request({
            targetId: route.targetId,
            method: request.method,
            path: request.path,
            headers: request.headers,
            body: request.body,
        });
    }

    private findRoute(domain: string): Verser2Route | undefined {
        return this.broker.getRoutes().find(route => route.domain === domain);
    }
}

export function createManagerSthBrokerTransport(options: VerserBrokerOptions): ManagerSthBrokerTransport {
    return new Verser2ManagerSthBrokerTransport(createVerserBroker(options));
}
