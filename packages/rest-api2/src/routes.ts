import { HttpMethod, RouteDefinition, Router, RouterDefinition } from "@scramjet/api-router";

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
    healthCheckInfo,
    Instance,
    InstanceParametersPatch,
    InstanceParametersResponse,
    InstanceResponse,
    listResponse,
    LoadResponse,
    MultiManager,
    LogRecord,
    MonitoringMessage,
    opResponse,
    readableFdParam,
    RpcRequest,
    RpcResponse,
    SendEventResponse,
    Sequence,
    SendSequencePayload,
    SequenceResponse,
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

function routerFromRouteSet(routeSet: Record<string, RouteDefinition>, basePath?: string): RouterDefinition {
    return Object.values(routeSet).reduce((router, route) => router.route(route), Router.create({ basePath }));
}

function hostHubRouteSet() {
    return {
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
        topicRead: Router.get("/topics/:name/stream", { kind: "upstream", schemas: { params: RestAPI2Schemas.params.topic, headers: RestAPI2Schemas.headers.http, response: RestAPI2Schemas.stream } }),
        topicWrite: Router.post("/topics/:name/stream", { kind: "downstream", schemas: { params: RestAPI2Schemas.params.topic, headers: RestAPI2Schemas.headers.http, response: opResponse(TopicStreamResponse) } }),
        logs: Router.get("/logs", { kind: "upstream", schemas: { response: LogRecord } }),
        audit: Router.get("/audit", { kind: "upstream", schemas: { response: RestAPI2Schemas.stream } })
    } as const;
}

function hostSequenceRouteSet() {
    return {
        sendSequence: Router.route("post", "/", { kind: "downstream", schemas: { body: SendSequencePayload, response: opResponse(SequenceResponse) } }),
        updateSequence: Router.route("put", "/:sequenceId", { kind: "downstream", schemas: { params: RestAPI2Schemas.params.sequence, body: SendSequencePayload, response: opResponse(SequenceResponse) } }),
        deleteSequence: Router.route("delete", "/:sequenceId", { schemas: { params: RestAPI2Schemas.params.sequence, response: opResponse(DeleteSequenceResponse) } }),
        startSequence: Router.post("/:sequenceId/instances", { schemas: { params: RestAPI2Schemas.params.sequence, body: StartSequencePayload, response: opResponse(StartSequenceResponse) } }),
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

function hostResolverSet() {
    return {
        instance: Router.resolve("/instances/:instanceId", {
            schemas: { params: RestAPI2Schemas.params.instance },
            // eslint-disable-next-line no-use-before-define
            targetDefinitions: { owner: "inst", definitions: instanceRouter(), mountPath: "/instances/:instanceId", implementerBasePath: "/" },
            handler: handlerless
        })
    } as const;
}

function managerRouteSet() {
    return {
        version: Router.get("/version", { schemas: { response: VersionResponse } }),
        config: Router.get("/config", { schemas: { response: ConfigResponse } }),
        trust: Router.get("/verser2/trust", { schemas: { response: TrustExport } }),
        load: Router.get("/load", { schemas: { response: LoadResponse } }),
        list: Router.get("/list", { schemas: { query: RestAPI2Schemas.query.page, response: listResponse(Hub) } }),
        hubs: Router.get("/hubs", { schemas: { query: RestAPI2Schemas.query.page, response: listResponse(Hub) } }),
        instances: Router.get("/instances", { schemas: { query: RestAPI2Schemas.query.page, response: listResponse(Instance) } }),
        sequences: Router.get("/sequences", { schemas: { response: listResponse(Sequence) } }),
        allSequences: Router.get("/all_sequences", { schemas: { query: RestAPI2Schemas.query.page, response: listResponse(Sequence) } }),
        entities: Router.get("/entities", { schemas: { response: listResponse(Entity) } }),
        topics: Router.get("/topics", { schemas: { response: listResponse(Topic) } }),
        topicInfo: Router.get("/topics/:name", { schemas: { params: RestAPI2Schemas.params.topic, response: Topic } }),
        topicRead: Router.get("/topics/:name/stream", { kind: "upstream", schemas: { params: RestAPI2Schemas.params.topic, headers: RestAPI2Schemas.headers.http, response: RestAPI2Schemas.stream } }),
        topicWrite: Router.post("/topics/:name/stream", { kind: "downstream", schemas: { params: RestAPI2Schemas.params.topic, headers: RestAPI2Schemas.headers.http, response: opResponse(TopicStreamResponse) } }),
        logs: Router.get("/logs", { kind: "upstream", schemas: { response: LogRecord } }),
        audit: Router.get("/audit", { kind: "upstream", schemas: { response: RestAPI2Schemas.stream } }),
        deleteHub: Router.route("delete", "/inventory/hubs/:hubId", { schemas: { params: RestAPI2Schemas.params.hub, query: DeleteHubQuery.optional(), response: opResponse(DeleteHubResponse) } }),
        storageSequences: Router.get("/storage/sequences", { schemas: { response: listResponse(StoreItem) } }),
        storageObjectRead: Router.get("/storage/objects/:directory/:filename?", { kind: "upstream", schemas: { params: StoreItemPayload, response: RestAPI2Schemas.stream } }),
        storageObjectWrite: Router.route("put", "/storage/objects/:filename?", { kind: "downstream", schemas: { params: StoreItemPayload, response: StoreItem } }),
        storageObjectDelete: Router.route("delete", "/storage/objects/:filename", { schemas: { params: StoreItemPayload, response: StoreItem } }),
        storageClear: Router.route("delete", "/storage", { schemas: { query: StoreClearQuery.optional(), response: StoreClearResponse } })
    } as const;
}

function managerResolverSet(basePath = "/api/v2") {
    return {
        hub: Router.resolve("/hubs/:hubId", {
            schemas: { params: RestAPI2Schemas.params.hub },
            // eslint-disable-next-line no-use-before-define
            targetDefinitions: { owner: "host", definitions: hostRouter(basePath), mountPath: "/hubs/:hubId", implementerBasePath: basePath },
            handler: handlerless
        })
    } as const;
}

function multiManagerRouteSet() {
    return {
        version: Router.get("/version", { schemas: { response: RestAPI2Schemas.multiManager.version } }),
        info: Router.get("/info", { schemas: { response: RestAPI2Schemas.multiManager.info } }),
        load: Router.get("/load", { schemas: { response: LoadResponse } }),
        list: Router.get("/list", { schemas: { response: listResponse(MultiManager) } }),
        health: Router.get("/health", { schemas: { response: healthCheckInfo(MultiManager) } }),
        trust: Router.get("/verser2/trust/:id?", { schemas: { params: RestAPI2Schemas.params.trustManager, response: TrustExport } }),
        audit: Router.get("/audit", { kind: "upstream", schemas: { response: RestAPI2Schemas.stream } })
    } as const;
}

function multiManagerResolverSet(basePath = "/api/v2") {
    return {
        manager: Router.resolve("/managers/:managerId", {
            schemas: { params: RestAPI2Schemas.params.manager },
            // eslint-disable-next-line no-use-before-define
            targetDefinitions: { owner: "mgr", definitions: managerRouter(basePath), mountPath: "/managers/:managerId", implementerBasePath: basePath },
            handler: handlerless
        })
    } as const;
}

function hostHubRouter(): RouterDefinition {
    return routerFromRouteSet(hostHubRouteSet());
}

function sequenceRouter(): RouterDefinition {
    return routerFromRouteSet(hostSequenceRouteSet());
}

function instanceRouter(): RouterDefinition {
    return routerFromRouteSet(instanceRouteSet());
}

function hostRouter(basePath = "/api/v2"): RouterDefinition {
    return Router.create({ basePath })
        .mount("/", hostHubRouter())
        .mount("/sequences", sequenceRouter())
        .resolve(hostResolverSet().instance.path, hostResolverSet().instance);
}

function managerRouter(basePath = "/api/v2"): RouterDefinition {
    const resolver = managerResolverSet(basePath).hub;

    return routerFromRouteSet(managerRouteSet(), basePath)
        .resolve(resolver.path, resolver);
}

function multiManagerRouter(basePath = "/api/v2"): RouterDefinition {
    const resolver = multiManagerResolverSet(basePath).manager;

    return routerFromRouteSet(multiManagerRouteSet(), basePath)
        .resolve(resolver.path, resolver);
}

export const RestAPI2RouteSets = {
    multiManager: { routes: multiManagerRouteSet, resolvers: multiManagerResolverSet },
    manager: { routes: managerRouteSet, resolvers: managerResolverSet },
    host: { routes: hostHubRouteSet, hubRoutes: hostHubRouteSet, sequenceRoutes: hostSequenceRouteSet, resolvers: hostResolverSet },
    instance: { routes: instanceRouteSet }
};

export const RestAPI2Routes = {
    multiManager: { router: multiManagerRouter },
    manager: { router: managerRouter },
    host: { router: hostRouter, hubRouter: hostHubRouter, sequenceRouter },
    instance: { router: instanceRouter }
};

export function getRestAPI2Route(router: RouterDefinition, method: HttpMethod, path: string): RouteDefinition {
    const route = router.definitions().find(definition => definition.method === method && definition.path === path);

    if (!route) {
        throw new Error(`Missing RestAPI2 route contract: ${method.toUpperCase()} ${path}`);
    }

    return route;
}
