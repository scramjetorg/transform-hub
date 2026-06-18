import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

import { ApiClientRequest, createApiClient, registerVerser2Routes } from "@scramjet/api-router";
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
        getSequences: () => [],
        getInstances: () => [],
        getStatus: () => ({ status: "ok" })
    };
}

test("Host low-risk routes are reachable through verser2 for v1 and v2", async t => {
    const handler = new HostAPIHandler(new RouteRecorder().asApiExpose(), createHostStub(), "1.2.3", "build") as any;
    const registrations: any[] = [];
    const adapter = { register: (registration: any) => registrations.push(registration) };

    registerVerser2Routes(adapter, handler.createLowRiskRouter("v1"));
    registerVerser2Routes(adapter, handler.createLowRiskRouter("v2"));

    t.deepEqual(registrations.map(registration => registration.fullPath), [
        "/api/v1/load-check",
        "/api/v1/version",
        "/api/v1/config",
        "/api/v1/status",
        "/api/v2/load-check",
        "/api/v2/version",
        "/api/v2/config",
        "/api/v2/status"
    ]);
    t.deepEqual(await registrations[1].handle({ method: "GET", path: "/api/v1/version" }), {
        status: 200,
        body: { service: "sth", apiVersion: "v1", version: "1.2.3", build: "build" }
    });
    t.deepEqual(await registrations[5].handle({ method: "GET", path: "/api/v2/version" }), {
        status: 200,
        body: { service: "sth", apiVersion: "v2", version: "1.2.3", build: "build" }
    });
});

test("Host v2 manifest constructs a generic client", async t => {
    const handler = new HostAPIHandler(new RouteRecorder().asApiExpose(), createHostStub(), "1.2.3", "build") as any;
    const client = createApiClient(handler.createLowRiskRouter("v2").collect(), {
        async request<T>(request: ApiClientRequest) {
            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    });

    t.deepEqual(await client.request("host.v2.status"), {
        status: 200,
        headers: {},
        body: { route: "host.v2.status" }
    });
});
