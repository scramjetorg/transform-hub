import { RouteDefinition } from "../manifest";
import { RouterDefinition } from "../router";

export type Verser2RouteRequest = {
    method: string;
    path: string;
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
    const manifest = router.collect();

    for (const route of router.definitions()) {
        const entry = manifest.routes.find(item => item.method === route.method && item.path === route.path);

        if (!entry) {
            continue;
        }

        adapter.register({
            route,
            fullPath: entry.fullPath,
            async handle() {
                return { status: 501, body: { error: "VERSER2_HANDLER_NOT_IMPLEMENTED" } };
            }
        });
    }
}
