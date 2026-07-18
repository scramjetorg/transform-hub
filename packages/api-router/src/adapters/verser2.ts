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

function operationStatus(status: unknown): number {
    switch (status) {
        case "OK":
        case "Accepted":
            return status === "Accepted" ? 202 : 200;
        case "Bad Request":
            return 400;
        case "Not Found":
            return 404;
        case "Conflict":
            return 409;
        case "Unsupported Media Type":
            return 415;
        case "Service Unavailable":
            return 503;
        case "Gone":
            return 410;
        default:
            return 500;
    }
}

function errorStatus(error: unknown): number {
    const code = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;

    if (code === "TOPIC_NOT_FOUND") return 404;
    if (code === "TOPIC_CONTENT_TYPE_MISMATCH") return 409;
    return 500;
}

async function executeVerser2Route(route: RouteDefinition, request: Verser2RouteRequest): Promise<Verser2RouteResponse> {
    let body: unknown;

    try {
        body = await executeRouteDefinition(route, request);
    } catch (error) {
        return {
            status: errorStatus(error),
            body: { error: { code: (error as { code?: string }).code || "INTERNAL_ERROR", message: error instanceof Error ? error.message : String(error) } }
        };
    }

    if (!body || typeof body !== "object" || !("opStatus" in body)) {
        return { status: 200, body };
    }

    const responseBody = { ...(body as Record<string, unknown>) };
    const status = operationStatus(responseBody.opStatus);
    delete responseBody.opStatus;

    return { status, body: responseBody };
}

export function registerVerser2Routes(adapter: Verser2RouteAdapter, router: RouterDefinition): void {
    router.collect();

    for (const { route, entry } of router.collectedRoutes()) {
        adapter.register({
            route,
            fullPath: entry.fullPath,
            async handle(request) {
                return executeVerser2Route(route, request);
            }
        });
    }
}
