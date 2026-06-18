import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { EventEmitter } from "events";
import { PassThrough } from "stream";
import { InstanceStatus } from "@scramjet/symbols";
import { HostError } from "@scramjet/model";

import { HostAPIHandler } from "../src/lib/api/host-api";
import { InstanceAPI } from "../src/lib/api/instance-api";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

const logger = new ObjLogger("api-hotwire-test");

function createHostStub(): any {
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

function createResponseStub() {
    return {
        statusCode: 200,
        chunks: [] as any[],
        ended: false,
        write(chunk: any) {
            this.chunks.push(chunk);
        },
        writeHead(statusCode: number) {
            this.statusCode = statusCode;
        },
        end() {
            this.ended = true;
        },
        destroy(error?: Error) {
            this.ended = true;
            if (error) this.error = error;
        },
        on() { return this; },
        error: undefined as Error | undefined
    };
}

function createCsiStub(): any {
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

test("HostAPIHandler unit handlers return basic v1 Host data", async t => {
    const recorder = new RouteRecorder();
    const host = createHostStub();

    new HostAPIHandler(recorder.asApiExpose(), host as any, "1.2.3", "test-build").attach();

    const version = await (recorder.require("get", "/api/v1/version").handler as Function)({});
    const config = await (recorder.require("get", "/api/v1/config").handler as Function)({});
    const status = await (recorder.require("get", "/api/v1/status").handler as Function)({});

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

test("HostAPIHandler unit methods cover sequence create update and incoming errors", async t => {
    const host = createHostStub();
    const api = new HostAPIHandler(new RouteRecorder().asApiExpose(), host as any, "1.0.0", "build") as any;

    host.sequenceStore.getById = (id: string) => id === "existing" ? { id, instances: [] } : undefined;
    t.deepEqual(await api.handleUpdateSequence({ params: {}, method: "PUT" }), { opStatus: "Bad Request", error: "missing id parameter" });
    t.deepEqual(await api.handleUpdateSequence({ params: { id: "missing" }, method: "PUT" }), { opStatus: "Not Found", error: "Sequence with id: missing not found" });
    host.sequenceStore.getById = (id: string) => id === "existing" ? { id, instances: [{ id: "inst-1" }] } : undefined;
    t.deepEqual(await api.handleUpdateSequence({ params: { id: "existing" }, method: "PUT" }), { opStatus: "Conflict", error: "Can't update sequence with instances" });

    host.sequenceStore.getById = (id: string) => id === "duplicate" ? { id, instances: [] } : undefined;
    t.deepEqual(await api.handleNewSequence({ method: "POST", socket: {} }, "duplicate"), { opStatus: "Method Not Allowed", error: "Sequence with id duplicate already exist" });

    host.addSequence = async (id: string) => ({ id });
    t.deepEqual(await api.handleIncomingSequence({ params: {}, method: "POST", socket: {} }, "created"), { id: "created", opStatus: "OK" });

    host.addSequence = async () => { throw new HostError("SEQUENCE_IDENTIFICATION_FAILED", "bad package"); };
    t.deepEqual(await api.handleIncomingSequence({ params: {}, method: "POST", socket: {} }, "bad"), { opStatus: "Bad Request", error: "Application Error Occurred" });
    host.addSequence = async () => { throw new Error("boom"); };
    const genericError = await api.handleIncomingSequence({ params: {}, method: "POST", socket: {} }, "bad");

    t.is(genericError.opStatus, "Unprocessable Entity");
    t.is(genericError.error.message, "boom");
});

test("HostAPIHandler unit sequence wrappers delegate to incoming sequence handler", async t => {
    const host = createHostStub();
    const api = new HostAPIHandler(new RouteRecorder().asApiExpose(), host as any, "1.0.0", "build") as any;
    const calls: any[] = [];

    host.sequenceStore.getById = (id: string) => id === "existing" ? { id, instances: [] } : undefined;
    host.addSequence = async (id: string, req: any, identify: boolean) => {
        calls.push({ id, identify });
        return { id };
    };

    t.deepEqual(await api.handleUpdateSequence({ params: { id: "existing" }, method: "PUT", socket: {} }), { id: "existing", opStatus: "OK" });
    t.deepEqual(await api.handleNewSequence({ method: "POST", socket: {} }, "new-seq"), { id: "new-seq", opStatus: "OK" });
    t.deepEqual(calls, [{ id: "existing", identify: false }, { id: "new-seq", identify: true }]);
});

test("HostAPIHandler unit start sequence validates payload and maps startup errors", async t => {
    const host = createHostStub();
    const api = new HostAPIHandler(new RouteRecorder().asApiExpose(), host as any, "1.0.0", "build") as any;

    t.deepEqual(await api.handleStartSequence({ params: {}, body: {} }), { opStatus: "Bad Request", error: "Missing id parameter" });
    t.deepEqual(await api.handleStartSequence({ params: { id: "seq" }, body: { appConfig: "bad" } }), { opStatus: "Bad Request", error: "DTO appConfig is string, not an object" });

    host.instancesStore.has = (id: string) => id === "11111111-1111-1111-1111-111111111111";
    t.deepEqual(await api.handleStartSequence({ params: { id: "seq" }, body: { instanceId: "11111111-1111-1111-1111-111111111111" } }), { opStatus: "Conflict", error: "Instance with a given ID already exists" });
    host.instancesStore.has = () => false;
    host.instancesStore.hasName = (name: string) => name === "taken-name";
    t.deepEqual(await api.handleStartSequence({ params: { id: "seq" }, body: { instanceName: "taken-name" } }), { opStatus: "Conflict", error: "Instance with a given name already exists" });

    host.instancesStore.hasName = () => false;
    const audits: any[] = [];

    host.auditor = { auditInstanceStart: (...args: any[]) => audits.push(args) };
    host.startSequence = async () => ({ id: "inst-started", limits: { memory: 1 } });
    t.deepEqual(await api.handleStartSequence({ params: { id: "seq" }, body: {}, headers: {} }), { opStatus: "OK", id: "inst-started" });
    t.is(audits.length, 1);

    host.startSequence = async () => { throw new HostError("UNKNOWN_SEQUENCE", "missing"); };
    t.deepEqual(await api.handleStartSequence({ params: { id: "seq" }, body: {}, headers: {} }), { opStatus: "Not Found", error: "Application Error Occurred" });
});

test("HostAPIHandler unit start sequence covers remaining startup conflict and error mappings", async t => {
    const host = createHostStub();
    const api = new HostAPIHandler(new RouteRecorder().asApiExpose(), host as any, "1.0.0", "build") as any;

    host.instancesStore.has = (id: string) => id === "conflicting-name";
    t.deepEqual(await api.handleStartSequence({ params: { id: "seq" }, body: { instanceName: "conflicting-name" } }), { opStatus: "Conflict", error: "Instance name conflicts with an existing instance ID" });

    host.instancesStore.has = () => false;
    host.instancesStore.hasName = () => false;
    host.auditor = { auditInstanceStart: () => undefined };
    host.startSequence = async () => undefined;
    t.deepEqual(await api.handleStartSequence({ params: { id: "seq" }, body: {}, headers: {} }), { opStatus: "Bad Request", error: "Application Error Occurred" });
    host.startSequence = async () => ({ exitcode: 123 });
    t.deepEqual(await api.handleStartSequence({ params: { id: "seq" }, body: {}, headers: {} }), { opStatus: "Bad Request", error: "Application Error Occurred" });
    host.startSequence = async () => { throw new Error("plain failure"); };
    t.deepEqual(await api.handleStartSequence({ params: { id: "seq" }, body: {}, headers: {} }), { opStatus: "Internal Server Error", error: "plain failure" });
    host.startSequence = async () => { throw new HostError("INSTANCE_ID_CONFLICT", "id conflict"); };
    t.deepEqual(await api.handleStartSequence({ params: { id: "seq" }, body: {}, headers: {} }), { opStatus: "Conflict", error: "Application Error Occurred" });
    host.startSequence = async () => { throw new HostError("INSTANCE_NAME_CONFLICT", "name conflict"); };
    t.deepEqual(await api.handleStartSequence({ params: { id: "seq" }, body: {}, headers: {} }), { opStatus: "Conflict", error: "Application Error Occurred" });
});

test("HostAPIHandler unit delete and incoming sequence map HostError branches", async t => {
    const host = createHostStub();
    const api = new HostAPIHandler(new RouteRecorder().asApiExpose(), host as any, "1.0.0", "build") as any;

    host.deleteSequence = async () => { throw new HostError("UNKNOWN_SEQUENCE", "missing"); };
    t.deepEqual(await api.handleDeleteSequence({ params: { id: "seq" }, headers: {} }), { opStatus: "Not Found", error: "Application Error Occurred" });
    host.deleteSequence = async () => { throw new HostError("SEQUENCE_IN_USE", "busy"); };
    t.deepEqual(await api.handleDeleteSequence({ params: { id: "seq" }, headers: {} }), { opStatus: "Conflict", error: "Application Error Occurred" });
    host.deleteSequence = async () => { throw new Error("delete failed"); };
    t.deepEqual(await api.handleDeleteSequence({ params: { id: "seq" }, headers: {} }), { opStatus: "Internal Server Error", error: "Error removing Sequence: Error: delete failed" });

    host.addSequence = async () => { throw new HostError("SEQUENCE_EXISTS", "exists"); };
    t.deepEqual(await api.handleIncomingSequence({ params: {}, method: "POST", socket: {} }, "seq"), { opStatus: "Method Not Allowed", error: "Application Error Occurred" });
    host.addSequence = async () => { throw new HostError("UNKNOWN_SEQUENCE" as any); };
    t.deepEqual(await api.handleIncomingSequence({ params: {}, method: "POST", socket: {} }, "seq"), { opStatus: "Internal Server Error", error: "Application Error Occurred" });
});

test("HostAPIHandler unit middleware covers instance and rpc forwarding boundaries", async t => {
    const recorder = new RouteRecorder();
    const host = createHostStub();
    const api = new HostAPIHandler(recorder.asApiExpose(), host as any, "1.0.0", "build");
    const lookupCalls: any[] = [];
    const forwardCalls: any[] = [];

    host.instancesStore.getByNameOrId = (id: string) => id === "inst-1" ? {
        router: { lookup: (...args: any[]) => lookupCalls.push(args) }
    } : undefined;
    host.instancesStore.getByExposePath = () => [{ expose: { path: "/test" }, rpcUrl: "http://rpc", forwardRpcRequest: async (...args: any[]) => {
        forwardCalls.push(args);
        return true;
    } }];
    api.attach();

    const instanceReq: any = { params: { id: "inst-1" }, url: "/api/v1/instance/inst-1/log" };

    (recorder.require("use", "/api/v1/instance/:id").handler as Function)(instanceReq, createResponseStub(), () => undefined);
    t.is(instanceReq.url, "/log");
    t.is(lookupCalls.length, 1);

    const missingRes = createResponseStub();

    (recorder.require("use", "/api/v1/instance/:id").handler as Function)({ params: { id: "missing" }, url: "/api/v1/instance/missing/log" }, missingRes, () => undefined);
    t.is(missingRes.statusCode, 404);
    t.true(missingRes.ended);

    await (recorder.require("use", "/api/v1/rpc").handler as Function)({ url: "/api/v1/rpc/test", method: "GET" }, createResponseStub(), () => t.fail());
    t.is(forwardCalls.length, 1);
    t.deepEqual(await (recorder.require("forward", "/api/v1/rpc").strategy as Function)({ url: "/test/path" }), ["http://rpc", "/path"]);
});

test("HostAPIHandler unit audit and space middleware do not require servers", async t => {
    const host = createHostStub();
    let refCount = 0;
    let unrefCount = 0;
    const auditSource = new PassThrough();
    const socket = new EventEmitter();
    const api = new HostAPIHandler(new RouteRecorder().asApiExpose(), host as any, "1.0.0", "build") as any;

    host.heartBeatInterval = { ref: () => refCount++, unref: () => unrefCount++ };
    host.auditor = { getOutputStream: () => auditSource };

    const auditOut = await api.handleAuditRequest({ socket }, createResponseStub());

    t.truthy(auditOut);
    socket.emit("end");
    t.is(refCount, 1);
    t.is(unrefCount, 1);

    const res = createResponseStub();

    api.spaceMiddleware({ url: "/api/v1/cpm/api/v1/health", method: "GET", headers: {} }, res);
    t.is(res.statusCode, 404);
    t.true(res.ended);
});

test("HostAPIHandler unit space middleware pipes CPM responses", async t => {
    const host = createHostStub();
    const api = new HostAPIHandler(new RouteRecorder().asApiExpose(), host as any, "1.0.0", "build") as any;
    const clientRequest = Object.assign(new PassThrough(), {
        flushed: false,
        flushHeaders() { this.flushed = true; }
    });
    const response = Object.assign(new PassThrough(), {
        statusCode: 202,
        statusMessage: "Accepted",
        headers: { "x-test": "yes" }
    });
    const res = Object.assign(new PassThrough(), {
        statusCode: 200,
        statusMessage: "",
        headers: {} as any,
        writeHead(statusCode: number, statusMessage: string, headers: any) {
            this.statusCode = statusCode;
            this.statusMessage = statusMessage;
            this.headers = headers;
        }
    });

    host.cpmConnector = { makeHttpRequestToCpm: () => clientRequest };
    api.spaceMiddleware(Object.assign(new PassThrough(), { url: "/api/v1/cpm/api/v1/health", method: "GET", headers: {} }), res);
    clientRequest.emit("response", response);
    response.end("ok");

    t.true(clientRequest.flushed);
    t.is(res.statusCode, 202);
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

test("InstanceAPI unit handlers cover events input event and duplex behavior", async t => {
    const output = new PassThrough();
    const input = new PassThrough();
    const csi = {
        ...createCsiStub(),
        getInput: (contentType: string) => {
            if (contentType === "bad/type") throw new HostError("INVALID_CONTENT_TYPE", "bad content");
            return input;
        },
        getOutputStream: () => output,
        emitEvent: async (event: any) => event
    };
    const emitter = Object.assign(new EventEmitter(), { lastEvents: {} });
    const api = new InstanceAPI(csi as any, logger, emitter as any) as any;
    const res = new EventEmitter();

    const eventsStream = await api.handleEvents({ params: { name: "data" } }, res);

    t.truthy(eventsStream);
    emitter.emit("data", { message: { ok: true } });
    emitter.emit("data", "raw-value");
    res.emit("end");

    t.deepEqual(await api.handleOneEvent({ params: { name: "missing" } }), { awaited: "missing" });
    await t.throwsAsync(api.handleOneEvent({ params: {} }), { message: "Application Error Occurred" });
    t.deepEqual(await api.handleOnce({ params: { name: "once" } }), { awaited: "once" });
    await t.throwsAsync(api.handleOnce({ params: {} }), { message: "Application Error Occurred" });
    t.deepEqual(await api.handleInput({ headers: { "content-type": "bad/type" } }), { opStatus: "Not Acceptable", error: "Application Error Occurred" });
    t.deepEqual(await api.handleEvent({ body: [null, { eventName: 123, message: "value" }] }), { opStatus: "Bad Request", error: "Invalid format, eventName missing." });
    t.deepEqual(await api.handleEvent({ body: [null, { eventName: "evt", message: "value" }] }), { opStatus: "OK", accepted: "OK" });

    const duplex: any = { input: new PassThrough(), output: new PassThrough() };

    t.deepEqual(await api.handleInOut(duplex, { "content-type": "text/plain" }), {});
});

test("InstanceAPI unit handlers cover RPC middleware and forward strategy", async t => {
    const recorder = new RouteRecorder();
    const forwardCalls: any[] = [];
    const csi = {
        ...createCsiStub(),
        expose: { path: "/api/v1/rpc/test" },
        forwardRpcRequest: async (...args: any[]) => {
            forwardCalls.push(args);
            return true;
        }
    };

    new InstanceAPI(csi as any, logger, { lastEvents: {} } as any).attach(recorder.asApiRoute(), {} as any);

    await (recorder.require("use", "/rpc").handler as Function)({ url: "/rpc/test/path" }, createResponseStub(), () => t.fail());
    t.is(forwardCalls.length, 1);
    t.is(forwardCalls[0][2], "/api/v1/test/path");
    t.deepEqual((recorder.require("forward", "/rpc").strategy as Function)({ url: "/api/v1/rpc/test/path" }), ["http://127.0.0.1:1234", "/path"]);
});

test("InstanceAPI unit handlers cover input default error and inout rejected input", async t => {
    const csi = {
        ...createCsiStub(),
        getInput: () => { throw new Error("input failed"); }
    };
    const api = new InstanceAPI(csi as any, logger, { lastEvents: {} } as any) as any;
    const disabledApi = new InstanceAPI({ ...createCsiStub(), apiInputEnabled: false } as any, logger, { lastEvents: {} } as any) as any;

    t.deepEqual(await api.handleInput({ headers: {} }), { opStatus: "Bad Request", error: "input failed" });
    t.deepEqual(await disabledApi.handleInOut({ input: new PassThrough(), output: new PassThrough() }, {}), { opStatus: "Method Not Allowed", error: "Input provided in other way" });
});

test("InstanceAPI unit handlers cover stop and kill validation errors", async t => {
    const csi = {
        ...createCsiStub(),
        kill: async () => { throw new Error("kill failed"); }
    };
    const api = new InstanceAPI(csi as any, logger, { lastEvents: {} } as any) as any;

    t.deepEqual(await api.handleStop({ body: { timeout: "bad", canCallKeepalive: false } }), { opStatus: "Bad Request", error: "Invalid timeout format" });
    t.deepEqual(await api.handleStop({ body: { timeout: 1, canCallKeepalive: "bad" } }), { opStatus: "Bad Request", error: "Invalid canCallKeepalive format" });
    t.deepEqual(await api.handleKill({ body: { removeImmediately: "bad" } }), { opStatus: "Bad Request", error: "Invalid removeImmediately format" });
    t.deepEqual(await api.handleKill({ body: { removeImmediately: true } }), { opStatus: "Internal Server Error", error: "kill failed" });
});
