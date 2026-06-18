import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

import { ApiClientRequest, createApiClient, registerVerser2Routes } from "@scramjet/api-router";
import { createRestAPI2Client } from "@scramjet/rest-api2";
import { HostAPIHandler } from "../src/lib/api/host-api";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

function createHostStub(): any {
    return {
        apiBase: "/api/v1",
        instanceBase: "/api/v1/instance",
        heartBeatInterval: 1000,
        logger: new ObjLogger("host-versioned-routing-test"),
        auditor: {},
        service: "sth",
        apiVersion: "v1",
        loadCheck: { getLoadCheck: () => ({ load: 1 }) },
        commonLogsPipe: { getOut: () => new PassThrough() },
        serviceDiscovery: {},
        cpmConnector: undefined,
        instancesStore: {
            getByExposePath: () => [],
            getByNameOrId: () => undefined,
            has: () => false,
            hasName: () => false,
            hasReservedId: () => false
        },
        sequenceStore: { getById: () => undefined },
        deleteSequence: async () => undefined,
        startSequence: async () => ({ id: "inst-1", limits: {} }),
        addSequence: async (id: string) => ({ id }),
        publicConfig: { apiBase: "/api/v1" },
        getSequence: () => ({}),
        getSequenceInstances: () => [],
        getSequences: () => [{ id: "seq-1", status: "ready" }],
        getInstances: () => [{ id: "inst-1", sequenceId: "seq-1", status: "running" }],
        getStatus: () => ({ status: "ok" })
    };
}

test("Host low-risk routes are reachable through verser2 for v1 and v2", async t => {
    const handler = new HostAPIHandler(new RouteRecorder().asApiExpose(), createHostStub(), "1.2.3", "build") as any;
    const registrations: any[] = [];
    const adapter = { register: (registration: any) => registrations.push(registration) };

    registerVerser2Routes(adapter, handler.createLowRiskRouter("v1"));
    registerVerser2Routes(adapter, handler.createV2Router());

    t.deepEqual(registrations.slice(0, 8).map(registration => registration.fullPath), [
        "/api/v1/load-check",
        "/api/v1/version",
        "/api/v1/config",
        "/api/v1/status",
        "/api/v2/load",
        "/api/v2/version",
        "/api/v2/config",
        "/api/v2/status"
    ]);
    t.true(registrations.some(registration => registration.fullPath === "/api/v2/sequences/:sequenceId"));
    t.true(registrations.some(registration => registration.fullPath === "/api/v2/sequences/:sequenceId/instances"));
    t.true(registrations.some(registration => registration.fullPath === "/api/v2/logs"));
    t.true(registrations.some(registration => registration.fullPath === "/api/v2/audit"));
    t.deepEqual(await registrations[1].handle({ method: "GET", path: "/api/v1/version" }), {
        status: 200,
        body: { service: "sth", apiVersion: "v1", version: "1.2.3", build: "build" }
    });
    t.deepEqual(await registrations[5].handle({ method: "GET", path: "/api/v2/version" }), {
        status: 200,
        body: { version: "1.2.3" }
    });
});

test("Host v2 manifest constructs a generic client", async t => {
    const handler = new HostAPIHandler(new RouteRecorder().asApiExpose(), createHostStub(), "1.2.3", "build") as any;
    const client = createApiClient(handler.createV2Router().collect(), {
        async request<T>(request: ApiClientRequest) {
            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    });

    t.deepEqual(await client.request("GET /api/v2/status"), {
        status: 200,
        headers: {},
        body: { route: "GET /api/v2/status" }
    });
});

test("Host-owned Hub v2 routes are mounted locally and reachable through verser2 and RestAPI2 client", async t => {
    const handler = new HostAPIHandler(new RouteRecorder().asApiExpose(), createHostStub(), "1.2.3", "build") as any;
    const registrations: any[] = [];
    const adapter = { register: (registration: any) => registrations.push(registration) };

    registerVerser2Routes(adapter, handler.createV2Router());

    t.true(registrations.some(registration => registration.fullPath === "/api/v2/status"));
    t.false(registrations.some(registration => registration.fullPath.includes(":managerId") || registration.fullPath.includes(":hubId")));
    t.deepEqual(handler.createHubRouter().definitions().map((route: any) => route.path), [
        "/load",
        "/version",
        "/config",
        "/status",
        "/sequences",
        "/instances",
        "/entities",
        "/topics",
        "/logs",
        "/audit"
    ]);
    t.deepEqual(await registrations.find(registration => registration.fullPath === "/api/v2/version").handle({
        method: "GET",
        path: "/api/v2/version",
        params: {}
    }), {
        status: 200,
        body: { version: "1.2.3" }
    });

    const client = createRestAPI2Client({
        manifest: handler.createV2Router().collect(),
        transport: {
            async request<T>(request: ApiClientRequest) {
                return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
            }
        }
    });

    t.deepEqual(await client.request({ operationId: "GET /api/v2/status" }), {
        operationId: "GET /api/v2/status",
        status: 200,
        headers: {},
        body: { route: "GET /api/v2/status" }
    });
});
