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

export type InferSchema<TSchema> = TSchema extends z.ZodTypeAny ? z.infer<TSchema> : unknown;

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

export type ResolverRequest<TSchemas extends RouteSchemas = RouteSchemas> = RouteRequest<TSchemas> & {
    path: string;
    remainingPath: string;
};

export type LocalRouterTarget = {
    lookup(req: unknown, res: unknown, next: (err?: Error) => void): unknown;
};

export type ResolverTarget = {
    local?: LocalRouterTarget;
    definitions?: unknown;
    client?: unknown;
    localForwardPath?: string;
};

export type ResolverHandler<TSchemas extends RouteSchemas = RouteSchemas> = (
    request: ResolverRequest<TSchemas>
) => ResolverTarget | undefined | Promise<ResolverTarget | undefined>;

export type ResolverDefinition<TSchemas extends RouteSchemas = RouteSchemas> = {
    id?: string;
    path: string;
    description?: string;
    schemas?: TSchemas;
    handler: ResolverHandler<TSchemas>;
    targetDefinitions?: unknown;
};

export type ResolverManifestEntry = Omit<ResolverDefinition, "handler" | "targetDefinitions"> & {
    id: string;
    fullPath: string;
    implementerPath?: string;
    mountPath?: string;
    targetDefinitions?: unknown;
};

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
    implementerPath?: string;
    mountPath?: string;
};

export type RouteManifest = {
    basePath: string;
    routes: RouteManifestEntry[];
    resolvers?: ResolverManifestEntry[];
};

export function normalizePath(path: string): string {
    const normalized = `/${path}`.replace(/\/+/g, "/").replace(/\/$/, "");

    return normalized === "" ? "/" : normalized;
}

export function joinPaths(basePath: string, path: string): string {
    return normalizePath(`${normalizePath(basePath)}/${normalizePath(path)}`);
}

export function replacePathVersion(path: string, version: string): string {
    return normalizePath(path).replace(/\/v\d+(?=\/|$)/, `/${version}`);
}

export function routeId(method: HttpMethod, fullPath: string): string {
    return `${method.toUpperCase()} ${fullPath}`;
}

export function defineRoute<TSchemas extends RouteSchemas>(definition: RouteDefinition<TSchemas>): RouteDefinition<TSchemas> {
    return definition;
}
