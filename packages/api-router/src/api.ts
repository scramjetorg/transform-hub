import { collectDecoratedRoutes } from "./decorators";
import { HttpMethod, ResolverDefinition, RouteDefinition, RouteSchemas, defineRoute, normalizePath } from "./manifest";
import { RouterDefinition, RouterOptions, createRouter } from "./router";

type RouteDefinitionInput = Omit<RouteDefinition<RouteSchemas>, "method" | "path">;
type SchemasFromDefinition<TDefinition> = TDefinition extends { schemas?: infer TSchemas }
    ? TSchemas extends RouteSchemas
        ? TSchemas
        : RouteSchemas
    : RouteSchemas;

function route<TDefinition extends RouteDefinitionInput = RouteDefinitionInput>(
    method: HttpMethod,
    path: string,
    definition: TDefinition = {} as TDefinition
): RouteDefinition<SchemasFromDefinition<TDefinition>> & Pick<TDefinition, Extract<keyof TDefinition, "kind">> {
    return defineRoute({
        ...definition,
        method,
        path
    }) as RouteDefinition<SchemasFromDefinition<TDefinition>> & Pick<TDefinition, Extract<keyof TDefinition, "kind">>;
}

export const Router = {
    create(options?: RouterOptions): RouterDefinition {
        return createRouter(options);
    },
    api: collectDecoratedRoutes,
    route,
    get<TDefinition extends RouteDefinitionInput = RouteDefinitionInput>(
        path: string,
        definition?: TDefinition
    ): RouteDefinition<SchemasFromDefinition<TDefinition>> & Pick<TDefinition, Extract<keyof TDefinition, "kind">> {
        return route("get", path, definition);
    },
    post<TDefinition extends RouteDefinitionInput = RouteDefinitionInput>(
        path: string,
        definition?: TDefinition
    ): RouteDefinition<SchemasFromDefinition<TDefinition>> & Pick<TDefinition, Extract<keyof TDefinition, "kind">> {
        return route("post", path, definition);
    },
    resolve<TSchemas extends RouteSchemas>(path: string, definition: Omit<ResolverDefinition<TSchemas>, "path">): ResolverDefinition<TSchemas> {
        return {
            ...definition,
            path: normalizePath(path)
        };
    }
};
