import test from "ava";

import { ApiClientRequest, ApiClientTransport, HttpMethod, createRouter } from "@scramjet/api-router";
import { RestAPI2, createRestAPI2Client } from "../src";

const representativeOperations: Array<{ scope: RestAPI2.ScopeName; operationId: RestAPI2.OperationId; path: string }> = [
    { scope: "mmgr", operationId: "GET /api/v2/managers", path: "/managers" },
    { scope: "mgr", operationId: "GET /api/v2/managers/:managerId/health", path: "/managers/:managerId/health" },
    { scope: "hub", operationId: "GET /api/v2/managers/:managerId/hubs/:hubId/status", path: "/managers/:managerId/hubs/:hubId/status" },
    { scope: "seq", operationId: "POST /api/v2/managers/:managerId/hubs/:hubId/sequences", path: "/managers/:managerId/hubs/:hubId/sequences" },
    { scope: "inst", operationId: "PATCH /api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId", path: "/managers/:managerId/hubs/:hubId/instances/:instanceId" },
    { scope: "audit", operationId: "GET /api/v2/managers/:managerId/audit", path: "/managers/:managerId/audit" },
    { scope: "stdio", operationId: "GET /api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/stdio", path: "/managers/:managerId/hubs/:hubId/instances/:instanceId/stdio" },
    { scope: "rpc", operationId: "POST /api/v2/managers/:managerId/hubs/:hubId/rpc/*", path: "/managers/:managerId/hubs/:hubId/rpc/*" }
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
        owner: "host",
        operationId: "GET /api/v2/managers/:managerId/hubs/:hubId/load",
        publicPath: "/api/v2/managers/:managerId/hubs/:hubId/load",
        mountPath: "/api/v2/managers/:managerId/hubs/:hubId",
        implementerPath: "/load"
    };
    const stdio: RestAPI2.RouteOwnership = {
        owner: "host",
        operationId: "GET /api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/stdio",
        publicPath: "/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/stdio",
        mountPath: "/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId",
        implementerPath: "/stdio"
    };

    t.is(hubLoad.implementerPath, "/load");
    t.false(hubLoad.implementerPath.includes(":managerId"));
    t.false(hubLoad.implementerPath.includes(":hubId"));
    t.is(stdio.implementerPath, "/stdio");
    t.false(stdio.implementerPath.includes(":instanceId"));
});
