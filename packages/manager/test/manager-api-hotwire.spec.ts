import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

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
            getLoadCheck: async () => ({}),
            getLoadCheckStream: () => new PassThrough()
        },
        apiCommonLogsPipe: { getOut: () => new PassThrough() },
        apiS3Middleware: { clearIndex: async () => undefined },
        logger: new ObjLogger("manager-api-hotwire-test"),
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

test("ManagerAPIHandler registers the separated v1 Manager API route surface", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder);

    await new ManagerAPIHandler(manager as any).attach();

    t.true(recorder.has("get", "/api/v1/sth/:id/info"));
    t.true(recorder.has("get", "/api/v1/version"));
    t.true(recorder.has("get", "/api/v1/config"));
    t.true(recorder.has("get", "/api/v1/verser2/trust"));
    t.true(recorder.has("op", "/api/v1/sth", "post"));
    t.true(recorder.has("get", "/api/v1/list"));
    t.true(recorder.has("get", "/api/v1/instances"));
    t.true(recorder.has("get", "/api/v1/sequences"));
    t.true(recorder.has("get", "/api/v1/all_sequences"));
    t.true(recorder.has("get", "/api/v1/entities"));
    t.true(recorder.has("get", "/api/v1/topics"));
    t.true(recorder.has("get", "/api/v1/load"));
    t.true(recorder.has("upstream", "/api/v1/log"));
    t.true(recorder.has("upstream", "/api/v1/load-stream"));
    t.true(recorder.has("upstream", "/api/v1/topic/:name"));
    t.true(recorder.has("downstream", "/api/v1/topic/:name"));
    t.true(recorder.has("op", "/api/v1/store", "delete"));
    t.true(recorder.has("op", "/api/v1/sth/:id", "delete"));
    t.true(recorder.has("use", "/api/v1/sth/:id"));
    t.true(recorder.has("op", "/api/v1/disconnect", "post"));
    t.false(recorder.has("use", "/api/v1/s3/"));

    const deleteSthIndex = recorder.routes.findIndex(route => route.kind === "op" && route.path === "/api/v1/sth/:id" && route.method === "delete");
    const sthProxyIndex = recorder.routes.findIndex(route => route.kind === "use" && route.path === "/api/v1/sth/:id");

    t.true(deleteSthIndex > -1);
    t.true(sthProxyIndex > -1);
    t.true(deleteSthIndex < sthProxyIndex);
});
