import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

import { HostAPIHandler } from "../src/lib/api/host-api";
import { Topic } from "../src/lib/serviceDiscovery/topic";
import TopicId from "../src/lib/serviceDiscovery/topicId";
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
        getSequences: () => [{ id: "seq-1", status: "ready" }],
        getInstances: () => [{ id: "inst-1", sequenceId: "seq-1", status: "running" }],
        getStatus: () => ({ status: "ok" })
    };
}

test("HostAPIHandler registers the v2 Host API route surface separately", t => {
    const recorder = new RouteRecorder();

    new HostAPIHandler(recorder.asApiExpose(), createHostStub(), "1.0.0", "build").attach();

    t.true(recorder.has("get", "/api/v2/load"));
    t.true(recorder.has("get", "/api/v2/version"));
    t.true(recorder.has("get", "/api/v2/config"));
    t.true(recorder.has("get", "/api/v2/status"));
});

test("HostAPIHandler registers Host-owned v2 Hub routes as local mounted paths", t => {
    const recorder = new RouteRecorder();

    new HostAPIHandler(recorder.asApiExpose(), createHostStub(), "1.0.0", "build").attach();

    t.true(recorder.has("get", "/api/v2/load"));
    t.true(recorder.has("get", "/api/v2/sequences"));
    t.true(recorder.has("get", "/api/v2/instances"));
    t.true(recorder.has("get", "/api/v2/entities"));
    t.true(recorder.has("get", "/api/v2/topics"));
    t.true(recorder.has("upstream", "/api/v2/logs"));
    t.true(recorder.has("upstream", "/api/v2/audit"));
    t.false(recorder.has("get", "/api/v2/spaces/:spaceId/hubs/:hubId/load"));
    t.false(recorder.has("get", "/api/v2/spaces/:spaceId/hubs/:hubId/load-check"));
});

test("HostAPIHandler registers Host-owned v2 Sequence routes as local mounted paths", t => {
    const recorder = new RouteRecorder();

    new HostAPIHandler(recorder.asApiExpose(), createHostStub(), "1.0.0", "build").attach();

    t.true(recorder.has("downstream", "/api/v2/sequences"));
    t.true(recorder.has("downstream", "/api/v2/sequences/:sequenceId", "put"));
    t.true(recorder.has("op", "/api/v2/sequences/:sequenceId", "delete"));
    t.true(recorder.has("op", "/api/v2/sequences/:sequenceId/instances", "post"));
    t.true(recorder.has("get", "/api/v2/sequences/:sequenceId"));
    t.true(recorder.has("get", "/api/v2/sequences/:sequenceId/instances"));
});

test("HostAPIHandler v2 read handlers return v2 Hub data", async t => {
    const recorder = new RouteRecorder();
    const host = createHostStub();

    new HostAPIHandler(recorder.asApiExpose(), host, "1.2.3", "test-build").attach();

    t.deepEqual(await (recorder.require("get", "/api/v2/version").handler as Function)({}), {
        version: "1.2.3"
    });
    t.deepEqual(await (recorder.require("get", "/api/v2/config").handler as Function)({}), { config: host.publicConfig });
    t.deepEqual(await (recorder.require("get", "/api/v2/status").handler as Function)({}), { status: "ok", details: { status: "ok" } });
    t.deepEqual(await (recorder.require("get", "/api/v2/load").handler as Function)({}), { load: 1 });
});

test("HostAPIHandler local v2 Hub handlers return RestAPI2 envelopes", async t => {
    const recorder = new RouteRecorder();
    const host = createHostStub();
    const req: any = { params: {} };

    new HostAPIHandler(recorder.asApiExpose(), host, "1.2.3", "test-build").attach();

    t.deepEqual(await (recorder.require("get", "/api/v2/version").handler as Function)(req), {
        version: "1.2.3"
    });
    const seqResult = await (recorder.require("get", "/api/v2/sequences").handler as Function)(req);
    t.is(seqResult.items[0].id, "seq-1");
    t.is(seqResult.items[0].status, "ready");
    t.is(seqResult.items[0].apiBase, "/api/v2/sequences/seq-1");
    t.true("name" in seqResult.items[0]);
    t.true("hubId" in seqResult.items[0]);
    t.true("location" in seqResult.items[0]);
    t.true("instances" in seqResult.items[0]);

    const instResult = await (recorder.require("get", "/api/v2/instances").handler as Function)(req);
    t.is(instResult.items[0].id, "inst-1");
    t.is(instResult.items[0].sequenceId, "seq-1");
    t.is(instResult.items[0].status, "running");
    t.is(instResult.items[0].apiBase, "/api/v2/instances/inst-1");
    t.true("instanceName" in instResult.items[0]);
    t.true("hubId" in instResult.items[0]);
    t.true("location" in instResult.items[0]);
    t.true("sequence" in instResult.items[0]);

    t.deepEqual(await (recorder.require("get", "/api/v2/entities").handler as Function)(req), {
        items: [{ id: "seq-1", type: "sequence" }, { id: "inst-1", type: "instance" }]
    });
});

test("HostAPIHandler local v2 Sequence handlers adapt existing Host behavior", async t => {
    const recorder = new RouteRecorder();
    const calls: any[] = [];
    const host = {
        ...createHostStub(),
        deleteSequence: async (id: string, force: boolean) => calls.push({ type: "delete", id, force }),
        startSequence: async (id: string, payload: unknown) => {
            calls.push({ type: "start", id, payload });

            return { id: "inst-started", limits: {} };
        },
        auditor: { auditInstanceStart: () => undefined },
        getSequence: (id: string) => ({ id, status: "ready" }),
        getSequenceInstances: (id: string) => [{ id: "inst-1", sequenceId: id, status: "running" }]
    };

    new HostAPIHandler(recorder.asApiExpose(), host, "1.2.3", "test-build").attach();

    t.deepEqual(await (recorder.require("op", "/api/v2/sequences/:sequenceId", "delete").handler as Function)({
        params: { sequenceId: "seq-1" },
        headers: { "x-seq-kill-inst": "true" }
    }), {
        operation: { id: "seq-1", status: "completed" },
        result: { sequenceId: "seq-1", deleted: true }
    });
    t.deepEqual(await (recorder.require("op", "/api/v2/sequences/:sequenceId/instances", "post").handler as Function)({
        params: { sequenceId: "seq-1" },
        body: { config: { value: 1 } },
        headers: {}
    }), {
        operation: { id: "inst-started", status: "completed" },
        result: { instance: { id: "inst-started" } }
    });
    t.deepEqual(calls, [
        { type: "delete", id: "seq-1", force: true },
        { type: "start", id: "seq-1", payload: { config: { value: 1 } } }
    ]);
    t.deepEqual(await (recorder.require("get", "/api/v2/sequences/:sequenceId").handler as Function)({
        params: { sequenceId: "seq-1" }
    }), { sequence: { id: "seq-1", status: "ready" } });
    const seqInstResult = await (recorder.require("get", "/api/v2/sequences/:sequenceId/instances").handler as Function)({
        params: { sequenceId: "seq-1" }
    });
    t.is(seqInstResult.items[0].id, "inst-1");
    t.is(seqInstResult.items[0].sequenceId, "seq-1");
    t.is(seqInstResult.items[0].status, "running");
});

test("HostAPIHandler v2 topic descriptor supports Topic prototype methods", async (t) => {
    const recorder = new RouteRecorder();
    const topic = new Topic(new TopicId("descriptor-topic"), "text/plain", { type: "hub", id: "hub-1" });
    const host = { ...createHostStub(), serviceDiscovery: { getTopics: () => [topic] } };

    new HostAPIHandler(recorder.asApiExpose(), host, "1.2.3", "test-build").attach();

    const result = await (recorder.require("get", "/api/v2/topics").handler as Function)({});
    t.deepEqual(result.items, [{ name: "descriptor-topic", contentType: "text/plain", origin: { type: "hub", id: "hub-1" } }]);
    topic.destroy();
});
