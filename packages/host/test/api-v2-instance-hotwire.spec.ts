import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";
import { InstanceStatus } from "@scramjet/symbols";
import EventEmitter from "events";

import { HostAPIHandler } from "../src/lib/api/host-api";
import { InstanceAPIV2 } from "../src/lib/api/instance-api-v2";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";
import { registerHttpRoutes } from "@scramjet/api-router";

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
        lastStats: { current: { memory: 1 } },
        apiInputEnabled: true,
        outputEncoding: "utf8",
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
        kill: async (payload: unknown) => calls.push({ kill: payload })
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
    t.false(recorder.has("use", "/api/v2/instance/:id"));
    t.false(recorder.has("get", "/api/v2/instances/:instanceId"));
    t.false(recorder.has("op", "/api/v2/instances/:instanceId", "delete"));
    t.false(recorder.has("op", "/api/v2/instances/:instanceId", "patch"));
    t.false(recorder.has("get", "/api/v2/instances/:instanceId/stdio"));
    t.false(recorder.has("duplex", "/api/v2/instances/:instanceId/rpc/*"));
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

test("InstanceAPIV2 local handlers adapt CSI behavior", async t => {
    const recorder = new RouteRecorder();
    const calls: any[] = [];
    const emitter = Object.assign(new EventEmitter(), { lastEvents: { ready: { ok: true } } });

    registerHttpRoutes(recorder.asApiRoute(), new InstanceAPIV2(createCsiStub(calls), logger, emitter).createRouter());

    t.deepEqual(await (recorder.require("get", "/").handler as Function)({}), {
        instance: { id: "inst-1", sequenceId: "seq-1", status: InstanceStatus.RUNNING }
    });
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
    t.deepEqual(await (recorder.require("op", "/", "delete").handler as Function)({
        body: { mode: "restart" }
    }), {
        operation: { id: "inst-1", status: "failed" },
        error: { code: "INVALID_DELETE_MODE", message: "Unsupported delete mode: restart" }
    });
    t.deepEqual(await (recorder.require("op", "/", "patch").handler as Function)({
        body: { monitoringRate: "fast" }
    }), {
        operation: { id: "inst-1", status: "failed" },
        error: { code: "INVALID_MONITORING_RATE", message: "Monitoring rate must be a number" }
    });
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
        details: { current: { memory: 1 } }
    });
    t.truthy(await (recorder.require("upstream", "/stdio/:fd").handler as Function)({
        params: { fd: "1" }
    }));
    t.deepEqual(await (recorder.require("upstream", "/stdio/:fd").handler as Function)({
        params: { fd: "0" }
    }), {
        operation: { id: "inst-1", status: "failed" },
        error: { code: "INVALID_STDIO_FD", message: "File descriptor 0 is not readable" }
    });
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

test("HostAPIHandler v2 plural instance mount rewrites to the v2 CSI router", t => {
    const recorder = new RouteRecorder();
    const host = createHostStub();
    const v1LookupCalls: any[] = [];
    const v2LookupCalls: any[] = [];

    host.instancesStore.getByNameOrId = (id: string) => id === "inst-1" ? {
        router: { lookup: (...args: any[]) => v1LookupCalls.push(args) },
        v2Router: { lookup: (...args: any[]) => v2LookupCalls.push(args) }
    } : undefined;

    new HostAPIHandler(recorder.asApiExpose(), host, "1.0.0", "build").attach();

    const req: any = { params: { instanceId: "inst-1" }, url: "/api/v2/instances/inst-1/stdio" };

    (recorder.require("use", "/api/v2/instances/:instanceId").handler as Function)(req, createResponseStub(), () => undefined);
    t.is(req.url, "/stdio");
    t.is(v1LookupCalls.length, 0);
    t.is(v2LookupCalls.length, 1);
});
