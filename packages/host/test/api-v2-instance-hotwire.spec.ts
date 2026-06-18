import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

import { HostAPIHandler } from "../src/lib/api/host-api";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

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

test("HostAPIHandler registers Host-owned v2 Instance selector routes as mounted paths", t => {
    const recorder = new RouteRecorder();

    new HostAPIHandler(recorder.asApiExpose(), createHostStub(), "1.0.0", "build").attach();

    t.true(recorder.has("use", "/api/v2/instances/:instanceId"));
    t.true(recorder.has("use", "/api/v2/instance/:id"));
    t.true(recorder.has("get", "/api/v2/instances/:instanceId"));
    t.true(recorder.has("op", "/api/v2/instances/:instanceId", "delete"));
    t.true(recorder.has("op", "/api/v2/instances/:instanceId", "patch"));
    t.true(recorder.has("get", "/api/v2/instances/:instanceId/stdio"));
    t.true(recorder.has("duplex", "/api/v2/instances/:instanceId/rpc/*"));
});

test("HostAPIHandler local v2 Instance handlers adapt CSI behavior", async t => {
    const recorder = new RouteRecorder();
    const calls: any[] = [];
    const host = createHostStub();

    host.instancesStore.getByNameOrId = (id: string) => id === "inst-1" ? {
        id,
        sequenceId: "seq-1",
        status: "running",
        getInfo: () => ({ id, sequenceId: "seq-1", status: "running" }),
        stop: async (payload: unknown) => calls.push({ stop: payload }),
        kill: async (payload: unknown) => calls.push({ kill: payload }),
        set: async (payload: unknown) => calls.push({ set: payload })
    } : undefined;

    new HostAPIHandler(recorder.asApiExpose(), host, "1.2.3", "test-build").attach();

    t.deepEqual(await (recorder.require("get", "/api/v2/instances/:instanceId").handler as Function)({
        params: { instanceId: "inst-1" }
    }), { instance: { id: "inst-1", sequenceId: "seq-1", status: "running" } });
    t.deepEqual(await (recorder.require("op", "/api/v2/instances/:instanceId", "delete").handler as Function)({
        params: { instanceId: "inst-1" },
        body: { mode: "kill" }
    }), {
        operation: { id: "inst-1", status: "completed" },
        result: { instanceId: "inst-1", mode: "kill", accepted: true }
    });
    t.deepEqual(await (recorder.require("op", "/api/v2/instances/:instanceId", "patch").handler as Function)({
        params: { instanceId: "inst-1" },
        body: { parameters: { value: 1 } }
    }), {
        operation: { id: "inst-1", status: "completed" },
        result: { instance: { id: "inst-1" }, parameters: { value: 1 } }
    });
    t.deepEqual(await (recorder.require("get", "/api/v2/instances/:instanceId/stdio").handler as Function)({
        params: { instanceId: "inst-1" }
    }), {
        channels: [
            { fd: 0, readable: false, writable: true },
            { fd: 1, readable: true, writable: false },
            { fd: 2, readable: true, writable: false }
        ]
    });
    t.deepEqual(calls, [
        { kill: { removeImmediately: true } },
        { set: { value: 1 } }
    ]);
});

test("HostAPIHandler v2 instance mount rewrites to the same instance router", t => {
    const recorder = new RouteRecorder();
    const host = createHostStub();
    const lookupCalls: any[] = [];

    host.instancesStore.getByNameOrId = (id: string) => id === "inst-1" ? {
        router: { lookup: (...args: any[]) => lookupCalls.push(args) }
    } : undefined;

    new HostAPIHandler(recorder.asApiExpose(), host, "1.0.0", "build").attach();

    const req: any = { params: { id: "inst-1" }, url: "/api/v2/instance/inst-1/health" };

    (recorder.require("use", "/api/v2/instance/:id").handler as Function)(req, createResponseStub(), () => undefined);
    t.is(req.url, "/health");
    t.is(lookupCalls.length, 1);
});

test("HostAPIHandler v2 plural instance mount rewrites to the same local CSI router", t => {
    const recorder = new RouteRecorder();
    const host = createHostStub();
    const lookupCalls: any[] = [];

    host.instancesStore.getByNameOrId = (id: string) => id === "inst-1" ? {
        router: { lookup: (...args: any[]) => lookupCalls.push(args) }
    } : undefined;

    new HostAPIHandler(recorder.asApiExpose(), host, "1.0.0", "build").attach();

    const req: any = { params: { instanceId: "inst-1" }, url: "/api/v2/instances/inst-1/stdio" };

    (recorder.require("use", "/api/v2/instances/:instanceId").handler as Function)(req, createResponseStub(), () => undefined);
    t.is(req.url, "/stdio");
    t.is(lookupCalls.length, 1);
});
