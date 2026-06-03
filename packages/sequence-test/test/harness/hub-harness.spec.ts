import test from "ava";
import { Readable } from "node:stream";

import {
    HubCallMatch,
    createHubHarness
} from "../../src";

const isMatch = (entry: HubCallMatch, expected: HubCallMatch): boolean => {
    if (expected.method && entry.method && entry.method.toUpperCase() !== expected.method.toUpperCase()) {
        return false;
    }

    if (expected.path && entry.path !== expected.path) {
        return false;
    }

    return true;
};

test("createHubHarness exposes context.hub and minimal space", t => {
    const harness = createHubHarness();

    t.is(harness.context.hub, harness.hub);
    t.truthy(harness.context.space);
    t.true("host" in harness.context.space);
    t.true("port" in harness.context.space);

    t.is(typeof harness.calls, "function");
    t.is(typeof harness.assert.called, "function");
    t.is(typeof harness.assert.callCount, "function");
    t.is(typeof harness.assert.body, "function");
    t.is(typeof harness.assert.order, "function");
});

test("metadata endpoints return defaults and record normalized paths", async t => {
    const harness = createHubHarness();

    const version = await harness.hub.getVersion();
    const status = await harness.hub.getStatus();
    const config = await harness.hub.getConfig();
    const loadCheck = await harness.hub.getLoadCheck();

    t.deepEqual(version, { service: "sequence-test", version: "dev", build: "test", apiVersion: "1" });
    t.deepEqual(status, { cpm: { cpmId: "local", connected: true } });
    t.deepEqual(config, { public: true, hubTest: true });
    t.is(typeof (loadCheck as { avgLoad: number }).avgLoad, "number");

    const calls = harness.calls();
    t.true(calls.some(c => isMatch(c, { method: "GET", path: "/api/v1/version" })));
    t.true(calls.some(c => isMatch(c, { method: "GET", path: "/api/v1/status" })));
    t.true(calls.some(c => isMatch(c, { method: "GET", path: "/api/v1/config" })));
    t.true(calls.some(c => isMatch(c, { method: "GET", path: "/api/v1/load-check" })));

    const monotonic = calls.map(c => c.sequence);
    t.deepEqual(monotonic, [...monotonic].sort((a, b) => a - b));
});

test("sequence and instance API methods record separate paths and bodies", async t => {
    const harness = createHubHarness();

    const send = await harness.hub.sendSequence({ name: "sequence-a" });
    t.truthy(send && typeof send === "object" && "id" in send);

    const id = (send as { id: string }).id;

    const sequence = await harness.hub.getSequence(id);
    t.deepEqual(sequence, { id, body: { name: "sequence-a" } });

    const list = await harness.hub.listSequences();
    t.true(Array.isArray(list));

    const started = await harness.hub.startSequence(id, { args: ["--debug"] });
    t.true(typeof started === "object" && started !== null);

    const instances = await harness.hub.listInstances();
    t.true(Array.isArray(instances));

    t.truthy(await harness.hub.getInstanceInfo("inst-1"));

    const calls = harness.calls();
    t.true(calls.some(c => c.method === "POST" && c.path === "/api/v1/sequences"));
    t.true(calls.some(c => c.method === "GET" && c.path === `/api/v1/sequence/${id}`));
    t.true(calls.some(c => c.method === "POST" && c.path === `/api/v1/sequence/${id}/start`));
    t.true(calls.some(c => c.method === "GET" && c.path === "/api/v1/instances"));
});

test("createTopic records created topic even without dependent calls", async t => {
    const harness = createHubHarness();

    const topic = await harness.hub.createTopic("my-topic", "text/plain");

    t.deepEqual(topic, {
        topicName: "my-topic",
        id: "my-topic",
        contentType: "text/plain"
    });

    const calls = harness.calls();
    t.true(calls.some(c => c.method === "POST" && c.path === "/api/v1/topics"));
});

test("host and instance RPC calls record separate paths and bodies", async t => {
    const harness = createHubHarness();

    const hostResponse = await harness.hub.callHostRpc("system/status", { phase: "host" });

    t.deepEqual(hostResponse, {
        rpc: "system/status",
        scope: "host",
        method: "POST",
        body: { phase: "host" }
    });

    const instanceResponse = await harness.hub.callInstanceRpc("inst-7", "health", { phase: "instance" });

    t.deepEqual(instanceResponse, {
        rpc: "health",
        scope: "instance",
        instanceId: "inst-7",
        method: "POST",
        body: { phase: "instance" }
    });

    const calls = harness.calls();

    t.true(calls.some(entry => entry.method === "POST" && entry.path === "/api/v1/rpc/system/status"));
    t.true(calls.some(entry => entry.method === "POST" && entry.path === "/api/v1/instance/inst-7/rpc/health"));

    t.is(calls.filter(entry => entry.path === "/api/v1/rpc/system/status").length, 1);
    t.is(calls.filter(entry => entry.path === "/api/v1/instance/inst-7/rpc/health").length, 1);
});

test("topic lifecycle supports create/list/delete/send/get with defaults", async t => {
    const harness = createHubHarness();

    const created = await harness.hub.createTopic(undefined, "text/plain");
    const topicName = (created as { topicName?: string }).topicName as string;

    t.true(typeof topicName === "string" && topicName.length > 0);

    const listedAfterCreate = await harness.hub.listTopics();
    t.is((listedAfterCreate as unknown[]).length, 1);

    const details = await harness.hub.getTopic(topicName);
    t.is((details as { topicName: string }).topicName, topicName);

    const sent = await harness.hub.sendTopic(topicName, "payload-data");
    t.deepEqual(sent, {
        topicName,
        id: topicName,
        opStatus: "OK",
        data: "payload-data"
    });

    const detailsAfterSend = await harness.hub.getTopic(topicName);
    t.deepEqual(detailsAfterSend, {
        topicName,
        id: topicName,
        contentType: "text/plain",
        data: "payload-data"
    });

    const deleted = await harness.hub.deleteTopic(topicName);
    t.deepEqual(deleted, { opStatus: "OK" });

    const listedAfterDelete = await harness.hub.listTopics();
    t.is((listedAfterDelete as unknown[]).length, 0);

    const calls = harness.calls();
    t.true(calls.some(entry => entry.method === "POST" && entry.path === "/api/v1/topics"));
    t.true(calls.some(entry => entry.method === "GET" && entry.path === `/api/v1/topics/${topicName}`));
    t.true(calls.some(entry => entry.method === "POST" && entry.path === `/api/v1/topics/${topicName}`));
    t.true(calls.some(entry => entry.method === "DELETE" && entry.path === `/api/v1/topics/${topicName}`));
});

test("streamed RPC request bodies capture string/buffer/readable", async t => {
    const harness = createHubHarness();

    await harness.hub.callHostRpc("echo", "text-data");
    await harness.hub.callHostRpc("echo-bin", Buffer.from("buffer-data"));

    const stream = Readable.from(["chunk-1", "chunk-2"]);
    await harness.hub.callHostRpc("echo-stream", stream);

    const calls = harness.calls();

    t.deepEqual(calls.find(entry => entry.path === "/api/v1/rpc/echo")?.body, "text-data");
    t.deepEqual(calls.find(entry => entry.path === "/api/v1/rpc/echo-bin")?.body, Buffer.from("buffer-data"));

    const streamCall = calls.find(entry => entry.path === "/api/v1/rpc/echo-stream");

    t.truthy(streamCall?.body);
    t.deepEqual((streamCall?.body as { kind: string; chunks: string[] }).kind, "stream");
    t.deepEqual((streamCall?.body as { chunks: string[] }).chunks, ["chunk-1", "chunk-2"]);
});

test("streamed RPC/topic responses return a Readable", async t => {
    const harness = createHubHarness({
        streamDefaults: {
            rpc: "rpc-stream-default",
            topic: "topic-stream-default"
        }
    });

    const topic = await harness.hub.createTopic("stream-topic", "text/plain");
    const topicName = (topic as { topicName: string }).topicName;

    const rpcStream = await harness.hub.callHostRpcStream("streamed");
    const rpcChunks: string[] = [];

    for await (const chunk of rpcStream) {
        rpcChunks.push(Buffer.from(chunk as Buffer | string).toString("utf8"));
    }

    t.true(rpcChunks.includes("rpc-stream-default"));

    const topicData = await harness.hub.getNamedData(topicName);
    const topicChunks: string[] = [];

    for await (const chunk of topicData) {
        topicChunks.push(Buffer.from(chunk as Buffer | string).toString("utf8"));
    }

    t.true(topicChunks.includes("topic-stream-default"));
});

test("assert helpers check call counts, payloads, and paths", async t => {
    const harness = createHubHarness();

    await harness.hub.getVersion();
    await harness.hub.sendSequence({ test: true });

    harness.assert.called({ method: "GET", path: "/api/v1/version" });
    harness.assert.callCount({ path: "/api/v1/version" }, 1);
    harness.assert.body({ path: "/api/v1/sequences" }, { test: true });

    t.throws(() => {
        harness.assert.callCount({ path: "/api/v1/version" }, 2);
    }, {
        instanceOf: Error
    });
});

test("order helper enforces ordered call matches", async t => {
    const harness = createHubHarness();

    await harness.hub.getVersion();
    await harness.hub.getConfig();
    await harness.hub.getStatus();

    t.notThrows(() => {
        harness.assert.order([
            { method: "GET", path: "/api/v1/version" },
            { method: "GET", path: "/api/v1/config" },
            { method: "GET", path: "/api/v1/status" }
        ]);
    });

    t.throws(() => {
        harness.assert.order([
            { method: "GET", path: "/api/v1/config" },
            { method: "GET", path: "/api/v1/version" }
        ]);
    }, { instanceOf: Error });
});

test("route overrides allow explicit behavior", async t => {
    const harness = createHubHarness();

    harness.hub.post("/health").reply(201, { ok: true });

    const response = await harness.hub.handle({ method: "POST", path: "/health", headers: {} , body: undefined });
    t.is(response.status, 201);
    t.deepEqual(await response.json(), { ok: true });
});

test("compatibility helpers still exist on legacy mock wrapper", async t => {
    const { createHubMock } = await import("../../src/hub-mock");
    const mock = createHubMock();

    t.is(typeof mock.get, "function");
    t.is(typeof mock.post, "function");
    t.is(typeof mock.any, "function");
    t.is(typeof mock.requests, "function");
    t.true(typeof mock.assertCalled === "function");
    t.truthy(mock.assert && typeof mock.assert.called === "function");
});
