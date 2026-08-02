import { HttpMethod, ResolverDefinition, RouteDefinition, Router, RouterDefinition } from "@scramjet/api-router";

import {
    RestAPI2Schemas,
    ConfigResponse,
    DeleteInstancePayload,
    DeleteInstanceResponse,
    DeleteHubQuery,
    DeleteHubResponse,
    DeleteSequenceResponse,
    Entity,
    EventMessage,
    EventResponse,
    Hub,
    IngressIdentity,
    healthCheckInfo,
    Instance,
    InstanceParametersPatch,
    InstanceParametersResponse,
    InstanceResponse,
    listResponse,
    LoadResponse,
    Root,
    LogRecord,
    MonitoringMessage,
    opResponse,
    readableFdParam,
    RpcRequest,
    RpcResponse,
    SendEventResponse,
    Sequence,
    SequenceResponse,
    Space,
    StartSequencePayload,
    StartSequenceResponse,
    StatusResponse,
    StoreClearQuery,
    StoreClearResponse,
    StoreItem,
    StoreItemPayload,
    StdIODescriptorList,
    Topic,
    TopicCreatePayload,
    TopicCreateResponse,
    TopicDeleteResponse,
    TopicStreamResponse,
    TrustExport,
    VersionResponse,
    writableFdParam
} from "./schemas";

const handlerless = () => undefined;

type RouteSetFactory<T extends Record<string, RouteDefinition>> = () => T;
type ResolverSetFactory<T extends Record<string, ResolverDefinition>, TArgs extends unknown[] = []> = (...args: TArgs) => T;

export type RestAPI2RouteGroup<TRoutes extends Record<string, RouteDefinition>> = {
    readonly routeKeys?: ReadonlyArray<Extract<keyof TRoutes, string>>;
    readonly opaque?: boolean;
    readonly node?: string;
    readonly routes?: RouteSetFactory<Record<string, RouteDefinition>>;
};

export type RestAPI2RouteGroups<TRoutes extends Record<string, RouteDefinition>> = Record<string, RestAPI2RouteGroup<TRoutes>>;

export type RestAPI2RouteTreeRouteNode<TConcept extends string, TOwner extends string, TRoutes extends Record<string, RouteDefinition>> = {
    readonly concept: TConcept;
    readonly owner: TOwner;
    readonly routes: RouteSetFactory<TRoutes>;
    readonly groups?: RestAPI2RouteGroups<TRoutes>;
};

export type RestAPI2RouteTreeResolverNode<
    TConcept extends string,
    TOwner extends string,
    TRoutes extends Record<string, RouteDefinition>,
    TResolvers extends Record<string, ResolverDefinition>,
    TResolverArgs extends unknown[] = []
> = RestAPI2RouteTreeRouteNode<TConcept, TOwner, TRoutes> & {
    readonly resolvers: ResolverSetFactory<TResolvers, TResolverArgs>;
};

function routerFromRouteSet(routeSet: Record<string, RouteDefinition>, basePath?: string): RouterDefinition {
    return Object.values(routeSet).reduce((router, route) => router.route(route), Router.create({ basePath }));
}

function hubRouteSet() {
    return {
        ingressIdentity: Router.get("/ingress/identity", { schemas: { response: IngressIdentity } }),
        load: Router.get("/load", { schemas: { response: LoadResponse } }),
        version: Router.get("/version", { schemas: { response: VersionResponse } }),
        config: Router.get("/config", { schemas: { response: ConfigResponse } }),
        health: Router.get("/health", { schemas: { response: healthCheckInfo(Hub) } }),
        status: Router.get("/status", { schemas: { response: StatusResponse } }),
        sequences: Router.get("/sequences", { schemas: { response: listResponse(Sequence) } }),
        instances: Router.get("/instances", { schemas: { response: listResponse(Instance) } }),
        entities: Router.get("/entities", { schemas: { response: listResponse(Entity) } }),
        topics: Router.get("/topics", { schemas: { response: listResponse(Topic) } }),
        createTopic: Router.post("/topics", { schemas: { headers: RestAPI2Schemas.headers.http, body: TopicCreatePayload, response: opResponse(TopicCreateResponse) } }),
        deleteTopic: Router.route("delete", "/topics/:name", { schemas: { params: RestAPI2Schemas.params.topic, response: opResponse(TopicDeleteResponse) } }),
        topicRead: Router.get("/topics/:name/stream", {
            kind: "upstream",
            schemas: { params: RestAPI2Schemas.params.topic, headers: RestAPI2Schemas.headers.http, response: RestAPI2Schemas.stream }
        }),
        topicWrite: Router.post("/topics/:name/stream", {
            kind: "downstream",
            stream: { handlerValidatesContentType: true },
            schemas: { params: RestAPI2Schemas.params.topic, headers: RestAPI2Schemas.headers.http, response: opResponse(TopicStreamResponse) }
        }),
        logs: Router.get("/logs", { kind: "upstream", schemas: { response: LogRecord } }),
        audit: Router.get("/audit", { kind: "upstream", schemas: { response: RestAPI2Schemas.stream } })
    } as const;
}

function sequenceRouteSet() {
    return {
        sendSequence: Router.route("post", "/", { kind: "downstream", schemas: { response: opResponse(SequenceResponse) } }),
        updateSequence: Router.route("put", "/:sequenceId", {
            kind: "downstream",
            schemas: { params: RestAPI2Schemas.params.sequence, response: opResponse(SequenceResponse) }
        }),
        deleteSequence: Router.route("delete", "/:sequenceId", { schemas: { params: RestAPI2Schemas.params.sequence, response: opResponse(DeleteSequenceResponse) } }),
        startSequence: Router.post("/:sequenceId/instances", {
            schemas: { params: RestAPI2Schemas.params.sequence, body: StartSequencePayload, response: opResponse(StartSequenceResponse) }
        }),
        getSequence: Router.get("/:sequenceId", { schemas: { params: RestAPI2Schemas.params.sequence, response: SequenceResponse } }),
        getSequenceInstances: Router.get("/:sequenceId/instances", { schemas: { params: RestAPI2Schemas.params.sequence, response: listResponse(Instance) } })
    } as const;
}

function instanceRouteSet() {
    return {
        info: Router.get("/", { schemas: { response: InstanceResponse } }),
        deleteInstance: Router.route("delete", "/", { schemas: { body: DeleteInstancePayload, response: opResponse(DeleteInstanceResponse) } }),
        patchInstance: Router.route("patch", "/", { schemas: { body: InstanceParametersPatch, response: opResponse(InstanceParametersResponse) } }),
        stdio: Router.get("/stdio", { schemas: { response: StdIODescriptorList } }),
        health: Router.get("/health", { schemas: { response: healthCheckInfo(Instance) } }),
        output: Router.get("/output", { kind: "upstream", schemas: { response: RestAPI2Schemas.stream } }),
        logs: Router.get("/logs", { kind: "upstream", schemas: { response: LogRecord } }),
        monitoring: Router.get("/monitoring", { kind: "upstream", schemas: { response: MonitoringMessage } }),
        stdioRead: Router.get("/stdio/:fd", { kind: "upstream", schemas: { params: readableFdParam, response: RestAPI2Schemas.stream } }),
        input: Router.route("post", "/input", { kind: "downstream", schemas: { response: RestAPI2Schemas.stream } }),
        stdioWrite: Router.route("put", "/stdio/:fd", { kind: "downstream", schemas: { params: writableFdParam, response: RestAPI2Schemas.stream } }),
        getEvent: Router.get("/events/:name", { schemas: { params: RestAPI2Schemas.params.event, response: EventResponse } }),
        getNextEvent: Router.get("/events/:name/once", { schemas: { params: RestAPI2Schemas.params.event, response: EventResponse } }),
        sendEvent: Router.route("post", "/events", { schemas: { body: EventMessage, response: opResponse(SendEventResponse) } }),
        rpc: Router.route("post", "/rpc/*", { kind: "duplex", schemas: { body: RpcRequest, response: RpcResponse } })
    } as const;
}

function hubResolverSet() {
    return {
        instance: Router.resolve("/instances/:instanceId", {
            schemas: { params: RestAPI2Schemas.params.instance },
            targetDefinitions: { owner: "instance", definitions: instanceRouter(), mountPath: "/instances/:instanceId", implementerBasePath: "/" },
            handler: handlerless
        })
    } as const;
}

function spaceRouteSet() {
    return {
        ingressIdentity: Router.get("/ingress/identity", { schemas: { response: IngressIdentity } }),
        version: Router.get("/version", { schemas: { response: VersionResponse } }),
        config: Router.get("/config", { schemas: { response: ConfigResponse } }),
        trust: Router.get("/verser2/trust", { schemas: { response: TrustExport } }),
        load: Router.get("/load", { schemas: { response: LoadResponse } }),
        health: Router.get("/health", { schemas: { response: healthCheckInfo(Space) } }),
        list: Router.get("/list", { schemas: { query: RestAPI2Schemas.query.page, response: listResponse(Hub) } }),
        hubs: Router.get("/hubs", { schemas: { query: RestAPI2Schemas.query.page, response: listResponse(Hub) } }),
        instances: Router.get("/instances", { schemas: { query: RestAPI2Schemas.query.page, response: listResponse(Instance) } }),
        sequences: Router.get("/sequences", { schemas: { response: listResponse(Sequence) } }),
        allSequences: Router.get("/all_sequences", { schemas: { query: RestAPI2Schemas.query.page, response: listResponse(Sequence) } }),
        entities: Router.get("/entities", { schemas: { response: listResponse(Entity) } }),
        topics: Router.get("/topics", { schemas: { response: listResponse(Topic) } }),
        topicInfo: Router.get("/topics/:name", { schemas: { params: RestAPI2Schemas.params.topic, response: Topic } }),
        topicRead: Router.get("/topics/:name/stream", {
            kind: "upstream",
            schemas: { params: RestAPI2Schemas.params.topic, headers: RestAPI2Schemas.headers.http, response: RestAPI2Schemas.stream }
        }),
        topicWrite: Router.post("/topics/:name/stream", {
            kind: "downstream",
            stream: { handlerValidatesContentType: true },
            schemas: { params: RestAPI2Schemas.params.topic, headers: RestAPI2Schemas.headers.http, response: opResponse(TopicStreamResponse) }
        }),
        logs: Router.get("/logs", { kind: "upstream", schemas: { response: LogRecord } }),
        audit: Router.get("/audit", { kind: "upstream", schemas: { response: RestAPI2Schemas.stream } }),
        deleteHub: Router.route("delete", "/inventory/hubs/:hubId", {
            schemas: { params: RestAPI2Schemas.params.hub, query: DeleteHubQuery.optional(), response: opResponse(DeleteHubResponse) }
        }),
        storageSequences: Router.get("/storage/sequences", { schemas: { response: listResponse(StoreItem) } }),
        storageObjectRead: Router.get("/storage/objects/:directory/:filename?", { kind: "upstream", schemas: { params: StoreItemPayload, response: RestAPI2Schemas.stream } }),
        storageObjectWrite: Router.route("put", "/storage/objects/:filename?", { kind: "downstream", schemas: { params: StoreItemPayload, response: StoreItem } }),
        storageObjectDelete: Router.route("delete", "/storage/objects/:filename", { schemas: { params: StoreItemPayload, response: StoreItem } }),
        storageClear: Router.route("delete", "/storage", { schemas: { query: StoreClearQuery.optional(), response: StoreClearResponse } })
    } as const;
}

function spaceResolverSet(basePath = "/api/v2") {
    return {
        hub: Router.resolve("/hubs/:hubId", {
            schemas: { params: RestAPI2Schemas.params.hub },
            targetDefinitions: { owner: "hub", definitions: hubRouter(basePath), mountPath: "/hubs/:hubId", implementerBasePath: basePath },
            handler: handlerless
        })
    } as const;
}

function rootRouteSet() {
    return {
        ingressIdentity: Router.get("/ingress/identity", { schemas: { response: IngressIdentity } }),
        version: Router.get("/version", { schemas: { response: RestAPI2Schemas.root.version } }),
        info: Router.get("/info", { schemas: { response: RestAPI2Schemas.root.info } }),
        load: Router.get("/load", { schemas: { response: LoadResponse } }),
        spaces: Router.get("/spaces", { schemas: { query: RestAPI2Schemas.query.page, response: listResponse(Space) } }),
        health: Router.get("/health", { schemas: { response: healthCheckInfo(Root) } }),
        trust: Router.get("/verser2/trust/:id?", { schemas: { params: RestAPI2Schemas.params.trustSpace, response: TrustExport } }),
        audit: Router.get("/audit", { kind: "upstream", schemas: { response: RestAPI2Schemas.stream } })
    } as const;
}

function rootResolverSet(basePath = "/api/v2") {
    return {
        space: Router.resolve("/spaces/:spaceId", {
            schemas: { params: RestAPI2Schemas.params.space },
            targetDefinitions: { owner: "space", definitions: spaceRouter(basePath), mountPath: "/spaces/:spaceId", implementerBasePath: basePath },
            handler: handlerless
        })
    } as const;
}

export const RestAPI2RouteTree = {
    root: {
        concept: "root",
        owner: "root",
        routes: rootRouteSet,
        resolvers: rootResolverSet,
        children: {
            space: { resolver: "space", node: "space" }
        }
    },
    space: {
        concept: "space",
        owner: "space",
        routes: spaceRouteSet,
        resolvers: spaceResolverSet,
        children: {
            hub: { resolver: "hub", node: "hub" }
        }
    },
    hub: {
        concept: "hub",
        owner: "hub",
        routes: hubRouteSet,
        resolvers: hubResolverSet,
        groups: {
            sequence: { node: "sequence", routes: sequenceRouteSet },
            topics: { routeKeys: ["topics", "topicRead", "topicWrite"] },
            logs: { routeKeys: ["logs"] },
            audit: { routeKeys: ["audit"] }
        },
        children: {
            instance: { resolver: "instance", node: "instance" }
        }
    },
    sequence: {
        concept: "sequence",
        owner: "hub",
        routes: sequenceRouteSet
    },
    instance: {
        concept: "instance",
        owner: "instance",
        routes: instanceRouteSet,
        groups: {
            stdio: { routeKeys: ["stdio", "stdioRead", "stdioWrite"] },
            events: { routeKeys: ["getEvent", "getNextEvent", "sendEvent"] },
            rpc: { routeKeys: ["rpc"], opaque: true },
            logs: { routeKeys: ["logs"] },
            monitoring: { routeKeys: ["monitoring"] }
        }
    }
} as const;

function hubRoutesRouter(): RouterDefinition {
    return routerFromRouteSet(RestAPI2RouteTree.hub.routes());
}

function sequenceRouter(): RouterDefinition {
    return routerFromRouteSet(RestAPI2RouteTree.sequence.routes());
}

function instanceRouter(): RouterDefinition {
    return routerFromRouteSet(RestAPI2RouteTree.instance.routes());
}

function hubRouter(basePath = "/api/v2"): RouterDefinition {
    const resolver = RestAPI2RouteTree.hub.resolvers().instance;

    return Router.create({ basePath }).mount("/", hubRoutesRouter()).mount("/sequences", sequenceRouter()).resolve(resolver.path, resolver);
}

function spaceRouter(basePath = "/api/v2"): RouterDefinition {
    const resolver = RestAPI2RouteTree.space.resolvers(basePath).hub;

    return routerFromRouteSet(RestAPI2RouteTree.space.routes(), basePath).resolve(resolver.path, resolver);
}

function rootRouter(basePath = "/api/v2"): RouterDefinition {
    const resolver = RestAPI2RouteTree.root.resolvers(basePath).space;

    return routerFromRouteSet(RestAPI2RouteTree.root.routes(), basePath).resolve(resolver.path, resolver);
}

export const RestAPI2RouteSets = {
    root: { routes: RestAPI2RouteTree.root.routes, resolvers: RestAPI2RouteTree.root.resolvers },
    space: { routes: RestAPI2RouteTree.space.routes, resolvers: RestAPI2RouteTree.space.resolvers },
    hub: {
        routes: RestAPI2RouteTree.hub.routes,
        hubRoutes: RestAPI2RouteTree.hub.routes,
        sequenceRoutes: RestAPI2RouteTree.sequence.routes,
        resolvers: RestAPI2RouteTree.hub.resolvers
    },
    sequence: { routes: RestAPI2RouteTree.sequence.routes },
    instance: { routes: RestAPI2RouteTree.instance.routes }
};

export const RestAPI2Routes = {
    root: { router: rootRouter },
    space: { router: spaceRouter },
    hub: { router: hubRouter, hubRouter: hubRoutesRouter, sequenceRouter },
    sequence: { router: sequenceRouter },
    instance: { router: instanceRouter }
};

export function getOpaqueRouteKeys<TRoutes extends Record<string, RouteDefinition>>(
    node: RestAPI2RouteTreeRouteNode<string, string, TRoutes>
): Array<Extract<keyof TRoutes, string>> {
    return Object.values(node.groups || {})
        .filter((group) => group.opaque)
        .flatMap((group) => (group.routeKeys ? [...group.routeKeys] : [])) as Array<Extract<keyof TRoutes, string>>;
}

export function getRestAPI2Route(router: RouterDefinition, method: HttpMethod, path: string): RouteDefinition {
    const route = router.definitions().find((definition) => definition.method === method && definition.path === path);

    if (!route) {
        throw new Error(`Missing RestAPI2 route contract: ${method.toUpperCase()} ${path}`);
    }

    return route;
}
