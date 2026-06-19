import { HttpMethod, RouteDefinition, Router, RouterDefinition } from "@scramjet/api-router";

import {
    RestAPI2Schemas,
    AuditRecord,
    ConfigResponse,
    DeleteInstancePayload,
    DeleteInstanceResponse,
    DeleteSequenceResponse,
    Entity,
    EventMessage,
    EventResponse,
    HealthCheckInfo,
    Hub,
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
    StdIODescriptorList,
    Topic,
    TrustExport,
    VersionResponse,
    writableFdParam
} from "./schemas";

const handlerless = () => undefined;

function hostHubRouter(): RouterDefinition {
    return Router.create()
        .route(Router.get("/load", { schemas: { response: LoadResponse } }))
        .route(Router.get("/version", { schemas: { response: VersionResponse } }))
        .route(Router.get("/config", { schemas: { response: ConfigResponse } }))
        .route(Router.get("/status", { schemas: { response: StatusResponse } }))
        .route(Router.get("/sequences", { schemas: { response: listResponse(Sequence) } }))
        .route(Router.get("/instances", { schemas: { response: listResponse(Instance) } }))
        .route(Router.get("/entities", { schemas: { response: listResponse(Entity) } }))
        .route(Router.get("/topics", { schemas: { response: listResponse(Topic) } }))
        .route(Router.get("/logs", { kind: "upstream", schemas: { response: LogRecord } }))
        .route(Router.get("/audit", { kind: "upstream", schemas: { response: AuditRecord } }));
}

function sequenceRouter(): RouterDefinition {
    return Router.create()
        .route(Router.route("post", "/", { kind: "downstream", schemas: { body: SendSequencePayload, response: opResponse(SequenceResponse) } }))
        .route(Router.route("put", "/:sequenceId", { kind: "downstream", schemas: { params: RestAPI2Schemas.params.sequence, body: SendSequencePayload, response: opResponse(SequenceResponse) } }))
        .route(Router.route("delete", "/:sequenceId", { schemas: { params: RestAPI2Schemas.params.sequence, response: opResponse(DeleteSequenceResponse) } }))
        .route(Router.post("/:sequenceId/instances", { schemas: { params: RestAPI2Schemas.params.sequence, body: StartSequencePayload, response: opResponse(StartSequenceResponse) } }))
        .route(Router.get("/:sequenceId", { schemas: { params: RestAPI2Schemas.params.sequence, response: SequenceResponse } }))
        .route(Router.get("/:sequenceId/instances", { schemas: { params: RestAPI2Schemas.params.sequence, response: listResponse(Instance) } }));
}

function instanceRouter(): RouterDefinition {
    return Router.create()
        .route(Router.get("/", { schemas: { response: InstanceResponse } }))
        .route(Router.route("delete", "/", { schemas: { body: DeleteInstancePayload, response: opResponse(DeleteInstanceResponse) } }))
        .route(Router.route("patch", "/", { schemas: { body: InstanceParametersPatch, response: opResponse(InstanceParametersResponse) } }))
        .route(Router.get("/stdio", { schemas: { response: StdIODescriptorList } }))
        .route(Router.get("/health", { schemas: { response: HealthCheckInfo } }))
        .route(Router.get("/output", { kind: "upstream", schemas: { response: RestAPI2Schemas.stream } }))
        .route(Router.get("/logs", { kind: "upstream", schemas: { response: LogRecord } }))
        .route(Router.get("/monitoring", { kind: "upstream", schemas: { response: MonitoringMessage } }))
        .route(Router.get("/stdio/:fd", { kind: "upstream", schemas: { params: readableFdParam, response: RestAPI2Schemas.stream } }))
        .route(Router.route("post", "/input", { kind: "downstream", schemas: { response: RestAPI2Schemas.stream } }))
        .route(Router.route("put", "/stdio/:fd", { kind: "downstream", schemas: { params: writableFdParam, response: RestAPI2Schemas.stream } }))
        .route(Router.get("/events/:name", { schemas: { params: RestAPI2Schemas.params.event, response: EventResponse } }))
        .route(Router.get("/events/:name/once", { schemas: { params: RestAPI2Schemas.params.event, response: EventResponse } }))
        .route(Router.route("post", "/events", { schemas: { body: EventMessage, response: opResponse(SendEventResponse) } }))
        .route(Router.route("post", "/rpc/*", { kind: "duplex", schemas: { body: RpcRequest, response: RpcResponse } }));
}

function hostRouter(basePath = "/api/v2"): RouterDefinition {
    return Router.create({ basePath })
        .mount("/", hostHubRouter())
        .mount("/sequences", sequenceRouter())
        .resolve("/instances/:instanceId", {
            schemas: { params: RestAPI2Schemas.params.instance },
            targetDefinitions: { owner: "inst", definitions: instanceRouter(), mountPath: "/instances/:instanceId", implementerBasePath: "/" },
            handler: handlerless
        });
}

function managerRouter(basePath = "/api/v2"): RouterDefinition {
    return Router.create({ basePath })
        .route(Router.get("/version", { schemas: { response: VersionResponse } }))
        .route(Router.get("/config", { schemas: { response: ConfigResponse } }))
        .route(Router.get("/verser2/trust", { schemas: { response: TrustExport } }))
        .route(Router.get("/load", { schemas: { response: LoadResponse } }))
        .route(Router.get("/list", { schemas: { query: RestAPI2Schemas.query.page, response: listResponse(Hub) } }))
        .route(Router.get("/hubs", { schemas: { query: RestAPI2Schemas.query.page, response: listResponse(Hub) } }))
        .route(Router.get("/instances", { schemas: { query: RestAPI2Schemas.query.page, response: listResponse(Instance) } }))
        .route(Router.get("/sequences", { schemas: { response: listResponse(Sequence) } }))
        .route(Router.get("/all_sequences", { schemas: { query: RestAPI2Schemas.query.page, response: listResponse(Sequence) } }))
        .route(Router.get("/entities", { schemas: { response: listResponse(Entity) } }))
        .route(Router.get("/topics", { schemas: { response: listResponse(Topic) } }))
        .resolve("/hubs/:hubId", {
            schemas: { params: RestAPI2Schemas.params.hub },
            targetDefinitions: { owner: "host", definitions: hostRouter(basePath), mountPath: "/hubs/:hubId", implementerBasePath: basePath },
            handler: handlerless
        });
}

function multiManagerRouter(basePath = "/api/v2"): RouterDefinition {
    return Router.create({ basePath })
        .route(Router.get("/version", { schemas: { response: RestAPI2Schemas.multiManager.version } }))
        .route(Router.get("/info", { schemas: { response: RestAPI2Schemas.multiManager.info } }))
        .route(Router.get("/load", { schemas: { response: LoadResponse } }))
        .route(Router.get("/list", { schemas: { response: listResponse(MultiManager) } }))
        .route(Router.get("/health", { schemas: { response: HealthCheckInfo } }))
        .route(Router.get("/verser2/trust/:id?", { schemas: { params: RestAPI2Schemas.params.trustManager, response: TrustExport } }))
        .resolve("/managers/:managerId", {
            schemas: { params: RestAPI2Schemas.params.manager },
            targetDefinitions: { owner: "mgr", definitions: managerRouter(basePath), mountPath: "/managers/:managerId", implementerBasePath: basePath },
            handler: handlerless
        });
}

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
