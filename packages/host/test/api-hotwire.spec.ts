import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

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
        instancesStore: { getByExposePath: () => [] },
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
        getInfo: () => ({}),
        getStdio: () => [new PassThrough(), new PassThrough(), new PassThrough()],
        getLogStream: () => new PassThrough({ objectMode: true }),
        getMonitoringStream: () => new PassThrough(),
        getOutputStream: () => new PassThrough(),
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
