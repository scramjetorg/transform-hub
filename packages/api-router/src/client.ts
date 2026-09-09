import { RouteManifest, RouteManifestEntry } from "./manifest";

export type ApiClientRequest = {
    route: RouteManifestEntry;
    params?: unknown;
    query?: unknown;
    headers?: Record<string, string>;
    body?: unknown;
    /** Bypass transport-level JSON encoding/decoding for an opaque request. */
    raw?: boolean;
    timeoutMs?: number;
    signal?: AbortSignal;
};

export type ApiClientResponse<T = unknown> = {
    status: number;
    /** Native broker status text and duplicate header ordering when available. */
    statusText?: string;
    headers: Record<string, string>;
    headerPairs?: readonly [string, string][];
    body: T;
    /** Idempotent awaited response-resource cleanup when supplied by the transport. */
    cleanup?: () => Promise<void>;
};

export type ApiClientTransport = {
    request<T = unknown>(request: ApiClientRequest): Promise<ApiClientResponse<T>>;
};

export type ApiClient = {
    request<T = unknown>(routeId: string, request?: Omit<ApiClientRequest, "route">): Promise<ApiClientResponse<T>>;
};

export class UnknownRouteError extends Error {
    constructor(routeId: string) {
        super(`Unknown API route: ${routeId}`);
    }
}

export function createApiClient(manifest: RouteManifest, transport: ApiClientTransport): ApiClient {
    const routes = new Map(manifest.routes.map(route => [route.id, route]));

    return {
        async request<T = unknown>(id: string, request: Omit<ApiClientRequest, "route"> = {}) {
            const route = routes.get(id);

            if (!route) {
                throw new UnknownRouteError(id);
            }

            return transport.request<T>({
                ...request,
                route
            });
        }
    };
}
