import test from "ava";

import { ApiClientRequest, ApiClientTransport, HttpMethod, createRouter } from "@scramjet/api-router";
import { RestAPI2, RestAPI2Routes, createHubClient, createInstanceClient, createRestAPI2Client, createRootClient, createSpaceClient } from "../src";

const representativeOperations: Array<{ scope: RestAPI2.ScopeName; operationId: RestAPI2.OperationId; path: string }> = [
    { scope: "root", operationId: "GET /api/v2/spaces", path: "/spaces" },
    { scope: "space", operationId: "GET /api/v2/spaces/:spaceId/health", path: "/spaces/:spaceId/health" },
    { scope: "hub", operationId: "GET /api/v2/spaces/:spaceId/hubs/:hubId/status", path: "/spaces/:spaceId/hubs/:hubId/status" },
    { scope: "seq", operationId: "POST /api/v2/spaces/:spaceId/hubs/:hubId/sequences", path: "/spaces/:spaceId/hubs/:hubId/sequences" },
    { scope: "inst", operationId: "PATCH /api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId", path: "/spaces/:spaceId/hubs/:hubId/instances/:instanceId" },
    { scope: "audit", operationId: "GET /api/v2/spaces/:spaceId/audit", path: "/spaces/:spaceId/audit" },
    { scope: "stdio", operationId: "GET /api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId/stdio", path: "/spaces/:spaceId/hubs/:hubId/instances/:instanceId/stdio" },
    { scope: "rpc", operationId: "POST /api/v2/spaces/:spaceId/hubs/:hubId/rpc/*", path: "/spaces/:spaceId/hubs/:hubId/rpc/*" }
];

function createRepresentativeManifest() {
    const router = createRouter({ basePath: "/api/v2" });

    for (const operation of representativeOperations) {
        router.route({ method: operation.operationId.split(" ")[0].toLowerCase() as HttpMethod, path: operation.path });
    }

    return router.collect();
}

test("common client dispatches representative v2 operation ids through one transport", async t => {
    const seen: RestAPI2.OperationId[] = [];
    const transport: ApiClientTransport = {
        async request<T>(request: ApiClientRequest) {
            seen.push(request.route.id as RestAPI2.OperationId);

            return {
                status: 200,
                headers: { "x-scope": request.route.tags?.[0] || "unknown" },
                body: { operationId: request.route.id } as unknown as T
            };
        }
    };
    const client = createRestAPI2Client({ manifest: createRepresentativeManifest(), transport });

    for (const operation of representativeOperations) {
        const response = await client.request<{ operationId: string }>({ operationId: operation.operationId });

        t.is(response.operationId, operation.operationId);
        t.deepEqual(response.body, { operationId: operation.operationId });
    }

    t.deepEqual(seen, representativeOperations.map(operation => operation.operationId));
});

test("generic contract shapes are independent v2 outputs", t => {
    const list: RestAPI2.ListResponse<RestAPI2.Hub> = {
        items: [{ id: "hub-1", status: "ok" }],
        page: { offset: 0, limit: 1, total: 1 }
    };
    const op: RestAPI2.OpResponse<RestAPI2.DeleteInstanceResponse> = {
        operation: { id: "op-1", status: "completed" },
        result: { instanceId: "inst-1", mode: "kill", accepted: true }
    };
    const noContent: RestAPI2.NoContent<202> = { status: 202 };

    t.is(list.items[0].id, "hub-1");
    t.is(op.result?.mode, "kill");
    t.is(noContent.status, 202);
});

test("route ownership separates public paths from implementer paths", t => {
    const hubLoad: RestAPI2.RouteOwnership = {
        owner: "hub",
        operationId: "GET /api/v2/spaces/:spaceId/hubs/:hubId/load",
        publicPath: "/api/v2/spaces/:spaceId/hubs/:hubId/load",
        mountPath: "/api/v2/spaces/:spaceId/hubs/:hubId",
        implementerPath: "/load"
    };
    const stdio: RestAPI2.RouteOwnership = {
        owner: "hub",
        operationId: "GET /api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId/stdio",
        publicPath: "/api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId/stdio",
        mountPath: "/api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId",
        implementerPath: "/stdio"
    };

    t.is(hubLoad.implementerPath, "/load");
    t.false(hubLoad.implementerPath.includes(":spaceId"));
    t.false(hubLoad.implementerPath.includes(":hubId"));
    t.is(stdio.implementerPath, "/stdio");
    t.false(stdio.implementerPath.includes(":instanceId"));
});

test("shared v2 route contracts are handlerless and expose nested virtual paths", t => {
    const hostRoutes = RestAPI2Routes.hub.hubRouter().definitions();
    const expanded = RestAPI2Routes.root.router("/api/v2").collect({ expandResolvers: true });

    t.true(hostRoutes.every(route => !route.handler));
    t.true(expanded.routes.some(route => route.fullPath === "/api/v2/spaces/:spaceId/hubs/:hubId/load"));
    t.true(expanded.routes.some(route => route.fullPath === "/api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId/stdio"));
    t.true(expanded.routes.filter(route => route.virtual).every(route => route.id.startsWith(`${route.method.toUpperCase()} ${route.fullPath}`)));
});

test("fluent root client dispatches nested Root Space Hub and Instance routes", async t => {
    const seen: ApiClientRequest[] = [];
    const transport: ApiClientTransport = {
        async request<T>(request: ApiClientRequest) {
            seen.push(request);

            return { status: 200, headers: {}, body: { route: request.route.id, params: request.params } as unknown as T };
        }
    };
    const root = createRootClient({ transport });

    const rootHealth = await root.health.get();
    const spaceHealth = await root.space("space-1").health.get();
    const hubHealth = await root.space("space-1").hub("hub-1").health.get();
    const instanceHealth = await root.space("space-1").hub("hub-1").instance("inst-1").health.get();

    t.is((rootHealth.body as any).route, "GET /api/v2/health");
    t.is((spaceHealth.body as any).route, "GET /api/v2/spaces/:spaceId/health");
    t.is((hubHealth.body as any).route, "GET /api/v2/spaces/:spaceId/hubs/:hubId/health");
    t.is((instanceHealth.body as any).route, "GET /api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId/health");
    t.deepEqual(seen[1].params, { spaceId: "space-1" });
    t.deepEqual(seen[2].params, { spaceId: "space-1", hubId: "hub-1" });
    t.deepEqual(seen[3].params, { spaceId: "space-1", hubId: "hub-1", instanceId: "inst-1" });
});

test("direct level fluent clients dispatch through the manifest transport", async t => {
    const seen: ApiClientRequest[] = [];
    const transport: ApiClientTransport = {
        async request<T>(request: ApiClientRequest) {
            seen.push(request);

            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    };

    await createSpaceClient({ transport }).health.get();
    await createHubClient({ transport }).health.get();
    await createInstanceClient({ transport }).health.get();

    t.deepEqual(seen.map(request => request.route.id), [
        "GET /health",
        "GET /health",
        "GET /health"
    ]);
});

test("fluent client forwards body query and headers for representative endpoints", async t => {
    const seen: ApiClientRequest[] = [];
    const transport: ApiClientTransport = {
        async request<T>(request: ApiClientRequest) {
            seen.push(request);

            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    };

    await createRootClient({ transport }).space("space-1").hub("hub-1").createTopic.post({
        headers: { "content-type": "application/json" },
        body: { topic: { name: "topic-1", contentType: "application/json" } }
    });
    await createRootClient({ transport }).space("space-1").storageClear.delete({ query: { force: true } });

    t.deepEqual(seen[0].params, { spaceId: "space-1", hubId: "hub-1" });
    t.deepEqual(seen[0].headers, { "content-type": "application/json" });
    t.deepEqual(seen[0].body, { topic: { name: "topic-1", contentType: "application/json" } });
    t.deepEqual(seen[1].params, { spaceId: "space-1" });
    t.deepEqual(seen[1].query, { force: true });
});
