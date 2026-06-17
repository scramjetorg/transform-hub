import { z } from "zod";
import type { RouteHook } from "./hooks";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "options" | "head";

export type RouteSchemas = {
    params?: z.ZodTypeAny;
    query?: z.ZodTypeAny;
    headers?: z.ZodTypeAny;
    body?: z.ZodTypeAny;
    response?: z.ZodTypeAny;
};

export type InferSchema<TSchema> = TSchema extends z.ZodTypeAny ? z.infer<TSchema> : undefined;

export type RouteRequest<TSchemas extends RouteSchemas = RouteSchemas> = {
    params: InferSchema<TSchemas["params"]>;
    query: InferSchema<TSchemas["query"]>;
    headers: InferSchema<TSchemas["headers"]>;
    body: InferSchema<TSchemas["body"]>;
};

export type RouteResponse<TSchemas extends RouteSchemas = RouteSchemas> = InferSchema<TSchemas["response"]>;

export type RouteHandler<TSchemas extends RouteSchemas = RouteSchemas> = (
    request: RouteRequest<TSchemas>
) => RouteResponse<TSchemas> | Promise<RouteResponse<TSchemas>>;

export type RouteKind = "request" | "upstream" | "downstream" | "duplex";

export type RouteDefinition<TSchemas extends RouteSchemas = RouteSchemas> = {
    id?: string;
    method: HttpMethod;
    path: string;
    description?: string;
    kind?: RouteKind;
    tags?: string[];
    schemas?: TSchemas;
    hooks?: RouteHook[];
    handler?: RouteHandler<TSchemas>;
};

export type RouteManifestEntry = Omit<RouteDefinition, "handler"> & {
    id: string;
    fullPath: string;
};

export type RouteManifest = {
    basePath: string;
    routes: RouteManifestEntry[];
};

export function normalizePath(path: string): string {
    const normalized = `/${path}`.replace(/\/+/g, "/").replace(/\/$/, "");

    return normalized === "" ? "/" : normalized;
}

export function joinPaths(basePath: string, path: string): string {
    return normalizePath(`${normalizePath(basePath)}/${normalizePath(path)}`);
}

export function routeId(method: HttpMethod, fullPath: string): string {
    return `${method.toUpperCase()} ${fullPath}`;
}

export function defineRoute<TSchemas extends RouteSchemas>(definition: RouteDefinition<TSchemas>): RouteDefinition<TSchemas> {
    return definition;
}
