import { RouteManifest, RouteManifestEntry } from "./manifest";

export type ApiClientRequest = {
    route: RouteManifestEntry;
    params?: unknown;
    query?: unknown;
    headers?: Record<string, string>;
    body?: unknown;
};

export type ApiClientResponse<T = unknown> = {
    status: number;
    headers: Record<string, string>;
    body: T;
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
