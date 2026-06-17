import { APIRoute, ParsedMessage } from "@scramjet/types";
import { ServerResponse } from "http";
import { RouteDefinition, RouteRequest } from "../manifest";
import { RouterDefinition } from "../router";
import { executeRoutePipeline } from "../hooks";
import { validateRouteRequest, validateRouteResponse } from "../validation";

function mapRequest(req: ParsedMessage): Partial<RouteRequest> {
    return {
        params: req.params,
        query: req.query,
        headers: req.headers,
        body: req.body
    };
}

async function executeHttpRoute(route: RouteDefinition, req: ParsedMessage, _res?: ServerResponse) {
    if (!route.handler) {
        return undefined;
    }

    const request = validateRouteRequest(route.schemas || {}, mapRequest(req));
    const response = await executeRoutePipeline(route, request, () => route.handler!(request), { hooks: route.hooks });

    return route.schemas?.response ? validateRouteResponse(route.schemas, response) : response;
}

function isOpMethod(method: RouteDefinition["method"]): method is "post" | "put" | "patch" | "delete" {
    return method === "post" || method === "put" || method === "patch" || method === "delete";
}

export function registerHttpRoutes(api: APIRoute, router: RouterDefinition): void {
    for (const route of router.definitions()) {
        if (route.kind === "upstream" || route.kind === "downstream" || route.kind === "duplex") {
            continue;
        }

        if (route.method === "get") {
            api.get(route.path, req => executeHttpRoute(route, req));
        } else if (isOpMethod(route.method)) {
            api.op(route.method, route.path, (req, res) => executeHttpRoute(route, req, res));
        }
    }
}
