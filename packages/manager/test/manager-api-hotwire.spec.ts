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

test("ManagerAPIHandler unit handlers return version config and paginated list data", async t => {
    const recorder = new RouteRecorder();
    const calls: any[] = [];
    const manager = {
        ...createManagerStub(recorder),
        validateQueries: (offset: number, limit: number) => offset >= 0 && limit > 0,
        getList: (offset: number, limit: number) => {
            calls.push({ offset, limit });
            return { hosts: [{ id: "sth-1" }] };
        }
    };

    await new ManagerAPIHandler(manager as any).attach();

    const version = (recorder.require("get", "/api/v1/version").handler as Function)({});
    const config = (recorder.require("get", "/api/v1/config").handler as Function)({});
    const list = (recorder.require("get", "/api/v1/list").handler as Function)({ query: { offset: "-1", limit: "0" } });

    t.deepEqual(version, { service: "@scramjet/manager", apiVersion: "v1", version: "0.0.0-test", build: "test-build" });
    t.deepEqual(config, { config: { apiBase: "/api/v1" } });
    t.deepEqual(list, { hosts: [{ id: "sth-1" }] });
    t.deepEqual(calls, [{ offset: 0, limit: 100 }]);
});

test("ManagerAPIHandler unit handlers cover STH info and delete behavior", async t => {
    const recorder = new RouteRecorder();
    const calls: any[] = [];
    const manager = {
        ...createManagerStub(recorder),
        apiSthConnectionStore: {
            getById: (id: string) => id === "sth-1" ? { getInfo: () => ({ id }) } : undefined,
            delete: async (id: string, force: boolean) => calls.push({ id, force })
        }
    };

    await new ManagerAPIHandler(manager as any).attach();

    const infoHandler = recorder.require("get", "/api/v1/sth/:id/info").handler as Function;
    const deleteHandler = recorder.require("op", "/api/v1/sth/:id", "delete").handler as Function;

    t.deepEqual(infoHandler({ params: { id: "sth-1" } }), { id: "sth-1" });
    const missingError = t.throws(() => infoHandler({ params: { id: "missing" } })) as any;

    t.is(missingError.type, "ERR_NOT_FOUND");
    t.is(missingError.code, 404);
    t.deepEqual(await deleteHandler({ params: {}, headers: {} }), { opStatus: "Not Found", error: "Id was not supplied" });
    t.deepEqual(await deleteHandler({ params: { id: "sth-1" }, headers: { "x-force": "true" } }), { opStatus: "Accepted" });
    t.deepEqual(calls, [{ id: "sth-1", force: true }]);
});
