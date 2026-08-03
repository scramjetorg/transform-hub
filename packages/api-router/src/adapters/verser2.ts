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

type RouteMatch =
    | { kind: "match"; params: Record<string, string> }
    | { kind: "malformed-encoding" };

function validateVerser2Registration(registration: Verser2RouteRegistration): string {
    const key = `${registration.route.method.toUpperCase()} ${registration.fullPath}`;

    if (registration.route.kind && registration.route.kind !== "request") {
        throw new Error(`Verser2RouteRegistry supports unary routes only: ${key}`);
    }
    if (/:([A-Za-z0-9_]+)\?/.test(registration.fullPath)) {
        throw new Error(`Optional Verser2 route parameters are not supported: ${key}`);
    }
    const segments = registration.fullPath.split("/").filter(Boolean);
    const wildcardSegments = segments.filter(segment => segment.includes("*"));
    if (wildcardSegments.length && (wildcardSegments.length !== 1 || segments[segments.length - 1] !== "*")) {
        throw new Error(`Verser2RouteRegistry wildcard must be terminal: ${key}`);
    }

    return key;
}

/** In-memory dispatcher for root-local unary v2 routes only; resolvers and stream routes are unsupported. */
export class Verser2RouteRegistry implements Verser2RouteAdapter {
    private registrations: Verser2RouteRegistration[] = [];

    register(registration: Verser2RouteRegistration): void {
        const key = validateVerser2Registration(registration);
        if (this.registrations.some(candidate => `${candidate.route.method.toUpperCase()} ${candidate.fullPath}` === key)) {
            throw new Error(`Duplicate Verser2 route registration: ${key}`);
        }
        this.registrations.push(registration);
    }

    registerRouter(router: RouterDefinition): void {
        router.collect();
        const routes = router.collectedRoutes();
        if (router.collectedResolvers().length) throw new Error("Verser2RouteRegistry does not support resolvers");
        const seen = new Set<string>();
        for (const { route, entry } of routes) {
            const key = validateVerser2Registration({ route, fullPath: entry.fullPath, handle: request => executeVerser2Route(route, request) });
            if (seen.has(key) || this.registrations.some(candidate => `${candidate.route.method.toUpperCase()} ${candidate.fullPath}` === key)) throw new Error(`Duplicate Verser2 route registration: ${key}`);
            seen.add(key);
        }
        for (const { route, entry } of routes) this.register({ route, fullPath: entry.fullPath, handle: request => executeVerser2Route(route, request) });
    }

    async dispatch(request: Verser2RouteRequest): Promise<Verser2RouteResponse> {
        const [pathname, queryString] = request.path.split("?", 2);
        const query = { ...this.parseQuery(queryString), ...request.query };
        const matches = this.registrations.map(registration => ({ registration, result: this.match(registration.fullPath, pathname) })).filter((candidate): candidate is { registration: Verser2RouteRegistration; result: RouteMatch } => candidate.result !== undefined);
        if (!matches.length) return { status: 404, body: { error: { code: "NOT_FOUND", message: "Route not found" } } };
        if (matches.some(candidate => candidate.result.kind === "malformed-encoding")) return { status: 400, body: { error: { code: "INVALID_PATH_ENCODING", message: "Invalid path encoding" } } };
        const selected = matches.find((candidate): candidate is { registration: Verser2RouteRegistration; result: { kind: "match"; params: Record<string, string> } } => candidate.result.kind === "match" && candidate.registration.route.method.toUpperCase() === request.method.toUpperCase());
        if (!selected) return { status: 405, headers: { allow: [...new Set(matches.map(candidate => candidate.registration.route.method.toUpperCase()))].sort().join(", ") }, body: { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } } };
        return selected.registration.handle({ ...request, path: pathname, params: selected.result.params, query });
    }

    private match(pattern: string, pathname: string): RouteMatch | undefined {
        const parts = pattern.split("/").filter(Boolean);
        const pathParts = pathname.split("/").filter(Boolean);
        const params: Record<string, string> = {};
        let index = 0;
        for (const part of parts) {
            if (part === "*") {
                const value = this.decode(pathParts.slice(index).join("/"));
                return value === undefined ? { kind: "malformed-encoding" } : { kind: "match", params: { ...params, "*": value } };
            }
            const parameter = /^:([A-Za-z0-9_]+)(\?)?$/.exec(part);
            if (parameter) {
                const value = pathParts[index++];
                if (value === undefined) {
                    if (parameter[2]) continue;
                    return undefined;
                }
                const decoded = this.decode(value);
                if (decoded === undefined) return { kind: "malformed-encoding" };
                params[parameter[1]] = decoded;
                continue;
            }
            if (pathParts[index++] !== part) return undefined;
        }
        return index === pathParts.length ? { kind: "match", params } : undefined;
    }

    private decode(value: string): string | undefined {
        try { return decodeURIComponent(value); } catch (_) { return undefined; }
    }

    private parseQuery(query: string | undefined): Record<string, string> {
        return Object.fromEntries(new URLSearchParams(query || "").entries());
    }
}

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
    if (adapter instanceof Verser2RouteRegistry) {
        adapter.registerRouter(router);
        return;
    }
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
