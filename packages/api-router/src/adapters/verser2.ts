import { RouteDefinition } from "../manifest";
import { RouterDefinition } from "../router";
import { executeRouteDefinition } from "./http";

export type Verser2RouteRequest = {
    method: string;
    path: string;
    params?: Record<string, string>;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    body?: unknown;
};

export type Verser2RouteResponse = {
    status: number;
    headers?: Record<string, string>;
    body?: unknown;
};

export type Verser2RouteRegistration = {
    route: RouteDefinition;
    fullPath: string;
    handle(request: Verser2RouteRequest): Promise<Verser2RouteResponse>;
};

export type Verser2RouteAdapter = {
    register(registration: Verser2RouteRegistration): void;
};

export function registerVerser2Routes(adapter: Verser2RouteAdapter, router: RouterDefinition): void {
    router.collect();

    for (const { route, entry } of router.collectedRoutes()) {
        adapter.register({
            route,
            fullPath: entry.fullPath,
            async handle(request) {
                return {
                    status: 200,
                    body: await executeRouteDefinition(route, request)
                };
            }
        });
    }
}
