import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";
import { InstanceStatus, RunnerMessageCode } from "@scramjet/symbols";
import EventEmitter from "events";

import { HostAPIHandler } from "../src/lib/api/host-api";
import { HostAPIV1Handler } from "../src/lib/api/host-api-v1";
import { InstanceAPIV2 } from "../src/lib/api/instance-api-v2";
import { CSIController } from "../src/lib/csi-controller";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";
import { registerHttpRoutes, RouteValidationError } from "@scramjet/api-router";

const logger = new ObjLogger("api-v2-instance-hotwire-test");

function createHostStub(): any {
    return {
        apiBase: "/api/v1",
        instanceBase: "/api/v1/instance",
        heartBeatInterval: 1000,
        logger,
        auditor: {},
        service: "sth",
        apiVersion: "v1",
        loadCheck: { getLoadCheck: () => ({ load: 1 }) },
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
        getStatus: () => ({ status: "ok" })
    };
}

function createCsiStub(calls: any[] = []): any {
    return {
        id: "inst-1",
        status: InstanceStatus.RUNNING,
        isRunning: true,
        lastHealth: { healthy: true, details: { current: { memory: 1 } } },
        lastStats: { current: { memory: 1 } },
        apiInputEnabled: true,
        outputEncoding: "utf8",
        expose: { path: "/test" },
        getInfo: () => ({
            id: "inst-1",
            sequence: { id: "seq-1" },
            status: InstanceStatus.RUNNING
        }),
        getOutputStream: () => new PassThrough(),
        getLogStream: () => new PassThrough(),
        getMonitoringStream: () => new PassThrough(),
        getStdio: () => [new PassThrough(), new PassThrough(), new PassThrough()],
        getInput: () => new PassThrough(),
        awaitEvent: async (name: string) => ({ awaited: name }),
        emitEvent: async (payload: unknown) => calls.push({ event: payload }),
        set: async (payload: unknown) => calls.push({ set: payload }),
        stop: async (payload: unknown) => calls.push({ stop: payload }),
        kill: async (payload: unknown) => calls.push({ kill: payload }),
        forwardRpcRequest: async (...args: unknown[]) => {
            calls.push({ forwardRpcRequest: args });
            return true;
        }
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
        on() { return this; }
    };
}

test("HostAPIHandler forwards v2 Instance paths without registering Host-owned concrete instance routes", t => {
    const recorder = new RouteRecorder();

    new HostAPIHandler(recorder.asApiExpose(), createHostStub(), "1.0.0", "build").attach();

    t.true(recorder.has("use", "/api/v2/instances/:instanceId"));
    t.true(recorder.has("use", "/api/v2/instances/:instanceId/*"));
    t.false(recorder.has("use", "/api/v2/instance/:id"));
    t.false(recorder.has("get", "/api/v2/instances/:instanceId"));
    t.false(recorder.has("op", "/api/v2/instances/:instanceId", "delete"));
    t.false(recorder.has("op", "/api/v2/instances/:instanceId", "patch"));
    t.false(recorder.has("get", "/api/v2/instances/:instanceId/stdio"));
    t.false(recorder.has("duplex", "/api/v2/instances/:instanceId/rpc/*"));
});

test("HostAPIHandler composes v1 and v2 handlers without inheriting the v1 handler", t => {
    const handler = new HostAPIHandler(new RouteRecorder().asApiExpose(), createHostStub(), "1.0.0", "build");

    t.false(handler instanceof HostAPIV1Handler);
});

test("InstanceAPIV2 registers local per-instance v2 routes", t => {
    const recorder = new RouteRecorder();

    registerHttpRoutes(recorder.asApiRoute(), new InstanceAPIV2(createCsiStub(), logger).createRouter());

    t.true(recorder.has("get", "/"));
    t.true(recorder.has("op", "/", "delete"));
    t.true(recorder.has("op", "/", "patch"));
    t.true(recorder.has("get", "/stdio"));
    t.true(recorder.has("get", "/health"));
    t.true(recorder.has("upstream", "/output"));
    t.true(recorder.has("upstream", "/logs"));
    t.true(recorder.has("upstream", "/monitoring"));
    t.true(recorder.has("upstream", "/stdio/:fd"));
    t.true(recorder.has("downstream", "/input"));
    t.true(recorder.has("downstream", "/stdio/:fd", "put"));
    t.true(recorder.has("get", "/events/:name"));
    t.true(recorder.has("get", "/events/:name/once"));
    t.true(recorder.has("op", "/events", "post"));
    t.true(recorder.has("duplex", "/rpc/*"));
});

test("InstanceAPIV2 v2 RPC route forwards through CSI RPC forwarding", async t => {
    const recorder = new RouteRecorder();
    const calls: any[] = [];
    const csi = createCsiStub(calls);
    const req: any = { url: "/rpc/test/abc", method: "POST", headers: { "content-type": "text/plain" }, params: {} };
    const res = createResponseStub();

    registerHttpRoutes(recorder.asApiRoute(), new InstanceAPIV2(csi, logger).createRouter());

    const route = recorder.require("duplex", "/rpc/*");

    t.is(typeof route.handler, "function");

    await (route.handler as Function)(req, res);

    t.is(calls.length, 1);
    t.is(calls[0].forwardRpcRequest[0], req);
    t.is(calls[0].forwardRpcRequest[1], res);
    t.is(calls[0].forwardRpcRequest[2], "/abc");

    calls.length = 0;

    const duplexReq: any = { url: "/rpc/test/def", method: "POST", headers: { "content-type": "text/plain" }, params: {} };
    const duplexRes = createResponseStub();
    const duplex: any = { input: duplexReq, output: duplexRes };

    await (route.handler as Function)(duplex, { "content-type": "text/plain" });

    t.is(calls.length, 1);
    t.is(calls[0].forwardRpcRequest[0], duplexReq);
    t.is(calls[0].forwardRpcRequest[1], duplexRes);
    t.is(calls[0].forwardRpcRequest[2], "/def");

    calls.length = 0;

    const noHeaderReq: any = { url: "/rpc/test/no-headers", method: "POST", params: {} };
    const noHeaderRes = createResponseStub();

    await (route.handler as Function)(noHeaderReq, noHeaderRes);

    t.is(calls.length, 1);
    t.deepEqual(calls[0].forwardRpcRequest[0].headers, {});
    t.not(calls[0].forwardRpcRequest[0].headers, noHeaderRes);

    calls.length = 0;

    const duplexReqWithoutHeaders: any = { url: "/rpc/test/header-record", method: "POST", params: {} };
    const duplexWithHeaderRecord: any = { input: duplexReqWithoutHeaders, output: createResponseStub() };
    const headerRecord = { "content-type": "text/plain" };

    await (route.handler as Function)(duplexWithHeaderRecord, headerRecord);

    t.is(calls.length, 1);
    t.is(calls[0].forwardRpcRequest[0].headers, headerRecord);
});

test("InstanceAPIV2 local handlers adapt CSI behavior", async t => {
    const recorder = new RouteRecorder();
    const calls: any[] = [];
    const emitter = Object.assign(new EventEmitter(), { lastEvents: { ready: { ok: true } } });

    registerHttpRoutes(recorder.asApiRoute(), new InstanceAPIV2(createCsiStub(calls), logger, emitter).createRouter());

    const infoResult = await (recorder.require("get", "/").handler as Function)({});
    t.is(infoResult.instance.id, "inst-1");
    t.is(infoResult.instance.sequenceId, "seq-1");
    t.is(infoResult.instance.status, InstanceStatus.RUNNING);
    t.is(infoResult.instance.apiBase, "/api/v2/instances/inst-1");
    t.is(infoResult.instance.instanceName, undefined);
    t.is(infoResult.instance.hubId, undefined);
    t.is(infoResult.instance.location, undefined);
    t.truthy(infoResult.instance.sequence);
    t.is(infoResult.instance.sequence!.id, "seq-1");
    t.is(infoResult.instance.sequence!.name, "seq-1");
    t.is(infoResult.instance.sequence!.hubId, undefined);
    t.is(infoResult.instance.sequence!.location, undefined);
    t.is(infoResult.instance.sequence!.apiBase, "/api/v2/sequences/seq-1");
    t.deepEqual(await (recorder.require("op", "/", "delete").handler as Function)({
        body: { mode: "kill" }
    }), {
        operation: { id: "inst-1", status: "completed" },
        result: { instanceId: "inst-1", mode: "kill", accepted: true }
    });
    t.deepEqual(await (recorder.require("op", "/", "patch").handler as Function)({
        body: { parameters: { value: 1 } }
    }), {
        operation: { id: "inst-1", status: "completed" },
        result: { instance: { id: "inst-1" }, parameters: { value: 1 } }
    });
    t.deepEqual(await (recorder.require("op", "/", "patch").handler as Function)({
        body: { logLevel: "debug" }
    }), {
        operation: { id: "inst-1", status: "completed" },
        result: { instance: { id: "inst-1" }, parameters: { logLevel: "debug" } }
    });
    await t.throwsAsync(
        () => (recorder.require("op", "/", "delete").handler as Function)({ body: { mode: "restart" } }),
        { instanceOf: RouteValidationError, message: "Invalid route body" }
    );
    await t.throwsAsync(
        () => (recorder.require("op", "/", "patch").handler as Function)({ body: { monitoringRate: "fast" } }),
        { instanceOf: RouteValidationError, message: "Invalid route body" }
    );
    t.deepEqual(await (recorder.require("get", "/stdio").handler as Function)({}), {
        channels: [
            { fd: 0, readable: false, writable: true },
            { fd: 1, readable: true, writable: false },
            { fd: 2, readable: true, writable: false }
        ]
    });
    t.deepEqual(await (recorder.require("get", "/health").handler as Function)({}), {
        scope: { id: "inst-1", status: InstanceStatus.RUNNING },
        healthy: true,
        status: "healthy",
        components: [{ name: "instance", healthy: true, status: "healthy", scope: { id: "inst-1", status: InstanceStatus.RUNNING }, details: { current: { memory: 1 } } }],
        details: { current: { memory: 1 } }
    });
    t.truthy(await (recorder.require("upstream", "/stdio/:fd").handler as Function)({
        params: { fd: "1" }
    }));
    await t.throwsAsync(
        () => (recorder.require("upstream", "/stdio/:fd").handler as Function)({ params: { fd: "0" } }),
        { instanceOf: RouteValidationError, message: "Invalid route params" }
    );
    t.truthy(await (recorder.require("downstream", "/stdio/:fd", "put").handler as Function)({
        params: { fd: "0" },
        headers: { "content-type": "application/octet-stream" }
    }));
    t.deepEqual(await (recorder.require("get", "/events/:name").handler as Function)({
        params: { name: "ready" }
    }), { event: { ok: true } });
    t.deepEqual(await (recorder.require("get", "/events/:name/once").handler as Function)({
        params: { name: "next" }
    }), { event: { awaited: "next" } });
    t.deepEqual(await (recorder.require("op", "/events", "post").handler as Function)({
        body: { name: "custom", data: { value: 1 } }
    }), {
        operation: { id: "inst-1", status: "completed" },
        result: { delivered: true }
    });
    t.deepEqual(calls, [
        { kill: { removeImmediately: true } },
        { set: { value: 1 } },
        { set: { logLevel: "debug" } },
        { event: { eventName: "custom", source: "api", message: { value: 1 } } }
    ]);
});

test("InstanceAPIV2 custom apiBase is reflected in info response", async t => {
    const calls: any[] = [];
    const recorder = new RouteRecorder();
    const csi = createCsiStub(calls);

    registerHttpRoutes(recorder.asApiRoute(), new InstanceAPIV2(csi, logger, undefined, "/custom/v2").createRouter());

    const infoResult = await (recorder.require("get", "/").handler as Function)({});

    t.is(infoResult.instance.apiBase, "/custom/v2/instances/inst-1");
    t.is(infoResult.instance.sequence!.apiBase, "/custom/v2/sequences/seq-1");
});

test("InstanceAPIV2 control operations preserve timeout, classify failures, and remain terminal-safe", async t => {
    const recorder = new RouteRecorder();
    const calls: any[] = [];
    const csi = createCsiStub(calls);

    csi.stop = async (payload: unknown) => calls.push({ stop: payload });
    csi.kill = async (payload: unknown) => calls.push({ kill: payload });
    registerHttpRoutes(recorder.asApiRoute(), new InstanceAPIV2(csi, logger).createRouter());
    const deleteRoute = recorder.require("op", "/", "delete").handler as Function;

    t.deepEqual(await deleteRoute({ body: { mode: "stop", timeout: 0 } }), {
        operation: { id: "inst-1", status: "completed" },
        result: { instanceId: "inst-1", mode: "stop", accepted: true }
    });
    t.deepEqual(calls[0], { stop: { timeout: 0, canCallKeepalive: false } });

    csi.stop = async () => { throw Object.assign(new Error("runner unavailable"), { code: "RUNNER_UNAVAILABLE" }); };
    t.deepEqual(await deleteRoute({ body: { mode: "stop", timeout: 25 } }), {
        operation: { id: "inst-1", status: "failed" },
        error: { code: "RUNNER_UNAVAILABLE", message: "runner unavailable" }
    });

    csi.kill = async () => { throw new Error("kill transport closed"); };
    t.deepEqual(await deleteRoute({ body: { mode: "kill" } }), {
        operation: { id: "inst-1", status: "failed" },
        error: { code: "INSTANCE_KILL_FAILED", message: "kill transport closed" }
    });

    await t.throwsAsync(
        () => deleteRoute({ body: { mode: "stop", timeout: -1 } }),
        { instanceOf: RouteValidationError, message: "Invalid route body" }
    );
});

test("direct Hub v2 health is served by the real CSI controller and preserves canonical fields", async t => {
    const communication = {
        sendControlMessage: async () => undefined,
        addMonitoringHandler: () => undefined
    };
    const config: any = {
        runtimeAdapter: "process",
        docker: { runner: { maxMem: 128 } },
        timings: { instanceLifetimeExtensionDelay: 0 },
        host: { apiBase: "/api/v1" }
    };
    const storage = { getAllItems: async () => ({}) };
    const csi = new CSIController(
        {
            id: "real-inst-1",
            sequenceInfo: { id: "seq-1", name: "seq-1", config: {}, location: "local" },
            payload: { system: {}, appConfig: {}, args: [], limits: {} }
        } as any,
        communication as any,
        config,
        {} as any,
        "process",
        {} as any,
        storage as any
    );
    csi.status = InstanceStatus.RUNNING;
    (csi as any)._lastHealth = { healthy: true, details: { "site-a": { load: 0.2 } } };

    const recorder = new RouteRecorder();
    registerHttpRoutes(recorder.asApiRoute(), csi.apiV2.createRouter());
    t.deepEqual(await (recorder.require("get", "/health").handler as Function)({}), {
        scope: { id: "real-inst-1", status: InstanceStatus.RUNNING },
        healthy: true,
        status: "healthy",
        components: [{
            name: "instance",
            healthy: true,
            status: "healthy",
            scope: { id: "real-inst-1", status: InstanceStatus.RUNNING },
            details: { limits: { memory: Number.NaN }, current: { memory: undefined } }
        }],
        details: { "site-a": { load: 0.2 } }
    });
});

function createRealLifecycleCsi(control: (code: RunnerMessageCode, payload: unknown) => void) {
    let resolveTerminal!: (result: { message: string; exitcode: number; status: InstanceStatus }) => void;
    const terminal = new Promise<{ message: string; exitcode: number; status: InstanceStatus }>(resolve => {
        resolveTerminal = resolve;
    });
    const communication = {
        sendControlMessage: async (code: RunnerMessageCode, payload: unknown) => control(code, payload),
        addMonitoringHandler: () => undefined
    };
    const csi = new CSIController(
        {
            id: "real-lifecycle-1",
            sequenceInfo: { id: "seq-1", name: "seq-1", config: {}, location: "local" },
            payload: { system: {}, appConfig: {}, args: [], limits: {} }
        } as any,
        communication as any,
        {
            runtimeAdapter: "process",
            docker: { runner: { maxMem: 128 } },
            timings: { instanceLifetimeExtensionDelay: 0 },
            host: { apiBase: "/api/v1" }
        } as any,
        {} as any,
        "process",
        {} as any,
        { getAllItems: async () => ({}) } as any
    );
    csi.status = InstanceStatus.RUNNING;
    csi.instancePromise = terminal;
    (csi as any)._instanceAdapter = { remove: async () => undefined };
    return { csi, resolveTerminal };
}

test("real direct Hub CSI control preserves stop/kill request and response semantics", async t => {
    const scenarios = [
        { name: "graceful-stop-timeout", body: { mode: "stop", timeout: 0 }, controls: [RunnerMessageCode.STOP, RunnerMessageCode.KILL] },
        { name: "kill", body: { mode: "kill" }, controls: [RunnerMessageCode.KILL] },
        { name: "classified-error", body: { mode: "stop", timeout: 0 }, controls: [RunnerMessageCode.STOP], error: Object.assign(new Error("runner unavailable"), { code: "RUNNER_UNAVAILABLE" }) }
    ];

    for (const scenario of scenarios) {
        const controls: Array<{ code: RunnerMessageCode; payload: unknown }> = [];
        let completeTerminal: (() => void) | undefined;
        const { csi, resolveTerminal } = createRealLifecycleCsi((code, payload) => {
            controls.push({ code, payload });
            if (scenario.error) throw scenario.error;
            if (code === RunnerMessageCode.KILL) completeTerminal?.();
        });
        completeTerminal = () => resolveTerminal({ message: "stopped", exitcode: 0, status: InstanceStatus.COMPLETED });
        const recorder = new RouteRecorder();
        registerHttpRoutes(recorder.asApiRoute(), csi.apiV2.createRouter());
        const result = await (recorder.require("op", "/", "delete").handler as Function)({ body: scenario.body });

        t.deepEqual(controls.map(control => control.code), scenario.controls);
        t.deepEqual(controls.map(control => control.payload), scenario.controls.map(code => code === RunnerMessageCode.STOP
            ? { timeout: scenario.body.timeout, canCallKeepalive: false }
            : {}));
        if (scenario.error) {
            t.deepEqual(result, {
                operation: { id: "real-lifecycle-1", status: "failed" },
                error: { code: "RUNNER_UNAVAILABLE", message: "runner unavailable" }
            });
            continue;
        }

        t.deepEqual(result, {
            operation: { id: "real-lifecycle-1", status: "completed" },
            result: { instanceId: "real-lifecycle-1", mode: scenario.body.mode, accepted: true }
        });
        await new Promise<void>(resolve => setImmediate(resolve));
        t.is(csi.status, InstanceStatus.COMPLETED);
    }
});

test("HostAPIHandler v2 plural instance resolver dispatches to the v2 CSI router", async t => {
    const recorder = new RouteRecorder();
    const host = createHostStub();
    const v1LookupCalls: any[] = [];
    const v2LookupCalls: any[] = [];

    host.instancesStore.getByNameOrId = (id: string) => id === "inst-1" ? {
        router: { lookup: (...args: any[]) => v1LookupCalls.push(args) },
        v2Router: { lookup: (routedReq: any) => v2LookupCalls.push({ url: routedReq.url, params: routedReq.params }) }
    } : undefined;

    new HostAPIHandler(recorder.asApiExpose(), host, "1.0.0", "build").attach();

    const req: any = { params: {}, headers: {}, url: "/api/v2/instances/inst-1/stdio" };

    await (recorder.require("use", "/api/v2/instances/:instanceId/*").handler as Function)(req, createResponseStub(), () => undefined);
    t.is(req.url, "/api/v2/instances/inst-1/stdio");
    t.deepEqual(req.params, {});
    t.is(v1LookupCalls.length, 0);
    t.is(v2LookupCalls.length, 1);
    t.deepEqual(v2LookupCalls[0], { url: "/stdio", params: { instanceId: "inst-1" } });
});

test("HostAPIHandler v2 instance resolver returns a clear not-found when no v2 router resolves", async t => {
    const recorder = new RouteRecorder();
    const host = createHostStub();
    const response = createResponseStub();

    new HostAPIHandler(recorder.asApiExpose(), host, "1.0.0", "build").attach();

    await (recorder.require("use", "/api/v2/instances/:instanceId/*").handler as Function)({
        params: {},
        headers: {},
        url: "/api/v2/instances/missing/stdio"
    }, response, () => undefined);

    t.is(response.statusCode, 404);
    t.true(response.ended);
});
