import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { EventEmitter } from "events";
import { PassThrough } from "stream";
import { InstanceStatus } from "@scramjet/symbols";

import { HostAPIHandler } from "../src/lib/api/host-api";
import { InstanceAPI } from "../src/lib/api/instance-api";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

const logger = new ObjLogger("api-hotwire-test");

function createHostStub() {
    return {
        apiBase: "/api/v1",
        instanceBase: "/api/v1/instance",
        heartBeatInterval: 1000,
        logger,
        auditor: {},
        service: "sth",
        apiVersion: "v1",
        build: "test-build",
        loadCheck: { getLoadCheck: () => ({}) },
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
        getStatus: () => ({})
    };
}

function createCsiStub() {
    return {
        id: "inst-1",
        expose: { path: "/rpc" },
        rpcUrl: "http://127.0.0.1:1234",
        outputEncoding: "utf8",
        status: InstanceStatus.RUNNING,
        apiInputEnabled: true,
        getInfo: () => ({}),
        getStdio: () => [new PassThrough(), new PassThrough(), new PassThrough()],
        getLogStream: () => new PassThrough({ objectMode: true }),
        getMonitoringStream: () => new PassThrough(),
        getOutputStream: () => new PassThrough(),
        getInput: () => new PassThrough(),
        awaitEvent: async (name: string) => ({ awaited: name }),
        emitEvent: async () => undefined,
        set: async () => undefined,
        stop: async () => undefined,
        kill: async () => undefined,
        forwardRpcRequest: async () => false
    };
}

test("HostAPIHandler registers the v1 Host API route surface", t => {
    const recorder = new RouteRecorder();
    const host = createHostStub();

    new HostAPIHandler(recorder.asApiExpose(), host as any, "1.0.0", "build").attach();

    t.true(recorder.has("use", "/api/v1/:type/:id?/:op?"));
    t.true(recorder.has("use", "*"));
    t.true(recorder.has("upstream", "/api/v1/audit"));
    t.true(recorder.has("downstream", "/api/v1/sequence"));
    t.true(recorder.has("downstream", "/api/v1/sequence/:id", "put"));
    t.true(recorder.has("op", "/api/v1/sequence/:id", "delete"));
    t.true(recorder.has("op", "/api/v1/sequence/:id/start", "post"));
    t.true(recorder.has("get", "/api/v1/sequence/:id"));
    t.true(recorder.has("get", "/api/v1/sequence/:id/instances"));
    t.true(recorder.has("get", "/api/v1/sequences"));
    t.true(recorder.has("get", "/api/v1/instances"));
    t.true(recorder.has("get", "/api/v1/entities"));
    t.true(recorder.has("get", "/api/v1/load-check"));
    t.true(recorder.has("get", "/api/v1/version"));
    t.true(recorder.has("get", "/api/v1/config"));
    t.true(recorder.has("get", "/api/v1/status"));
    t.true(recorder.has("get", "/api/v1/topics"));
    t.true(recorder.has("op", "/api/v1/topics", "post"));
    t.true(recorder.has("op", "/api/v1/topics/:topic", "delete"));
    t.true(recorder.has("downstream", "/api/v1/topic/:topic"));
    t.true(recorder.has("upstream", "/api/v1/topic/:topic"));
    t.true(recorder.has("upstream", "/api/v1/log"));
    t.true(recorder.has("duplex", "/api/v1/platform"));
    t.true(recorder.has("use", "/api/v1/cpm"));
    t.true(recorder.has("use", "/api/v1/instance/:id"));
    t.true(recorder.has("use", "/api/v1/rpc"));
    t.true(recorder.has("forward", "/api/v1/rpc"));
});

test("HostAPIHandler unit handlers return basic v1 Host data", t => {
    const recorder = new RouteRecorder();
    const host = createHostStub();

    new HostAPIHandler(recorder.asApiExpose(), host as any, "1.2.3", "test-build").attach();

    const version = (recorder.require("get", "/api/v1/version").handler as Function)({});
    const config = (recorder.require("get", "/api/v1/config").handler as Function)({});
    const status = (recorder.require("get", "/api/v1/status").handler as Function)({});

    t.deepEqual(version, { service: "sth", apiVersion: "v1", version: "1.2.3", build: "test-build" });
    t.deepEqual(config, host.publicConfig);
    t.deepEqual(status, {});
});

test("HostAPIHandler delete sequence unit handler validates id and delegates", async t => {
    const recorder = new RouteRecorder();
    const calls: any[] = [];
    const host = {
        ...createHostStub(),
        deleteSequence: async (id: string, force: boolean) => calls.push({ id, force })
    };

    new HostAPIHandler(recorder.asApiExpose(), host as any, "1.0.0", "build").attach();

    const handler = recorder.require("op", "/api/v1/sequence/:id", "delete").handler as Function;

    t.deepEqual(await handler({ params: {}, headers: {} }), { opStatus: "Bad Request", error: "Missing id parameter" });
    t.deepEqual(await handler({ params: { id: "seq-1" }, headers: { "x-seq-kill-inst": "true" } }), { opStatus: "OK", id: "seq-1" });
    t.deepEqual(calls, [{ id: "seq-1", force: true }]);
});

test("InstanceAPI registers the v1 instance route surface", t => {
    const recorder = new RouteRecorder();
    const csi = createCsiStub();

    new InstanceAPI(csi as any, logger, { lastEvents: {} } as any).attach(recorder.asApiRoute(), {} as any);

    t.true(recorder.has("get", "/"));
    t.true(recorder.has("duplex", "/inout"));
    t.true(recorder.has("upstream", "/stdout"));
    t.true(recorder.has("upstream", "/stderr"));
    t.true(recorder.has("downstream", "/stdin"));
    t.true(recorder.has("upstream", "/log"));
    t.true(recorder.has("upstream", "/output"));
    t.true(recorder.has("downstream", "/input"));
    t.true(recorder.has("get", "/health"));
    t.true(recorder.has("upstream", "/events/:name"));
    t.true(recorder.has("get", "/event/:name"));
    t.true(recorder.has("get", "/once/:name"));
    t.true(recorder.has("op", "/_monitoring_rate", "post"));
    t.true(recorder.has("op", "/_event", "post"));
    t.true(recorder.has("op", "/_stop", "post"));
    t.true(recorder.has("op", "/_kill", "post"));
    t.true(recorder.has("op", "/set", "post"));
    t.true(recorder.has("use", "/rpc"));
    t.true(recorder.has("forward", "/rpc"));
});

test("InstanceAPI event and control unit handlers delegate to CSI", async t => {
    const recorder = new RouteRecorder();
    const calls: string[] = [];
    const csi = {
        ...createCsiStub(),
        getInfo: () => ({ id: "inst-1" }),
        set: async () => calls.push("set"),
        stop: async () => calls.push("stop"),
        kill: async () => calls.push("kill")
    };
    const emitter = Object.assign(new EventEmitter(), { lastEvents: { ready: { ok: true } } });

    new InstanceAPI(csi as any, logger, emitter as any).attach(recorder.asApiRoute(), {} as any);

    const eventHandler = recorder.require("get", "/event/:name").handler as Function;
    const setHandler = recorder.require("op", "/set", "post").handler as Function;
    const stopHandler = recorder.require("op", "/_stop", "post").handler as Function;
    const killHandler = recorder.require("op", "/_kill", "post").handler as Function;

    t.deepEqual(await eventHandler({ params: { name: "ready" } }), { ok: true });
    t.deepEqual(await setHandler({ body: { logLevel: "INFO" } }), { opStatus: "OK" });
    t.deepEqual(await stopHandler({ body: { timeout: 100, canCallKeepalive: false } }), { opStatus: "Accepted", id: "inst-1" });
    t.deepEqual(await killHandler({ body: { removeImmediately: true } }), { opStatus: "Accepted", id: "inst-1" });
    t.deepEqual(calls, ["set", "stop", "kill"]);
});

test("InstanceAPI input and kill unit handlers return v1 errors", async t => {
    const recorder = new RouteRecorder();
    const csi = {
        ...createCsiStub(),
        apiInputEnabled: false,
        status: InstanceStatus.STOPPING
    };

    new InstanceAPI(csi as any, logger, { lastEvents: {} } as any).attach(recorder.asApiRoute(), {} as any);

    const inputHandler = recorder.require("downstream", "/input").handler as Function;
    const killHandler = recorder.require("op", "/_kill", "post").handler as Function;

    t.deepEqual(await inputHandler({ headers: {} }), { opStatus: "Method Not Allowed", error: "Input provided in other way" });
    t.deepEqual(await killHandler({ body: {} }), { opStatus: "Bad Request", error: "Instance not running" });
});
