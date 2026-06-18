import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

import { ApiClientRequest, createApiClient, registerVerser2Routes } from "@scramjet/api-router";
import { MultiManagerAPIHandler } from "../src/lib/api/multi-manager-api";
import { ManagersStore } from "../src/lib/manager-store";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

function createMultiManagerStub(recorder: RouteRecorder) {
    return {
        apiServer: recorder.asApiExpose(),
        apiBase: "/api/v1",
        id: "mm-hotwire",
        config: { server: { apiPort: 20000 }, verser2: {} },
        managersStore: new ManagersStore(),
        healthCheck: { getHealthCheckInfo: () => ({ healthy: true }) },
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
    const handler = new MultiManagerAPIHandler(createMultiManagerStub(new RouteRecorder()) as any) as any;
    const registrations: any[] = [];
    const adapter = { register: (registration: any) => registrations.push(registration) };

    registerVerser2Routes(adapter, handler.createLowRiskRouter("v1"));
    registerVerser2Routes(adapter, handler.createLowRiskRouter("v2"));

    t.deepEqual(registrations.map(registration => registration.fullPath), [
        "/api/v1/version",
        "/api/v1/info",
        "/api/v1/load-check",
        "/api/v1/list",
        "/api/v1/health",
        "/api/v1/verser2/trust/:id?",
        "/api/v2/version",
        "/api/v2/info",
        "/api/v2/load-check",
        "/api/v2/list",
        "/api/v2/health",
        "/api/v2/verser2/trust/:id?"
    ]);
    t.deepEqual(await registrations[0].handle({ method: "GET", path: "/api/v1/version" }), {
        status: 200,
        body: { service: "@scramjet/multi-manager", apiVersion: "v1", version: "0.0.0-test", build: "test-build" }
    });
    t.deepEqual(await registrations[6].handle({ method: "GET", path: "/api/v2/version" }), {
        status: 200,
        body: { service: "@scramjet/multi-manager", apiVersion: "v2", version: "0.0.0-test", build: "test-build" }
    });
});

test("MultiManager v2 manifest constructs a generic client", async t => {
    const handler = new MultiManagerAPIHandler(createMultiManagerStub(new RouteRecorder()) as any) as any;
    const client = createApiClient(handler.createLowRiskRouter("v2").collect(), {
        async request<T>(request: ApiClientRequest) {
            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    });

    t.deepEqual(await client.request("multi-manager.v2.health"), {
        status: 200,
        headers: {},
        body: { route: "multi-manager.v2.health" }
    });
});
