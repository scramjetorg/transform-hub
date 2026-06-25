import { APIRoute, ParsedMessage, StreamConfig } from "@scramjet/api-types";
import { ServerResponse } from "http";
import { ResolverDefinition, ResolverRedirectTarget, ResolverTarget, RouteDefinition, RouteRequest, normalizePath } from "../manifest";
import { RouterDefinition } from "../router";
import { executeRoutePipeline } from "../hooks";
import { validateRouteRequest, validateRouteResponse } from "../validation";

export type HttpRouteTarget = Pick<APIRoute, "get" | "op"> & Partial<Pick<APIRoute, "upstream" | "downstream" | "duplex" | "use">>;

export function mapRouteRequest(req: Partial<ParsedMessage>): Partial<RouteRequest> {
    return {
        params: req.params,
        query: req.query,
        headers: req.headers,
        body: req.body
    };
}

export async function executeRouteDefinition(route: RouteDefinition, requestLike: Partial<ParsedMessage>, responseLike?: ServerResponse) {
    if (!route.handler) {
        return undefined;
    }

    const request = {
        ...validateRouteRequest(route.schemas || {}, mapRouteRequest(requestLike)),
        raw: { request: requestLike, response: responseLike }
    };
    const response = await executeRoutePipeline(route, request, () => route.handler!(request), { hooks: route.hooks });

    return route.schemas?.response ? validateRouteResponse(route.schemas, response) : response;
}

async function executeHttpRoute(route: RouteDefinition, req: ParsedMessage, res?: ServerResponse) {
    return executeRouteDefinition(route, req, res);
}

function isOpMethod(method: RouteDefinition["method"]): method is "post" | "put" | "patch" | "delete" {
    return method === "post" || method === "put" || method === "patch" || method === "delete";
}

function streamOptions(route: RouteDefinition): StreamConfig | undefined {
    return route.method === "put" ? { method: "put" } : undefined;
}

function writeResolverError(res: ServerResponse, statusCode: number, message: string) {
    if (!res.headersSent) {
        res.writeHead(statusCode, { "content-type": "application/json" });
    }

    res.end(JSON.stringify({ error: { message } }));
}

function writeVerser2Redirect(res: ServerResponse, redirect: ResolverRedirectTarget) {
    const targetPath = redirect.targetPath.startsWith("/") ? redirect.targetPath : `/${redirect.targetPath}`;
    const location = redirect.location || `http://${redirect.routeDomain}${targetPath}`;
    const headers = redirect.headers || {};

    res.writeHead(redirect.statusCode || 308, {
        location,
        "x-scramjet-route-decision": "redirect",
        "x-scramjet-route-domain": redirect.routeDomain,
        "x-scramjet-route-target-path": targetPath,
        ...headers
    });
    res.end();
}

function splitPath(path: string): string[] {
    return normalizePath(path.split("?")[0]).split("/").filter(Boolean);
}

function matchResolverPath(pattern: string, path: string) {
    const patternSegments = splitPath(pattern);
    const pathSegments = splitPath(path);

    if (pathSegments.length < patternSegments.length) {
        return undefined;
    }

    const params: Record<string, string> = {};

    for (let index = 0; index < patternSegments.length; index++) {
        const patternSegment = patternSegments[index];
        const pathSegment = pathSegments[index];

        if (patternSegment.startsWith(":")) {
            params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
            continue;
        }

        if (patternSegment !== pathSegment) {
            return undefined;
        }
    }

    const remainingSegments = pathSegments.slice(patternSegments.length);
    const remainingPath = remainingSegments.length ? `/${remainingSegments.join("/")}` : "/";

    return { params, remainingPath };
}

async function dispatchResolvedTarget(
    target: ResolverTarget | undefined,
    req: ParsedMessage,
    res: ServerResponse,
    next: (err?: Error) => void,
    remainingPath: string,
    params: Record<string, string>
) {
    if (!target) {
        writeResolverError(res, 404, "Resolved API target was not found");
        return;
    }

    if (target.redirect) {
        writeVerser2Redirect(res, target.redirect);
        return;
    }

    if (!target.local) {
        writeResolverError(res, 501, "Resolved API target is not supported by the HTTP adapter");
        return;
    }

    const originalUrl = req.url;
    const originalParams = req.params;
    const existingParams = originalParams || {};

    req.url = remainingPath;
    req.params = { ...params, ...existingParams };

    try {
        await target.local.lookup(req, res, next);
    } finally {
        req.url = originalUrl;
        req.params = originalParams;
    }
}

function createResolverMiddleware(resolver: ResolverDefinition, fullPath: string) {
    return async (req: ParsedMessage, res: ServerResponse, next: (err?: Error) => void) => {
        const matched = matchResolverPath(fullPath, req.url || fullPath);

        if (!matched) {
            next();
            return;
        }

        const existingParams = req.params || {};
        const request = validateRouteRequest(resolver.schemas || {}, {
            ...mapRouteRequest(req),
            params: { ...matched.params, ...existingParams }
        });
        const target = await resolver.handler({
            ...request,
            path: req.url || fullPath,
            remainingPath: matched.remainingPath
        });

        await dispatchResolvedTarget(target, req, res, next, matched.remainingPath, matched.params);
    };
}

export function registerHttpRoutes(api: HttpRouteTarget, router: RouterDefinition): void {
    router.collect();

    for (const { resolver, entry } of router.collectedResolvers()) {
        if (!api.use) {
            continue;
        }

        const middleware = createResolverMiddleware(resolver, entry.fullPath);

        api.use(entry.fullPath, middleware);
        api.use(`${entry.fullPath}/*`, middleware);
    }

    for (const { route, entry } of router.collectedRoutes()) {
        if (route.kind === "upstream") {
            api.upstream?.(entry.fullPath, (req: ParsedMessage, res: ServerResponse) => executeHttpRoute(route, req, res));
            continue;
        }

        if (route.kind === "downstream") {
            api.downstream?.(entry.fullPath, (req: ParsedMessage, res: ServerResponse) => executeHttpRoute(route, req, res), streamOptions(route));
            continue;
        }

        if (route.kind === "duplex") {
            api.duplex?.(entry.fullPath, route.handler as any);
            continue;
        }

        if (route.method === "get") {
            api.get(entry.fullPath, req => executeHttpRoute(route, req));
        } else if (isOpMethod(route.method)) {
            api.op(route.method, entry.fullPath, (req, res) => executeHttpRoute(route, req, res));
        }
    }
}
