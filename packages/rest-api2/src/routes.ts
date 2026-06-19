import { HttpMethod, RouteDefinition, Router, RouterDefinition } from "@scramjet/api-router";

import { RestAPI2Schemas } from "./schemas";

const handlerless = () => undefined;

function hostHubRouter(): RouterDefinition {
    return Router.create()
        .route(Router.get("/load", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.get("/version", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.get("/config", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.get("/status", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.get("/sequences", { schemas: { response: RestAPI2Schemas.list } }))
        .route(Router.get("/instances", { schemas: { response: RestAPI2Schemas.list } }))
        .route(Router.get("/entities", { schemas: { response: RestAPI2Schemas.list } }))
        .route(Router.get("/topics", { schemas: { response: RestAPI2Schemas.list } }))
        .route(Router.get("/logs", { kind: "upstream", schemas: { response: RestAPI2Schemas.stream } }))
        .route(Router.get("/audit", { kind: "upstream", schemas: { response: RestAPI2Schemas.stream } }));
}

function sequenceRouter(): RouterDefinition {
    return Router.create()
        .route(Router.route("post", "/", { kind: "downstream", schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.route("put", "/:sequenceId", { kind: "downstream", schemas: { params: RestAPI2Schemas.params.sequence, response: RestAPI2Schemas.empty } }))
        .route(Router.route("delete", "/:sequenceId", { schemas: { params: RestAPI2Schemas.params.sequence, response: RestAPI2Schemas.empty } }))
        .route(Router.post("/:sequenceId/instances", { schemas: { params: RestAPI2Schemas.params.sequence, response: RestAPI2Schemas.empty } }))
        .route(Router.get("/:sequenceId", { schemas: { params: RestAPI2Schemas.params.sequence, response: RestAPI2Schemas.empty } }))
        .route(Router.get("/:sequenceId/instances", { schemas: { params: RestAPI2Schemas.params.sequence, response: RestAPI2Schemas.list } }));
}

function instanceRouter(): RouterDefinition {
    return Router.create()
        .route(Router.get("/", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.route("delete", "/", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.route("patch", "/", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.get("/stdio", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.get("/health", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.get("/output", { kind: "upstream", schemas: { response: RestAPI2Schemas.stream } }))
        .route(Router.get("/logs", { kind: "upstream", schemas: { response: RestAPI2Schemas.stream } }))
        .route(Router.get("/monitoring", { kind: "upstream", schemas: { response: RestAPI2Schemas.stream } }))
        .route(Router.get("/stdio/:fd", { kind: "upstream", schemas: { params: RestAPI2Schemas.params.fd, response: RestAPI2Schemas.stream } }))
        .route(Router.route("post", "/input", { kind: "downstream", schemas: { response: RestAPI2Schemas.stream } }))
        .route(Router.route("put", "/stdio/:fd", { kind: "downstream", schemas: { params: RestAPI2Schemas.params.fd, response: RestAPI2Schemas.stream } }))
        .route(Router.get("/events/:name", { schemas: { params: RestAPI2Schemas.params.event, response: RestAPI2Schemas.empty } }))
        .route(Router.get("/events/:name/once", { schemas: { params: RestAPI2Schemas.params.event, response: RestAPI2Schemas.empty } }))
        .route(Router.route("post", "/events", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.route("post", "/rpc/*", { kind: "duplex", schemas: { response: RestAPI2Schemas.stream } }));
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
        .route(Router.get("/version", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.get("/config", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.get("/verser2/trust", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.get("/load", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.get("/list", { schemas: { query: RestAPI2Schemas.query.page, response: RestAPI2Schemas.list } }))
        .route(Router.get("/hubs", { schemas: { query: RestAPI2Schemas.query.page, response: RestAPI2Schemas.list } }))
        .route(Router.get("/instances", { schemas: { query: RestAPI2Schemas.query.page, response: RestAPI2Schemas.list } }))
        .route(Router.get("/sequences", { schemas: { response: RestAPI2Schemas.list } }))
        .route(Router.get("/all_sequences", { schemas: { query: RestAPI2Schemas.query.page, response: RestAPI2Schemas.list } }))
        .route(Router.get("/entities", { schemas: { response: RestAPI2Schemas.list } }))
        .route(Router.get("/topics", { schemas: { response: RestAPI2Schemas.list } }))
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
        .route(Router.get("/load", { schemas: { response: RestAPI2Schemas.stream } }))
        .route(Router.get("/list", { schemas: { response: RestAPI2Schemas.list } }))
        .route(Router.get("/health", { schemas: { response: RestAPI2Schemas.empty } }))
        .route(Router.get("/verser2/trust/:id?", { schemas: { params: RestAPI2Schemas.params.trustManager, response: RestAPI2Schemas.empty } }))
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
