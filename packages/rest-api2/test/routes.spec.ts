import test from "ava";

import { bindRoutes, routeBinding } from "@scramjet/api-router";
import { RestAPI2RouteSets, RestAPI2Routes } from "../src";

test("typed route sets build the existing handlerless router factories", t => {
    const contract = RestAPI2Routes.host.hubRouter().collect();
    const routeSetRouter = bindRoutes(RestAPI2RouteSets.host.hubRoutes(), {
        load: routeBinding.contractOnly(),
        version: routeBinding.contractOnly(),
        config: routeBinding.contractOnly(),
        health: routeBinding.contractOnly(),
        status: routeBinding.contractOnly(),
        sequences: routeBinding.contractOnly(),
        instances: routeBinding.contractOnly(),
        entities: routeBinding.contractOnly(),
        topics: routeBinding.contractOnly(),
        createTopic: routeBinding.contractOnly(),
        deleteTopic: routeBinding.contractOnly(),
        topicRead: routeBinding.contractOnly(),
        topicWrite: routeBinding.contractOnly(),
        logs: routeBinding.contractOnly(),
        audit: routeBinding.contractOnly()
    }).collect();

    t.deepEqual(routeSetRouter.routes.map(route => `${route.method} ${route.fullPath}`), contract.routes.map(route => `${route.method} ${route.fullPath}`));
    t.true(RestAPI2Routes.host.hubRouter().definitions().every(route => !route.handler));
});

test("typed resolver route sets preserve resolver targets and nested virtual paths", t => {
    const managerResolver = RestAPI2RouteSets.manager.resolvers("/api/v2").hub;
    const multiManager = RestAPI2Routes.multiManager.router("/api/v2");
    const defaultManifest = multiManager.collect();
    const expanded = multiManager.collect({ expandResolvers: true });

    t.truthy(managerResolver.targetDefinitions);
    t.false(defaultManifest.routes.some(route => route.virtual));
    t.true(expanded.routes.some(route => route.fullPath === "/api/v2/managers/:managerId/hubs/:hubId/load"));
    t.true(expanded.routes.some(route => route.fullPath === "/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/stdio"));
});

test("manager route set exposes inventory hub delete and storage contracts", t => {
    const manifest = RestAPI2Routes.manager.router("/api/v2").collect();
    const paths = manifest.routes.map(route => `${route.method} ${route.fullPath}`);

    t.true(paths.includes("delete /api/v2/inventory/hubs/:hubId"));
    t.true(paths.includes("get /api/v2/logs"));
    t.true(paths.includes("get /api/v2/storage/sequences"));
    t.true(paths.includes("get /api/v2/storage/objects/:directory/:filename?"));
    t.true(paths.includes("put /api/v2/storage/objects/:filename?"));
    t.true(paths.includes("delete /api/v2/storage/objects/:filename"));
    t.true(paths.includes("delete /api/v2/storage"));
});
