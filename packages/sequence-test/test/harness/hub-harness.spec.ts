import test from "ava";

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
