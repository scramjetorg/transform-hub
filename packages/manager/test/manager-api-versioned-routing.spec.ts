import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

import { ApiClientRequest, createApiClient, registerVerser2Routes } from "@scramjet/api-router";
import { ManagerAPIHandler } from "../src/lib/api/manager-api";
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
        getList: () => ({ hosts: [] }),
        getInstances: () => ({ instances: [] }),
        getSequencesIds: () => ({ sequences: [] }),
        getSequences: () => ({ sequences: [] }),
        getEntities: () => ({ sequences: [], instances: [] }),
        handleTopicUpstreamRequest: () => new PassThrough(),
        handleTopicDownstreamRequest: async () => undefined,
        handleRequestToSTH: () => undefined
    };
}

test("Manager low-risk routes are reachable through verser2 for v1 and v2", async t => {
    const handler = new ManagerAPIHandler(createManagerStub(new RouteRecorder()) as any) as any;
    const registrations: any[] = [];
    const adapter = { register: (registration: any) => registrations.push(registration) };

    registerVerser2Routes(adapter, handler.createLowRiskRouter("v1"));
    registerVerser2Routes(adapter, handler.createLowRiskRouter("v2"));

    t.deepEqual(registrations.map(registration => registration.fullPath), [
        "/api/v1/version",
        "/api/v1/config",
        "/api/v1/verser2/trust",
        "/api/v1/load",
        "/api/v2/version",
        "/api/v2/config",
        "/api/v2/verser2/trust",
        "/api/v2/load"
    ]);
    t.deepEqual(await registrations[0].handle({ method: "GET", path: "/api/v1/version" }), {
        status: 200,
        body: { service: "@scramjet/manager", apiVersion: "v1", version: "0.0.0-test", build: "test-build" }
    });
    t.deepEqual(await registrations[4].handle({ method: "GET", path: "/api/v2/version" }), {
        status: 200,
        body: { service: "@scramjet/manager", apiVersion: "v2", version: "0.0.0-test", build: "test-build" }
    });
});

test("Manager v2 manifest constructs a generic client", async t => {
    const handler = new ManagerAPIHandler(createManagerStub(new RouteRecorder()) as any) as any;
    const client = createApiClient(handler.createLowRiskRouter("v2").collect(), {
        async request<T>(request: ApiClientRequest) {
            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    });

    t.deepEqual(await client.request("manager.v2.load"), {
        status: 200,
        headers: {},
        body: { route: "manager.v2.load" }
    });
});
