import baseTest from "ava";
const { createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";
import { readFileSync } from "fs";
import { resolve } from "path";

import { ApiClientRequest, createApiClient, registerVerser2Routes } from "@scramjet/api-router";
import { MultiManagerAPIV1Handler, MultiManagerAPIV2Handler } from "../src/lib/api/multi-manager-api";
import { ManagersStore } from "../src/lib/manager-store";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

function createMultiManagerStub(recorder: RouteRecorder) {
    return {
        apiServer: recorder.asApiExpose(),
        apiBase: "/api/v1",
        id: "mm-hotwire",
        config: { server: { apiPort: 20000 }, verser2: { localGuest: { routeDomain: "platform.test.scramjet.internal" } } },
        managersStore: new ManagersStore(),
        healthCheck: { getHealthCheckInfo: () => ({ healthy: true }) },
        getV2HealthCheckInfo: async () => ({
            scope: { id: "mm-hotwire", apiBase: "/api/v2", spaces: 0 },
            healthy: true,
            status: "healthy",
            components: [{ name: "multi-manager", healthy: true, status: "healthy" }, { name: "process.memory", healthy: true, status: "healthy" }],
            details: { healthy: true }
        }),
        logger: new ObjLogger("multi-manager-versioned-routing-test"),
        loadCheck: { getLoadCheck: async () => ({ load: 1 }) },
        service: "@scramjet/multi-manager",
        apiVersion: "v1",
        version: "0.0.0-test",
        build: "test-build",
        apiCommonLogsPipe: { getOut: () => new PassThrough() },
        handleListManagersRequest: () => [{ id: "manager-1" }],
        handleStartManagerRequest: async () => ({ id: "manager-1" }),
        cpmMiddleware: async () => undefined,
        commonAuditPipe: async () => new PassThrough()
    };
}

test("MultiManager low-risk routes are reachable through verser2 for v1 and v2", async t => {
    const multiManager = createMultiManagerStub(new RouteRecorder()) as any;
    const v1 = new MultiManagerAPIV1Handler(multiManager);
    const v2 = new MultiManagerAPIV2Handler(multiManager);
    const registrations: any[] = [];
    const adapter = { register: (registration: any) => registrations.push(registration) };

    registerVerser2Routes(adapter, v1.createV1Router());
    registerVerser2Routes(adapter, v2.createV2Router());

    t.deepEqual(registrations.map(registration => registration.fullPath), [
        "/api/v1/version",
        "/api/v1/info",
        "/api/v1/load-check",
        "/api/v1/list",
        "/api/v1/health",
        "/api/v1/verser2/trust/:id?",
        "/api/v2/ingress/identity",
        "/api/v2/version",
        "/api/v2/info",
        "/api/v2/load",
        "/api/v2/spaces",
        "/api/v2/health",
        "/api/v2/verser2/trust/:id?",
        "/api/v2/audit"
    ]);
    t.deepEqual(await registrations[0].handle({ method: "GET", path: "/api/v1/version" }), {
        status: 200,
        body: { service: "@scramjet/multi-manager", apiVersion: "v1", version: "0.0.0-test", build: "test-build" }
    });
    t.deepEqual(await registrations[6].handle({ method: "GET", path: "/api/v2/ingress/identity" }), {
        status: 200,
        body: { level: "platform", serviceId: "mm-hotwire", routeDomain: "platform.test.scramjet.internal" }
    });
    t.deepEqual(await registrations[7].handle({ method: "GET", path: "/api/v2/version" }), {
        status: 200,
        body: { service: "@scramjet/multi-manager", apiVersion: "v2", version: "0.0.0-test", build: "test-build" }
    });
});

test("MultiManager v2 manifest constructs a generic client", async t => {
    const handler = new MultiManagerAPIV2Handler(createMultiManagerStub(new RouteRecorder()) as any);
    const client = createApiClient(handler.createV2Router().collect(), {
        async request<T>(request: ApiClientRequest) {
            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    });

    t.deepEqual(await client.request("root.v2.health"), {
        status: 200,
        headers: {},
        body: { route: "root.v2.health" }
    });
    t.deepEqual(await client.request("root.v2.load"), {
        status: 200,
        headers: {},
        body: { route: "root.v2.load" }
    });
});

test("MultiManager v2 expanded manifest includes shared nested Space and Hub paths without Hub imports", t => {
    const handler = new MultiManagerAPIV2Handler(createMultiManagerStub(new RouteRecorder()) as any);
    const runtimeManifest = handler.createV2Router().collect();
    const expandedManifest = handler.createV2Router().collect({ expandResolvers: true });
    const source = readFileSync(resolve(__dirname, "../src/lib/api/multi-manager-api-v2.ts"), "utf8");

    t.false(runtimeManifest.routes.some(route => route.fullPath === "/api/v2/spaces/:spaceId/hubs/:hubId/load"));
    t.true(expandedManifest.routes.some(route => route.fullPath === "/api/v2/spaces/:spaceId/hubs/:hubId/load"));
    t.true(expandedManifest.routes.some(route => route.fullPath === "/api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId/stdio"));
    t.false(source.includes("@scramjet/host"));
    t.false(source.includes("packages/host"));
});
