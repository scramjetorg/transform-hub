import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

import { HostAPIHandler } from "../src/lib/api/host-api";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

const logger = new ObjLogger("api-v2-hotwire-test");

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

test("HostAPIHandler registers the v2 Host API route surface separately", t => {
    const recorder = new RouteRecorder();

    new HostAPIHandler(recorder.asApiExpose(), createHostStub(), "1.0.0", "build").attach();

    t.true(recorder.has("get", "/api/v2/load-check"));
    t.true(recorder.has("get", "/api/v2/version"));
    t.true(recorder.has("get", "/api/v2/config"));
    t.true(recorder.has("get", "/api/v2/status"));
    t.true(recorder.has("use", "/api/v2/instance/:id"));
});

test("HostAPIHandler v2 read handlers return v2 Host data", async t => {
    const recorder = new RouteRecorder();
    const host = createHostStub();

    new HostAPIHandler(recorder.asApiExpose(), host, "1.2.3", "test-build").attach();

    t.deepEqual(await (recorder.require("get", "/api/v2/version").handler as Function)({}), {
        service: "sth",
        apiVersion: "v2",
        version: "1.2.3",
        build: "test-build"
    });
    t.deepEqual(await (recorder.require("get", "/api/v2/config").handler as Function)({}), host.publicConfig);
    t.deepEqual(await (recorder.require("get", "/api/v2/status").handler as Function)({}), { status: "ok" });
    t.deepEqual(await (recorder.require("get", "/api/v2/load-check").handler as Function)({}), { load: 1 });
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
