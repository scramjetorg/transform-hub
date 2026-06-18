import { collectDecoratedRoutes } from "./decorators";
import { HttpMethod, ResolverDefinition, RouteDefinition, RouteSchemas, defineRoute, normalizePath } from "./manifest";
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
    },
    resolve<TSchemas extends RouteSchemas>(path: string, definition: Omit<ResolverDefinition<TSchemas>, "path">): ResolverDefinition<TSchemas> {
        return {
            ...definition,
            path: normalizePath(path)
        };
    }
};
