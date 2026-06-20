import {
    ApiClientTransport,
    RouteDefinition,
    RouteManifest,
    RouteManifestEntry,
    RouteRequestFor,
    RouteResponseFor,
    Router,
    createApiClient,
    createHttpClientTransport,
    createVerser2ClientTransport
} from "@scramjet/api-router";

import { RestAPI2 } from "./contracts";
import { RestAPI2RouteTree, RestAPI2RouteTreeRouteNode, RestAPI2Routes, getOpaqueRouteKeys } from "./routes";

export type RestAPI2ClientOptions = {
    manifest: RouteManifest;
    transport: ApiClientTransport;
};

export function createRestAPI2Client({ manifest, transport }: RestAPI2ClientOptions): RestAPI2.Client {
    const client = createApiClient(manifest, transport);

    return {
        async request<TBody = unknown, TOperation extends RestAPI2.OperationId = RestAPI2.OperationId>(request: RestAPI2.ClientRequest<TOperation>) {
            const response = await client.request<TBody>(request.operationId, request);

            return {
                operationId: request.operationId,
                ...response
            };
        }
    };
}

export type FluentClientRequest<TContract extends RouteDefinition> = Partial<Omit<RouteRequestFor<TContract>, "raw">>;

export type FluentEndpoint<TContract extends RouteDefinition> = {
    [M in TContract["method"]]: (request?: FluentClientRequest<TContract>) => Promise<RestAPI2.ClientResponse<RestAPI2.OperationId, RouteResponseFor<TContract>>>;
};

type FluentRouteMethods<TSet extends Record<string, RouteDefinition>> = {
    [K in keyof TSet]: FluentEndpoint<TSet[K]>;
};

// Extract opaque route keys from a route tree node at the type level,
// mirroring the runtime getOpaqueRouteKeys() behaviour.
type OpaqueRouteKeysOfNode<TNode extends RestAPI2RouteTreeRouteNode<string, string, Record<string, RouteDefinition>>> =
    TNode["groups"] extends Record<string, infer Group>
        ? Group extends { opaque: true; routeKeys: ReadonlyArray<infer R> }
            ? R extends string ? R : never
            : never
        : never;

export type FluentClientForRouteTreeNode<TNode extends RestAPI2RouteTreeRouteNode<string, string, Record<string, RouteDefinition>>> =
    FluentRouteMethods<Omit<ReturnType<TNode["routes"]>, OpaqueRouteKeysOfNode<TNode>>>;

type RootRouteSet = ReturnType<typeof RestAPI2RouteTree.root.routes>;
type SpaceRouteSet = ReturnType<typeof RestAPI2RouteTree.space.routes>;
type HubRouteSet = ReturnType<typeof RestAPI2RouteTree.hub.routes>;
type InstanceRouteSet = ReturnType<typeof RestAPI2RouteTree.instance.routes>;
type InstanceStandardRouteSet = Omit<InstanceRouteSet, "rpc">;

export type InstanceClient = FluentRouteMethods<InstanceStandardRouteSet>;

export type HubClient = FluentRouteMethods<HubRouteSet> & {
    instance(instanceId: string): InstanceClient;
};

export type SpaceClient = FluentRouteMethods<SpaceRouteSet> & {
    hub(hubId: string): HubClient;
};

export type RootClient = FluentRouteMethods<RootRouteSet> & {
    space(spaceId: string): SpaceClient;
};

export type RestAPI2FluentClientOptions = {
    transport: ApiClientTransport;
    basePath?: string;
    manifest?: RouteManifest;
};

type FluentBuildContext = {
    manifest: RouteManifest;
    client: RestAPI2.Client;
    prefix: string;
    params: Record<string, string>;
};

function normalizePath(path: string): string {
    const normalized = `/${path}`.replace(/\/+/g, "/").replace(/\/$/, "");

    return normalized === "" ? "/" : normalized;
}

function joinPaths(basePath: string, path: string): string {
    return normalizePath(`${normalizePath(basePath)}/${normalizePath(path)}`);
}

function routeId(method: string, fullPath: string): RestAPI2.OperationId {
    return `${method.toUpperCase()} ${fullPath}` as RestAPI2.OperationId;
}

function findManifestRoute(manifest: RouteManifest, method: string, fullPath: string): RouteManifestEntry {
    const id = routeId(method, fullPath);
    const route = manifest.routes.find(entry => entry.id === id || entry.method === method && entry.fullPath === fullPath);

    if (!route) {
        throw new Error(`Missing fluent RestAPI2 route: ${id}`);
    }

    return route;
}

function endpoint<TContract extends RouteDefinition>(context: FluentBuildContext, contract: TContract): FluentEndpoint<TContract> {
    const fullPath = joinPaths(context.prefix, contract.path);
    const method = contract.method;

    return {
        [method]: (request: FluentClientRequest<TContract> = {}) => {
            const route = findManifestRoute(context.manifest, method, fullPath);
            const params = { ...context.params, ...(request.params as Record<string, string> | undefined) };

            return context.client.request<RouteResponseFor<TContract>>({
                operationId: route.id as RestAPI2.OperationId,
                params,
                query: request.query,
                headers: request.headers as Record<string, string> | undefined,
                body: request.body
            });
        }
    } as FluentEndpoint<TContract>;
}

function routeMethods<TSet extends Record<string, RouteDefinition>>(context: FluentBuildContext, routes: TSet): FluentRouteMethods<TSet> {
    const entries = Object.entries(routes).map(([key, route]) => [key, endpoint(context, route)]);

    return Object.fromEntries(entries) as FluentRouteMethods<TSet>;
}

function standardRouteMethods<TSet extends Record<string, RouteDefinition>>(
    context: FluentBuildContext,
    routes: TSet,
    opaqueKeys: readonly string[] = []
): FluentRouteMethods<TSet> {
    const opaque = new Set(opaqueKeys);
    const standardRoutes = Object.fromEntries(Object.entries(routes).filter(([key]) => !opaque.has(key))) as TSet;

    return routeMethods(context, standardRoutes);
}

function buildInstanceClient(context: FluentBuildContext): InstanceClient {
    return standardRouteMethods(context, RestAPI2RouteTree.instance.routes(), getOpaqueRouteKeys(RestAPI2RouteTree.instance)) as InstanceClient;
}

function buildHubClient(context: FluentBuildContext): HubClient {
    return {
        ...standardRouteMethods(context, RestAPI2RouteTree.hub.routes(), getOpaqueRouteKeys(RestAPI2RouteTree.hub)),
        instance(instanceId: string) {
            return buildInstanceClient({
                ...context,
                prefix: joinPaths(context.prefix, "/instances/:instanceId"),
                params: { ...context.params, instanceId }
            });
        }
    };
}

function buildSpaceClient(context: FluentBuildContext): SpaceClient {
    return {
        ...standardRouteMethods(context, RestAPI2RouteTree.space.routes(), getOpaqueRouteKeys(RestAPI2RouteTree.space)),
        hub(hubId: string) {
            return buildHubClient({
                ...context,
                prefix: joinPaths(context.prefix, "/hubs/:hubId"),
                params: { ...context.params, hubId }
            });
        }
    };
}

function buildRootClient(context: FluentBuildContext): RootClient {
    return {
        ...standardRouteMethods(context, RestAPI2RouteTree.root.routes(), getOpaqueRouteKeys(RestAPI2RouteTree.root)),
        space(spaceId: string) {
            return buildSpaceClient({
                ...context,
                prefix: joinPaths(context.prefix, "/spaces/:spaceId"),
                params: { ...context.params, spaceId }
            });
        }
    };
}

function createFluentContext(manifest: RouteManifest, transport: ApiClientTransport, prefix: string): FluentBuildContext {
    return {
        manifest,
        client: createRestAPI2Client({ manifest, transport }),
        prefix,
        params: {}
    };
}

export function createRootClient({ transport, basePath = "/api/v2", manifest: providedManifest }: RestAPI2FluentClientOptions): RootClient {
    const manifest = providedManifest ?? RestAPI2Routes.root.router(basePath).collect({ expandResolvers: true });

    return buildRootClient(createFluentContext(manifest, transport, basePath));
}

export function createSpaceClient({ transport, basePath = "/", manifest: providedManifest }: RestAPI2FluentClientOptions): SpaceClient {
    const manifest = providedManifest ?? RestAPI2Routes.space.router(basePath).collect({ expandResolvers: true });

    return buildSpaceClient(createFluentContext(manifest, transport, basePath));
}

export function createHubClient({ transport, basePath = "/", manifest: providedManifest }: RestAPI2FluentClientOptions): HubClient {
    const manifest = providedManifest ?? RestAPI2Routes.hub.router(basePath).collect({ expandResolvers: true });

    return buildHubClient(createFluentContext(manifest, transport, basePath));
}

export function createInstanceClient({ transport, basePath = "/", manifest: providedManifest }: RestAPI2FluentClientOptions): InstanceClient {
    const instanceRouter = RestAPI2Routes.instance.router();
    const manifest = providedManifest ?? (basePath === "/"
        ? instanceRouter.collect({ expandResolvers: true })
        : Router.create({ basePath }).mount("/", instanceRouter).collect({ expandResolvers: true }));

    return buildInstanceClient(createFluentContext(manifest, transport, basePath));
}

export function createFluentClientFromRouteTreeNode<TNode extends RestAPI2RouteTreeRouteNode<string, string, Record<string, RouteDefinition>>>(
    node: TNode,
    { transport, basePath = "/", manifest }: RestAPI2FluentClientOptions
): FluentClientForRouteTreeNode<TNode> {
    const router = Object.values(node.routes()).reduce((current, route) => current.route(route), Router.create({ basePath }));
    const routeManifest = manifest || router.collect({ expandResolvers: true });

    return standardRouteMethods(createFluentContext(routeManifest, transport, basePath), node.routes(), getOpaqueRouteKeys(node)) as FluentClientForRouteTreeNode<TNode>;
}

export { createHttpClientTransport, createVerser2ClientTransport };
export type { ApiClientTransport };
