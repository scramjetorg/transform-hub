import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";
import { readFileSync } from "fs";
import { resolve } from "path";

import { ApiClientRequest, createApiClient, registerVerser2Routes } from "@scramjet/api-router";
import { ManagerAPIV1Handler, ManagerAPIV2Handler } from "../src/lib/api/manager-api";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

function createManagerStub(recorder: RouteRecorder) {
    return {
        id: "manager-hotwire",
        router: recorder.asApiRoute(),
        config: { apiBase: "/api/v1" },
        publicConfig: { apiBase: "/api/v1" },
        service: "@scramjet/manager",
        apiVersion: "v1",
        version: "0.0.0-test",
        build: "test-build",
        apiSthConnectionStore: { getById: () => undefined, delete: async () => undefined },
        apiServiceDiscovery: { list: () => [] },
        apiLoadCheck: { getLoadCheck: async () => ({ load: 1 }), getLoadCheckStream: () => new PassThrough() },
        apiCommonLogsPipe: { getOut: () => new PassThrough() },
        apiS3Middleware: { clearIndex: async () => undefined },
        logger: new ObjLogger("manager-versioned-routing-test"),
        handleSthRegistration: async () => "sth-1",
        validateQueries: () => true,
        getList: () => ({ hosts: [{ id: "sth-1" }] }),
        getInstances: () => ({ instances: [{ id: "inst-1" }] }),
        getSequencesIds: () => ({ sequences: ["seq-1"] }),
        getSequences: () => ({ sequences: [{ id: "seq-1" }] }),
        getEntities: () => ({ sequences: ["seq-1"], instances: ["inst-1"] }),
        handleTopicUpstreamRequest: () => new PassThrough(),
        handleTopicDownstreamRequest: async () => undefined,
        handleRequestToSTH: () => undefined
    };
}

test("Manager low-risk routes are reachable through verser2 for v1 and v2", async t => {
    const manager = createManagerStub(new RouteRecorder()) as any;
    const v1 = new ManagerAPIV1Handler(manager) as any;
    const v2 = new ManagerAPIV2Handler(manager);
    const registrations: any[] = [];
    const adapter = { register: (registration: any) => registrations.push(registration) };

    registerVerser2Routes(adapter, v1.createV1CompatibilityRouter());
    registerVerser2Routes(adapter, v2.createV2Router());

    t.deepEqual(registrations.map(registration => registration.fullPath), [
        "/api/v1/version",
        "/api/v1/config",
        "/api/v1/verser2/trust",
        "/api/v1/load",
        "/api/v2/version",
        "/api/v2/config",
        "/api/v2/verser2/trust",
        "/api/v2/load",
        "/api/v2/list",
        "/api/v2/hubs",
        "/api/v2/instances",
        "/api/v2/sequences",
        "/api/v2/all_sequences",
        "/api/v2/entities",
        "/api/v2/topics",
        "/api/v2/topics/:name",
        "/api/v2/topics/:name/stream",
        "/api/v2/topics/:name/stream",
        "/api/v2/logs",
        "/api/v2/audit",
        "/api/v2/inventory/hubs/:hubId",
        "/api/v2/storage/sequences",
        "/api/v2/storage"
    ]);
    t.deepEqual(await registrations[0].handle({ method: "GET", path: "/api/v1/version" }), {
        status: 200,
        body: { service: "@scramjet/manager", apiVersion: "v1", version: "0.0.0-test", build: "test-build" }
    });
    t.deepEqual(await registrations[4].handle({ method: "GET", path: "/api/v2/version" }), {
        status: 200,
        body: { version: "0.0.0-test" }
    });
});

test("Manager v2 manifest constructs a generic client", async t => {
    const handler = new ManagerAPIV2Handler(createManagerStub(new RouteRecorder()) as any);
    const client = createApiClient(handler.createV2Router().collect(), {
        async request<T>(request: ApiClientRequest) {
            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    });

    t.deepEqual(await client.request("space.v2.load"), {
        status: 200,
        headers: {},
        body: { route: "space.v2.load" }
    });
    t.deepEqual(await client.request("space.v2.instances"), {
        status: 200,
        headers: {},
        body: { route: "space.v2.instances" }
    });
});

test("Manager v2 expanded manifest includes shared Host paths without Host imports", t => {
    const handler = new ManagerAPIV2Handler(createManagerStub(new RouteRecorder()) as any);
    const runtimeManifest = handler.createV2Router().collect();
    const expandedManifest = handler.createV2Router().collect({ expandResolvers: true });
    const source = readFileSync(resolve(__dirname, "../src/lib/api/manager-api-v2.ts"), "utf8");

    t.false(runtimeManifest.routes.some(route => route.fullPath === "/api/v2/hubs/:hubId/load"));
    t.true(expandedManifest.routes.some(route => route.fullPath === "/api/v2/hubs/:hubId/load"));
    t.true(expandedManifest.routes.some(route => route.fullPath === "/api/v2/hubs/:hubId/instances/:instanceId/stdio"));
    t.false(source.includes("@scramjet/host"));
    t.false(source.includes("packages/host"));
});
