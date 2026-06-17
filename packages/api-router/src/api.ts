import { collectDecoratedRoutes } from "./decorators";
import { HttpMethod, RouteDefinition, defineRoute } from "./manifest";
import { RouterDefinition, RouterOptions, createRouter } from "./router";

function route(method: HttpMethod, path: string, definition: Omit<RouteDefinition, "method" | "path"> = {}): RouteDefinition {
    return defineRoute({
        ...definition,
        method,
        path
    });
}

export const Router = {
    create(options?: RouterOptions): RouterDefinition {
        return createRouter(options);
    },
    api: collectDecoratedRoutes,
    route,
    get(path: string, definition?: Omit<RouteDefinition, "method" | "path">): RouteDefinition {
        return route("get", path, definition);
    },
    post(path: string, definition?: Omit<RouteDefinition, "method" | "path">): RouteDefinition {
        return route("post", path, definition);
    }
};
