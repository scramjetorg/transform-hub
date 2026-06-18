import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

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
        "/api/v2/instances",
        "/api/v2/sequences",
        "/api/v2/all_sequences",
        "/api/v2/entities",
        "/api/v2/topics"
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

    t.deepEqual(await client.request("manager.v2.load"), {
        status: 200,
        headers: {},
        body: { route: "manager.v2.load" }
    });
    t.deepEqual(await client.request("manager.v2.instances"), {
        status: 200,
        headers: {},
        body: { route: "manager.v2.instances" }
    });
});
