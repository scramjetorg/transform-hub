import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

import { Manager } from "../src/lib/manager";
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
        apiSthConnectionStore: {
            getById: () => undefined,
            delete: async () => undefined
        },
        apiServiceDiscovery: { list: () => [] },
        apiLoadCheck: {
            getLoadCheck: async () => ({ load: 1 }),
            getLoadCheckStream: () => new PassThrough()
        },
        apiCommonLogsPipe: { getOut: () => new PassThrough() },
        apiS3Middleware: { clearIndex: async () => undefined },
        logger: new ObjLogger("manager-api-v2-hotwire-test"),
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

test("ManagerAPIHandler registers the v2 Manager API route surface separately", async t => {
    const recorder = new RouteRecorder();

    await new ManagerAPIHandler(createManagerStub(recorder) as any).attach();

    t.true(recorder.has("get", "/api/v2/version"));
    t.true(recorder.has("get", "/api/v2/config"));
    t.true(recorder.has("get", "/api/v2/verser2/trust"));
    t.true(recorder.has("get", "/api/v2/load"));
});

test("ManagerAPIHandler v2 read handlers return Manager data", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder);

    await new ManagerAPIHandler(manager as any).attach();

    t.deepEqual(await (recorder.require("get", "/api/v2/version").handler as Function)({}), {
        service: "@scramjet/manager",
        apiVersion: "v2",
        version: "0.0.0-test",
        build: "test-build"
    });
    t.deepEqual(await (recorder.require("get", "/api/v2/config").handler as Function)({}), { config: { apiBase: "/api/v1" } });
    t.deepEqual(await (recorder.require("get", "/api/v2/load").handler as Function)({}), { load: 1 });
});

test("Manager setupHealthEndpoint registers v2 health on the same API router", async t => {
    const recorder = new RouteRecorder();
    const healthCheck = { getHealthCheckInfo: () => ({ healthy: true }) };
    const manager = {
        _apiRouter: recorder.asApiRoute(),
        _config: { apiBase: "/api/v1" }
    };

    Manager.prototype.setupHealthEndpoint.call(manager as any, healthCheck as any);

    t.deepEqual(await (recorder.require("get", "/api/v2/health").handler as Function)({}), { healthy: true });
});
