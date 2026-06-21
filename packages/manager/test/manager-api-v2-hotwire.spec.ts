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
            getById: (id: string) => id === "sth-1" ? { id, routeDomain: "sth-1.scramjet.internal", isConnectionActive: true, selfHosted: true, disconnect: async () => undefined } : undefined,
            delete: async () => undefined
        },
        apiServiceDiscovery: { list: () => [{ name: "topic-1", contentType: "application/x-ndjson" }] },
        apiLoadCheck: {
            constants: { SAFE_OPERATION_LIMIT: 0 },
            config: { fsPaths: [] },
            getLoadCheck: async () => ({ load: 1 }),
            getLoadCheckStream: () => new PassThrough()
        },
        apiHealthCheck: { getHealthCheckInfo: () => ({ uptime: 1, timestamp: 2, modules: { sthServer: true } }) },
        getV2HealthCheckInfo: async () => ({
            scope: { id: "manager-hotwire", hubs: 1 },
            healthy: true,
            status: "healthy",
            components: [{ name: "manager", healthy: true, status: "healthy" }],
            details: { uptime: 1, timestamp: 2, modules: { sthServer: true } }
        }),
        apiCommonLogsPipe: { getOut: () => new PassThrough() },
        auditor: { setFlowing: async (_flowing: boolean) => undefined, output: new PassThrough() },
        apiS3Middleware: { clearIndex: async () => undefined, index: { sequences: [{ id: "seq-1", _filename: "seq.tar.gz", packageSize: 123 }] }, router: { lookup: () => undefined } },
        logger: new ObjLogger("manager-api-v2-hotwire-test"),
        handleSthRegistration: async () => "sth-1",
        validateQueries: () => true,
        getList: () => ({ hosts: [{ id: "sth-1" }] }),
        getInstances: () => ({ instances: [{ id: "inst-1", instanceName: "friendly-instance", sequenceId: "seq-1", sequence: { id: "seq-1", name: "friendly-sequence" }, hubId: "sth-1", location: "sth-1" }] }),
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
    t.true(recorder.has("get", "/api/v2/health"));
    t.true(recorder.has("get", "/api/v2/list"));
    t.true(recorder.has("get", "/api/v2/hubs"));
    t.true(recorder.has("get", "/api/v2/instances"));
    t.true(recorder.has("get", "/api/v2/sequences"));
    t.true(recorder.has("get", "/api/v2/all_sequences"));
    t.true(recorder.has("get", "/api/v2/entities"));
    t.true(recorder.has("get", "/api/v2/topics"));
    t.true(recorder.has("upstream", "/api/v2/logs"));
    t.true(recorder.has("upstream", "/api/v2/audit"));
    t.true(recorder.has("op", "/api/v2/inventory/hubs/:hubId", "delete"));
    t.true(recorder.has("get", "/api/v2/storage/sequences"));
    t.false(recorder.has("upstream", "/api/v2/storage/objects/:directory/:filename?"));
    t.false(recorder.has("downstream", "/api/v2/storage/objects/:filename?", "put"));
    t.false(recorder.has("op", "/api/v2/storage/objects/:filename", "delete"));
    t.true(recorder.has("use", "/api/v2/storage/objects"));
    t.true(recorder.has("use", "/api/v2/storage/objects/*"));
    t.true(recorder.has("op", "/api/v2/storage", "delete"));
    t.true(recorder.has("use", "/api/v2/hubs/:hubId"));
    t.true(recorder.has("use", "/api/v2/hubs/:hubId/*"));
});

test("ManagerAPIHandler v2 storage objects proxy rewrites to the legacy storage router", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder);
    const lookups: any[] = [];

    manager.apiS3Middleware.router.lookup = ((req: any) => {
        lookups.push({ url: req.url });
    }) as any;

    await new ManagerAPIHandler(manager as any).attach();

    const req: any = { url: "/api/v2/storage/objects/packages/seq.tar.gz", headers: {}, params: {} };

    (recorder.require("use", "/api/v2/storage/objects/*").handler as Function)(req, {}, () => t.fail());

    t.is(req.url, "/api/v2/storage/objects/packages/seq.tar.gz");
    t.deepEqual(lookups, [{ url: "/api/v1/s3/packages/seq.tar.gz" }]);
});

test("ManagerAPIHandler v2 storage objects proxy returns not found when storage is unavailable", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder);
    const response = {
        statusCode: 200,
        body: "",
        headersSent: false,
        writeHead(statusCode: number) {
            this.statusCode = statusCode;
            this.headersSent = true;
        },
        end(body: string) {
            this.body = body;
        }
    };

    manager.apiS3Middleware = undefined as any;

    await new ManagerAPIHandler(manager as any).attach();

    (recorder.require("use", "/api/v2/storage/objects/*").handler as Function)({ url: "/api/v2/storage/objects/missing" }, response, () => t.fail());

    t.is(response.statusCode, 404);
    t.true(response.body.includes("Storage proxy is not configured"));
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
    t.like(await (recorder.require("get", "/api/v2/health").handler as Function)({}), {
        scope: { id: "manager-hotwire", hubs: 1 },
        healthy: true,
        details: { uptime: 1, timestamp: 2, modules: { sthServer: true } }
    });
    t.deepEqual(await (recorder.require("get", "/api/v2/list").handler as Function)({ query: { offset: "1", limit: "2" } }), { items: [{ id: "sth-1" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/hubs").handler as Function)({ query: { offset: "1", limit: "2" } }), { items: [{ id: "sth-1" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/instances").handler as Function)({ query: {} }), { items: [{ id: "inst-1", instanceName: "friendly-instance", sequenceId: "seq-1", sequence: { id: "seq-1", name: "friendly-sequence" }, hubId: "sth-1", location: "sth-1" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/sequences").handler as Function)({}), { items: [{ id: "seq-1" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/all_sequences").handler as Function)({ query: {} }), { items: [{ id: "seq-1", status: "ready" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/entities").handler as Function)({}), { items: [{ id: "seq-1", type: "sequence" }, { id: "inst-1", type: "instance" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/topics").handler as Function)({}), { items: [{ name: "topic-1", contentType: "application/x-ndjson", direction: undefined }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/storage/sequences").handler as Function)({}), { items: [{ path: "seq.tar.gz", size: 123 }] });
    t.deepEqual(await (recorder.require("op", "/api/v2/storage", "delete").handler as Function)({}), { cleared: true });
});

test("ManagerAPIHandler preserves v1 and v2 instance aggregation metadata", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder);

    await new ManagerAPIHandler(manager as any).attach();

    const expected = [{
        id: "inst-1",
        instanceName: "friendly-instance",
        sequenceId: "seq-1",
        sequence: { id: "seq-1", name: "friendly-sequence" },
        hubId: "sth-1",
        location: "sth-1"
    }];

    t.deepEqual(await (recorder.require("get", "/api/v1/instances").handler as Function)({ query: {} }), { instances: expected });
    t.deepEqual(await (recorder.require("get", "/api/v2/instances").handler as Function)({ query: {} }), { items: expected });
});

test("ManagerAPIHandler v2 audit handler returns auditor output and toggles flow", async t => {
    const recorder = new RouteRecorder();
    const manager: any = createManagerStub(recorder);
    const output = new PassThrough();
    const calls: boolean[] = [];
    const req = new PassThrough() as any;

    req.headers = {};
    manager.auditor = {
        output,
        setFlowing: async (flowing: boolean) => {
            calls.push(flowing);
        }
    };

    await new ManagerAPIHandler(manager as any).attach();

    const result = await (recorder.require("upstream", "/api/v2/audit").handler as Function)(req, {});

    t.is(result, output);
    t.deepEqual(calls, [true]);

    req.emit("close");
    await Promise.resolve();

    t.deepEqual(calls, [true, false]);
});

test("ManagerAPIHandler v2 inventory hub delete disconnects by default and deletes with query option", async t => {
    const recorder = new RouteRecorder();
    const calls: unknown[] = [];
    const manager = createManagerStub(recorder);

    manager.apiSthConnectionStore = {
        getById: (id: string) => id === "sth-1" ? {
            id,
            routeDomain: "sth-1.scramjet.internal",
            isConnectionActive: true,
            selfHosted: true,
            disconnect: async (reason: string) => calls.push({ disconnect: reason })
        } : undefined,
        delete: async (id: string, force: boolean) => calls.push({ delete: id, force })
    } as any;

    await new ManagerAPIHandler(manager as any).attach();

    const handler = recorder.require("op", "/api/v2/inventory/hubs/:hubId", "delete").handler as Function;

    t.deepEqual(await handler({ params: { hubId: "sth-1" }, query: { reason: "manual" } }), {
        operation: { id: "sth-1", status: "completed" },
        result: { hubId: "sth-1", deleted: false, disconnected: true }
    });
    t.deepEqual(await handler({ params: { hubId: "sth-1" }, query: { delete: "true", force: "true" } }), {
        operation: { id: "sth-1", status: "completed" },
        result: { hubId: "sth-1", deleted: true, disconnected: true }
    });
    t.deepEqual(await handler({ params: { hubId: "missing" }, query: {} }), {
        operation: { id: "missing", status: "failed" },
        error: { code: "HUB_NOT_FOUND", message: "Couldn't find Hub with a given ID" }
    });
    t.deepEqual(calls, [{ disconnect: "id_drop" }, { delete: "sth-1", force: true }]);
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

test("Manager setupHealthEndpoint only registers legacy v1 health", async t => {
    const recorder = new RouteRecorder();
    const healthCheck = { getHealthCheckInfo: () => ({ uptime: 1, timestamp: 2, modules: { sthServer: true } }) };
    const manager = {
        id: "mgr-hotwire",
        _apiRouter: recorder.asApiRoute(),
        _config: { apiBase: "/api/v1", id: "mgr-hotwire" },
        getList: () => [{ id: "hub-1" }]
    };

    Manager.prototype.setupHealthEndpoint.call(manager as any, healthCheck as any);

    t.true(recorder.has("get", "/api/v1/health"));
    t.false(recorder.has("get", "/api/v2/health"));
    t.deepEqual(await (recorder.require("get", "/api/v1/health").handler as Function)({}), { uptime: 1, timestamp: 2, modules: { sthServer: true } });
});
