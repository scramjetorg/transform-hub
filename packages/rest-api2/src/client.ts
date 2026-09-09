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
import { Readable } from "stream";

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
        },
        api: {
            request: <TBody = unknown>(request: RestAPI2.RawRequest) => rawTransportRequest<TBody>(transport, request)
        }
    };
}

export type FluentClientRequest<TContract extends RouteDefinition> = Partial<Omit<RouteRequestFor<TContract>, "raw">>;

export type FluentEndpoint<TContract extends RouteDefinition> = {
    [M in TContract["method"]]: (request?: FluentClientRequest<TContract>) => Promise<RestAPI2.ClientResponse<RestAPI2.OperationId, RouteResponseFor<TContract>>>;
};

/**
 * Caller-owned guard for application-provided RPC input or response data.
 */
export type InstanceRpcTypeGuard<TValue> = (value: unknown) => value is TValue;

/**
 * Caller-owned declaration for one JSON RPC procedure.
 *
 * The API package deliberately does not know application RPC names or payloads;
 * callers provide those as a contract to {@link InstanceClient.rpc}.
 */
export type InstanceRpcProcedure<TInput = unknown, TResult = unknown> = {
    /** Runtime validation before the opaque request body is sent. */
    request: InstanceRpcTypeGuard<TInput>;
    /** Runtime validation after the JSON response body is decoded. */
    response: InstanceRpcTypeGuard<TResult>;
};

/** Contract declaration for a GET RPC procedure without an application body. */
export type InstanceRpcReadProcedure<TResult = unknown> = {
    response: InstanceRpcTypeGuard<TResult>;
    request?: undefined;
};

type InstanceRpcProcedureName<TContract> = {
    [TProcedure in keyof TContract]-?: TContract[TProcedure] extends InstanceRpcProcedure | InstanceRpcReadProcedure ? TProcedure : never;
}[keyof TContract] & string;

type InstanceRpcInput<TContract, TProcedure extends InstanceRpcProcedureName<TContract>> =
    TContract[TProcedure] extends InstanceRpcProcedure<infer TInput> ? TInput : never;

type InstanceRpcResult<TContract, TProcedure extends InstanceRpcProcedureName<TContract>> =
    TContract[TProcedure] extends InstanceRpcProcedure<any, infer TResult> ? TResult : never;

type InstanceRpcReadResult<TContract, TProcedure extends InstanceRpcProcedureName<TContract>> =
    TContract[TProcedure] extends InstanceRpcReadProcedure<infer TResult> ? TResult : never;

type InstanceRpcWriteProcedureName<TContract> = {
    [TProcedure in InstanceRpcProcedureName<TContract>]: TContract[TProcedure] extends InstanceRpcProcedure ? TProcedure : never;
}[InstanceRpcProcedureName<TContract>];

type InstanceRpcReadProcedureName<TContract> = {
    [TProcedure in InstanceRpcProcedureName<TContract>]: TContract[TProcedure] extends InstanceRpcReadProcedure ? TProcedure : never;
}[InstanceRpcProcedureName<TContract>];

/** Raw RPC request options; `body` is forwarded directly to the application RPC endpoint. */
export type InstanceRpcRequest = RestAPI2.RawRequest;

/**
 * The typed RPC transport envelope. `body` preserves the underlying transport
 * value until {@link json} is explicitly requested with an external guard.
 */
export type InstanceRpcResponse<TBody = unknown> = RestAPI2.ClientResponse<RestAPI2.OperationId, TBody> & {
};

/**
 * A typed, procedure-only view of an instance's opaque RPC endpoint.
 *
 * It intentionally has no generic request/path method. Each call is POSTed to
 * `/rpc/:procedure`; procedure paths use conservative, unescaped relative
 * segments. The contract guards validate both the JSON request and response.
 */
export type InstanceRpcClient<TContract> = {
    call<TProcedure extends InstanceRpcReadProcedureName<TContract>>(
        procedure: TProcedure,
        options?: Omit<InstanceRpcRequest, "method" | "path" | "body">
    ): Promise<InstanceRpcReadResult<TContract, TProcedure>>;
    call<TProcedure extends InstanceRpcWriteProcedureName<TContract>>(
        procedure: TProcedure,
        input: InstanceRpcInput<TContract, TProcedure>,
        options?: Omit<InstanceRpcRequest, "method" | "path" | "body">
    ): Promise<InstanceRpcResult<TContract, TProcedure>>;
};

/** Contract-free RPC path for native/streaming request and response bodies. */
export type InstanceRpcNamespace = {
    <TContract>(contract: TContract): InstanceRpcClient<TContract>;
    request(request: InstanceRpcRequest): Promise<InstanceRpcResponse>;
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

export type InstanceClient = FluentRouteMethods<InstanceStandardRouteSet> & {
    /** Contract-bound JSON RPC calls and contract-free native RPC requests. */
    rpc: InstanceRpcNamespace;
};

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
    transport: ApiClientTransport;
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

function validateRpcProcedurePath(procedure: string): string[] {
    if (!procedure || /[\\?#%\s]/.test(procedure)) {
        throw new Error("Instance RPC procedure path must contain only unescaped relative segments");
    }

    const segments = procedure.split("/");

    if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
        throw new Error("Instance RPC procedure path must contain only unescaped relative segments");
    }

    return segments;
}

function procedureGuards(contract: unknown, procedure: string): { request?: (value: unknown) => boolean; response: (value: unknown) => boolean } {
    if (!contract || typeof contract !== "object") {
        throw new Error(`Instance RPC contract is missing guards for procedure: ${procedure}`);
    }
    const definition = (contract as Record<string, unknown>)[procedure];

    if (!definition || typeof definition !== "object") {
        throw new Error(`Instance RPC contract is missing guards for procedure: ${procedure}`);
    }
    const { request, response } = definition as { request?: unknown; response?: unknown };

    if (request !== undefined && typeof request !== "function" || typeof response !== "function") {
        throw new Error(`Instance RPC contract is missing guards for procedure: ${procedure}`);
    }

    return { request: request as ((value: unknown) => boolean) | undefined, response: response as (value: unknown) => boolean };
}

async function parseRpcJsonBody(body: unknown, cleanup?: () => Promise<void>): Promise<unknown> {
    if (!(body instanceof Readable)) {
        if (typeof body !== "string" && !Buffer.isBuffer(body)) return body;

        try {
            return JSON.parse(body.toString()) as unknown;
        } catch (error) {
            throw new Error(`Instance RPC response must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    const chunks: Buffer[] = [];

    try {
        for await (const chunk of body) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const text = Buffer.concat(chunks).toString();

        if (!text) return undefined;

        try {
            return JSON.parse(text) as unknown;
        } catch (error) {
            throw new Error(`Instance RPC response must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    } finally {
        await cleanup?.();
    }
}

function rpcHeaders(headers: Record<string, string> | undefined): Record<string, string> {
    if (Object.keys(headers || {}).some((name) => name.toLowerCase() === "content-type")) {
        return { ...headers };
    }

    return { "content-type": "application/json", ...headers };
}

function rawRoute(request: RestAPI2.RawRequest, fullPath = request.path): RouteManifestEntry {
    return {
        id: `${request.method.toUpperCase()} <raw>` as RestAPI2.OperationId,
        method: request.method.toLowerCase() as RouteManifestEntry["method"],
        path: fullPath,
        fullPath,
        kind: "duplex"
    };
}

async function rawTransportRequest<TBody = unknown>(
    transport: ApiClientTransport,
    request: RestAPI2.RawRequest,
    fullPath = request.path,
    params?: Record<string, string>,
    raw = true
): Promise<RestAPI2.RawResponse<TBody>> {
    const route = rawRoute(request, fullPath);
    const response = await transport.request<TBody>({
        route,
        params,
        query: request.query,
        headers: request.headers,
        body: request.body,
        raw,
        timeoutMs: request.timeoutMs,
        signal: request.signal
    });

    return { operationId: route.id as RestAPI2.OperationId, ...response };
}

async function requestInstanceRpc(context: FluentBuildContext, request: InstanceRpcRequest, raw = true): Promise<InstanceRpcResponse> {
    const path = request.path.startsWith("/") ? request.path.slice(1) : request.path;
    const prefix = context.prefix.endsWith("/") ? context.prefix.slice(0, -1) : context.prefix;

    return rawTransportRequest(context.transport, request, `${prefix}/rpc/${path}`, context.params, raw);
}

function buildInstanceRpcClient<TContract>(context: FluentBuildContext, contractDefinition: TContract): InstanceRpcClient<TContract> {

    const call = async (procedure: string, inputOrOptions?: unknown, maybeOptions?: Omit<InstanceRpcRequest, "method" | "path" | "body">): Promise<unknown> => {
            const guards = procedureGuards(contractDefinition, procedure);
            const hasBody = Boolean(guards.request);
            const input = hasBody ? inputOrOptions : undefined;
            const options = (hasBody ? maybeOptions : inputOrOptions) as Omit<InstanceRpcRequest, "method" | "path" | "body"> | undefined;

            if (guards.request && !guards.request(input)) {
                throw new Error(`Instance RPC request failed the supplied type guard for procedure: ${procedure}`);
            }
            const encodedPath = validateRpcProcedurePath(procedure).map(encodeURIComponent).join("/");
            const response = await requestInstanceRpc(context, {
                ...options,
                method: hasBody ? "POST" : "GET",
                path: encodedPath,
                headers: hasBody ? rpcHeaders(options?.headers) : options?.headers,
                ...(hasBody ? { body: input } : {})
            }, false);
            const result = await parseRpcJsonBody(response.body, response.cleanup);

            if (!guards.response(result)) {
                throw new Error(`Instance RPC response failed the supplied type guard for procedure: ${procedure}`);
            }

            return result;
        };

    return { call: call as InstanceRpcClient<TContract>["call"] };
}

function buildInstanceClient(context: FluentBuildContext): InstanceClient {
    return {
        ...standardRouteMethods(context, RestAPI2RouteTree.instance.routes(), getOpaqueRouteKeys(RestAPI2RouteTree.instance)),
        rpc: Object.assign(
            <TContract>(contractDefinition: TContract) => buildInstanceRpcClient(context, contractDefinition),
            { request: (request: InstanceRpcRequest) => requestInstanceRpc(context, request) }
        ) as unknown as InstanceRpcNamespace
    } as InstanceClient;
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
        transport,
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
