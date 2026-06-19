import { z } from "zod";
import type { ParsedMessage } from "@scramjet/types";
import type { ServerResponse } from "http";
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
    raw?: {
        request?: Partial<ParsedMessage>;
        response?: ServerResponse;
    };
};

export type RawHttpRouteRequest<TSchemas extends RouteSchemas = RouteSchemas> = RouteRequest<TSchemas> & {
    raw: {
        request: ParsedMessage;
        response: ServerResponse;
    };
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

export type ResolverRedirectTarget = {
    routeDomain: string;
    targetPath: string;
    location?: string;
    statusCode?: 307 | 308;
    headers?: Record<string, string>;
};

export type CollectManifestOptions = {
    expandResolvers?: boolean;
    maxResolverDepth?: number;
};

// eslint-disable-next-line no-use-before-define
export type RouteDefinitionSource = RouteManifest | {
    // eslint-disable-next-line no-use-before-define
    collect(options?: CollectManifestOptions): RouteManifest;
};

export type ResolverTargetDefinition = {
    owner: string;
    definitions: RouteDefinitionSource;
    mountPath?: string;
    publicBasePath?: string;
    implementerBasePath?: string;
};

export type ResolverTargetDefinitions = ResolverTargetDefinition | ResolverTargetDefinition[];

export type ResolverTarget = {
    local?: LocalRouterTarget;
    redirect?: ResolverRedirectTarget;
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
    targetDefinitions?: ResolverTargetDefinitions;
};

export type ResolverManifestEntry = Omit<ResolverDefinition, "handler" | "targetDefinitions"> & {
    id: string;
    fullPath: string;
    implementerPath?: string;
    mountPath?: string;
    targetDefinitions?: ResolverTargetDefinitions;
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

export type RouteSchemasFor<TContract> = TContract extends RouteDefinition<infer TSchemas>
    ? TSchemas
    : TContract extends ResolverDefinition<infer TSchemas>
        ? TSchemas
        : RouteSchemas;

export type RouteRequestFor<TContract extends RouteDefinition> = RouteRequest<RouteSchemasFor<TContract>>;

export type RouteResponseFor<TContract extends RouteDefinition> = RouteResponse<RouteSchemasFor<TContract>>;

export type RouteHandlerFor<TContract extends RouteDefinition> = TContract extends { kind: "upstream" | "downstream" | "duplex" }
    ? (request: RawHttpRouteRequest<RouteSchemasFor<TContract>>) => unknown | Promise<unknown>
    : (request: RouteRequestFor<TContract>) => RouteResponseFor<TContract> | Promise<RouteResponseFor<TContract>>;

export type ResolverRequestFor<TContract extends ResolverDefinition> = ResolverRequest<RouteSchemasFor<TContract>>;

export type ResolverHandlerFor<TContract extends ResolverDefinition> = (
    request: ResolverRequestFor<TContract>
) => ResolverTarget | undefined | Promise<ResolverTarget | undefined>;

export type RouteManifestEntry = Omit<RouteDefinition, "handler"> & {
    id: string;
    fullPath: string;
    implementerPath?: string;
    mountPath?: string;
    virtual?: boolean;
    owner?: string;
    target?: {
        mountPath: string;
        publicBasePath: string;
        implementerBasePath: string;
        implementerFullPath: string;
    };
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
