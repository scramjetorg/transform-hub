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
            getById: (id: string) => id === "sth-1" ? { id, routeDomain: "sth-1.scramjet.internal", isConnectionActive: true } : undefined,
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
        getList: () => ({ hosts: [{ id: "sth-1" }] }),
        getInstances: () => ({ instances: [{ id: "inst-1", sequenceId: "seq-1" }] }),
        getSequencesIds: () => ({ sequences: ["seq-1"] }),
        getSequences: () => ({ sequences: [{ id: "seq-1", status: "ready" }] }),
        getEntities: () => ({ sequences: ["seq-1"], instances: ["inst-1"] }),
        getTopics: () => ({ topics: [] }),
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
    t.true(recorder.has("get", "/api/v2/list"));
    t.true(recorder.has("get", "/api/v2/hubs"));
    t.true(recorder.has("get", "/api/v2/instances"));
    t.true(recorder.has("get", "/api/v2/sequences"));
    t.true(recorder.has("get", "/api/v2/all_sequences"));
    t.true(recorder.has("get", "/api/v2/entities"));
    t.true(recorder.has("get", "/api/v2/topics"));
    t.true(recorder.has("use", "/api/v2/hubs/:hubId"));
    t.true(recorder.has("use", "/api/v2/hubs/:hubId/*"));
});

test("ManagerAPIHandler v2 read handlers return Manager data", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder);

    await new ManagerAPIHandler(manager as any).attach();

    t.deepEqual(await (recorder.require("get", "/api/v2/version").handler as Function)({}), {
        version: "0.0.0-test"
    });
    t.deepEqual(await (recorder.require("get", "/api/v2/config").handler as Function)({}), { config: { apiBase: "/api/v1" } });
    t.deepEqual(await (recorder.require("get", "/api/v2/load").handler as Function)({}), { load: 1 });
    t.deepEqual(await (recorder.require("get", "/api/v2/list").handler as Function)({ query: { offset: "1", limit: "2" } }), { items: [{ id: "sth-1" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/hubs").handler as Function)({ query: { offset: "1", limit: "2" } }), { items: [{ id: "sth-1" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/instances").handler as Function)({ query: {} }), { items: [{ id: "inst-1", sequenceId: "seq-1" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/sequences").handler as Function)({}), { items: [{ id: "seq-1" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/all_sequences").handler as Function)({ query: {} }), { items: [{ id: "seq-1", status: "ready" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/entities").handler as Function)({}), { items: [{ id: "seq-1", type: "sequence" }, { id: "inst-1", type: "instance" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/topics").handler as Function)({}), { items: [] });
});

test("ManagerAPIHandler v2 resolves Hub-owned routes with a verser2 redirect", async t => {
    const recorder = new RouteRecorder();

    await new ManagerAPIHandler(createManagerStub(recorder) as any).attach();

    const response = {
        statusCode: 200,
        headers: {} as Record<string, string>,
        writeHead(statusCode: number, headers: Record<string, string>) {
            this.statusCode = statusCode;
            this.headers = headers;
        },
        end() {}
    };
    const handler = recorder.require("use", "/api/v2/hubs/:hubId/*").handler as Function;

    await handler({ url: "/api/v2/hubs/sth-1/load", params: {}, headers: {} }, response, () => t.fail());

    t.is(response.statusCode, 308);
    t.is(response.headers.location, "http://sth-1.scramjet.internal/api/v2/load");
    t.is(response.headers["x-scramjet-route-domain"], "sth-1.scramjet.internal");
    t.is(response.headers["x-scramjet-route-target-path"], "/api/v2/load");
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
