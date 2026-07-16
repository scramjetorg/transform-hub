import test from "ava";
import { execFileSync } from "child_process";
import { X509Certificate } from "crypto";
import { mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

import { ManagerAPIHandler } from "../src/lib/api/manager-api";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

function createMockSocket(hubId: string): { getPeerCertificate: (detailed?: boolean) => { raw: Buffer } } {
    const dir = mkdtempSync(join(tmpdir(), "api-hotwire-"));
    const keyFile = join(dir, "key.pem");
    const certFile = join(dir, "cert.pem");
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", `/CN=${hubId}`, "-days", "1", "-addext", `subjectAltName=DNS:${hubId}`, "-keyout", keyFile, "-out", certFile], { stdio: "ignore" });
    const certPem = readFileSync(certFile);
    const cert = new X509Certificate(certPem);
    return { getPeerCertificate: () => ({ raw: cert.raw }) };
}

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

    await new ManagerAPIHandler(manager as any, async () => ({
        logger: { pipe: () => undefined },
        loadIndex: async () => undefined,
        router: { lookup: () => undefined }
    } as any)).attach();

    const version = await (recorder.require("get", "/api/v1/version").handler as Function)({});
    const config = await (recorder.require("get", "/api/v1/config").handler as Function)({});
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

test("ManagerAPIHandler unit handlers cover aggregate getters streams and topic delegation", async t => {
    const recorder = new RouteRecorder();
    const logStream = new PassThrough();
    const loadStream = new PassThrough();
    const topicStream = new PassThrough();
    const topicCalls: string[] = [];
    const manager = {
        ...createManagerStub(recorder),
        getInstances: (offset: number, limit: number) => ({ offset, limit, instances: ["i"] }),
        getSequencesIds: () => ({ sequences: ["s"] }),
        getSequences: (offset: number, limit: number) => ({ offset, limit, sequences: ["s"] }),
        getEntities: () => ({ entities: true }),
        apiServiceDiscovery: { list: () => [{ topic: "t" }] },
        apiLoadCheck: { getLoadCheck: async () => ({ ok: true }), getLoadCheckStream: () => loadStream },
        apiCommonLogsPipe: { getOut: () => logStream },
        handleTopicUpstreamRequest: () => { topicCalls.push("up"); return topicStream; },
        handleTopicDownstreamRequest: async () => { topicCalls.push("down"); return { opStatus: "OK" }; }
    };

    await new ManagerAPIHandler(manager as any).attach();

    t.deepEqual((recorder.require("get", "/api/v1/instances").handler as Function)({ query: { offset: "2", limit: "3" } }), { offset: 2, limit: 3, instances: ["i"] });
    t.deepEqual((recorder.require("get", "/api/v1/sequences").handler as Function)({}), { sequences: ["s"] });
    t.deepEqual((recorder.require("get", "/api/v1/all_sequences").handler as Function)({ query: { offset: "4", limit: "5" } }), { offset: 4, limit: 5, sequences: ["s"] });
    t.deepEqual((recorder.require("get", "/api/v1/entities").handler as Function)({}), { entities: true });
    t.deepEqual((recorder.require("get", "/api/v1/topics").handler as Function)({}), [{ topic: "t" }]);
    t.deepEqual(await (recorder.require("get", "/api/v1/load").handler as Function)({}), { ok: true });
    t.is((recorder.require("upstream", "/api/v1/log").handler as Function)(), logStream);
    t.is((recorder.require("upstream", "/api/v1/load-stream").handler as Function)(), loadStream);
    t.is((recorder.require("upstream", "/api/v1/topic/:name").handler as Function)({}, {}), topicStream);
    t.deepEqual(await (recorder.require("downstream", "/api/v1/topic/:name").handler as Function)({}, {}), { opStatus: "OK" });
    t.deepEqual(topicCalls, ["up", "down"]);
});

test("ManagerAPIHandler unit handlers cover store clear delete errors and proxy delegation", async t => {
    const recorder = new RouteRecorder();
    const calls: string[] = [];
    const manager = {
        ...createManagerStub(recorder),
        apiS3Middleware: { clearIndex: async () => calls.push("clear") },
        apiSthConnectionStore: {
            getById: () => undefined,
            delete: async () => { throw new Error("delete failed"); }
        },
        handleRequestToSTH: () => calls.push("proxy")
    };

    await new ManagerAPIHandler(manager as any).attach();

    t.deepEqual(await (recorder.require("op", "/api/v1/store", "delete").handler as Function)(), { opStatus: "Accepted" });
    manager.apiS3Middleware.clearIndex = async () => { throw new Error("missing index"); };
    t.deepEqual(await (recorder.require("op", "/api/v1/store", "delete").handler as Function)(), { opStatus: "Not Found", error: "missing index" });
    t.deepEqual(await (recorder.require("op", "/api/v1/sth/:id", "delete").handler as Function)({ params: { id: "sth" }, headers: {} }), { opStatus: "Internal Server Error" });
    (recorder.require("use", "/api/v1/sth/:id").handler as Function)({}, {});
    t.deepEqual(calls, ["clear", "proxy"]);
});

test("ManagerAPIHandler unit handlers cover registration disconnect and S3 mount", async t => {
    const recorder = new RouteRecorder();
    const disconnected: string[] = [];
    const manager = {
        ...createManagerStub(recorder),
        config: { apiBase: "/api/v1", s3: { bucket: "bucket", bucketLimit: 1000 } },
        s3Client: undefined,
        apiS3Middleware: undefined,
        apiSthConnectionStore: {
            getById: () => undefined,
            getByAccessKey: () => [],
            list: () => [{
                id: "sth-1",
                type: "remote",
                selfHosted: true,
                isConnectionActive: true,
                disconnect: async (reason: string) => disconnected.push(reason)
            }]
        },
        handleSthRegistration: async () => "sth-registered"
    };

    await new ManagerAPIHandler(manager as any).attach();

    const sthSocket = createMockSocket("sth");
    t.deepEqual(await (recorder.require("op", "/api/v1/sth", "post").handler as Function)({ body: { id: "sth" }, socket: sthSocket }), { id: "sth-registered", opStatus: "Accepted" });
    t.true(recorder.has("use", "/api/v1/s3/"));
    t.deepEqual(await (recorder.require("op", "/api/v1/disconnect", "post").handler as Function)({ body: { limit: 0 } }), {
        opStatus: "Accepted",
        managerId: "manager-hotwire",
        disconnected: [{ sthId: "sth-1", reason: "limit_exceeded" }]
    });
});
