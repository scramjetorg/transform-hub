import test from "ava";
import { Readable } from "node:stream";

import { createHubHarness } from "../../src";

/**
 * This test file proves that the AppContext fixture APIs exposed by
 * the hub-harness work correctly without importing @scramjet/types.
 *
 * All type references are local to the test or come from @scramjet/sequence-test
 * and Node built-ins.  No @scramjet/types import is present.
 *
 * These tests are expected to pass (green) in all phases.
 */

test("hub harness provides config accessor API through HubMock", (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.hub.getVersion, "function");
    t.is(typeof harness.hub.getConfig, "function");
    t.is(typeof harness.hub.getStatus, "function");
    t.is(typeof harness.hub.getLoadCheck, "function");
});

test("hub harness provides sequence and instance API through HubMock", (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.hub.listSequences, "function");
    t.is(typeof harness.hub.sendSequence, "function");
    t.is(typeof harness.hub.getSequence, "function");
    t.is(typeof harness.hub.deleteSequence, "function");
    t.is(typeof harness.hub.startSequence, "function");
    t.is(typeof harness.hub.listInstances, "function");
    t.is(typeof harness.hub.getInstanceInfo, "function");
});

test("hub harness context provides lifecycle API", (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.context.keepAlive, "function");
    t.is(typeof harness.context.end, "function");
    t.is(typeof harness.context.destroy, "function");

    harness.context.keepAlive(100);
    harness.context.end();

    const lifecycle = harness.lifecycle();

    t.is(lifecycle.length, 2);
    t.is(lifecycle[0].action, "keepAlive");
    t.is(lifecycle[1].action, "end");
});

test("hub harness context provides event emission API", (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.context.emit, "function");
    t.is(typeof harness.context.emitToSpace, "function");

    harness.context.emit("test.event", { key: "value" });
    harness.context.emitToSpace("test.space", { scope: "space" });

    const events = harness.events();

    t.is(events.length, 2);
    t.is(events[0].scope, "host");
    t.is(events[1].scope, "space");
});

test("hub harness context provides localStorage API", async (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.context.localStorage.getItem, "function");
    t.is(typeof harness.context.localStorage.setItem, "function");
    t.is(typeof harness.context.localStorage.removeItem, "function");
    t.is(typeof harness.context.localStorage.clear, "function");

    await harness.context.localStorage.setItem("key1", "value1");
    t.is(await harness.context.localStorage.getItem("key1"), "value1");

    await harness.context.localStorage.removeItem("key1");
    t.is(await harness.context.localStorage.getItem("key1"), null);
});

test("hub harness context provides logger API", (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.context.logger.trace, "function");
    t.is(typeof harness.context.logger.debug, "function");
    t.is(typeof harness.context.logger.info, "function");
    t.is(typeof harness.context.logger.warn, "function");
    t.is(typeof harness.context.logger.error, "function");

    harness.context.logger.info("test message", { detail: 1 });

    const logs = harness.logs();

    t.true(logs.length >= 1);
    t.is(logs[0].level, "info");
    t.is(logs[0].message, "test message");
});

test("hub harness context provides exposed API registration", (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.context.api.use, "function");

    const handler = (_req: unknown, _res: unknown) => ({});
    harness.context.api.use("/status", handler);

    const routes = harness.apiRoutes();

    t.is(routes.length, 1);
    t.is(routes[0].path, "/status");
});

test("hub harness context provides legacy hub client methods", async (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.context.hub.get, "function");
    t.is(typeof harness.context.hub.post, "function");
    t.is(typeof harness.context.hub.request, "function");
});

test("hub harness context provides legacy space client", async (t) => {
    const harness = createHubHarness();

    t.truthy(harness.context.space);
    t.true("host" in harness.context.space);
    t.true("port" in harness.context.space);
    t.is(typeof harness.context.space.get, "function");
    t.is(typeof harness.context.space.post, "function");
    t.is(typeof harness.context.space.request, "function");
});

test("hub harness context provides v2 hubClient and spaceClient", async (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.context.hubClient, "function");
    t.is(typeof harness.context.spaceClient, "function");

    const v2hub = harness.context.hubClient();

    t.is(typeof v2hub.status.get, "function");

    const statusResult = await v2hub.status.get();

    t.truthy(statusResult);
    t.truthy(statusResult.body);
});

test("hub harness provides RPC methods through HubMock", async (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.hub.callHostRpc, "function");
    t.is(typeof harness.hub.callInstanceRpc, "function");
    t.is(typeof harness.hub.callHostRpcStream, "function");
    t.is(typeof harness.hub.callInstanceRpcStream, "function");
});

test("hub harness provides topic API through HubMock", async (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.hub.createTopic, "function");
    t.is(typeof harness.hub.listTopics, "function");
    t.is(typeof harness.hub.deleteTopic, "function");
    t.is(typeof harness.hub.sendTopic, "function");
    t.is(typeof harness.hub.getTopic, "function");
    t.is(typeof harness.hub.sendNamedData, "function");
    t.is(typeof harness.hub.getNamedData, "function");
});

test("hub harness inspector APIs return arrays or records", (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.lifecycle, "function");
    t.is(typeof harness.events, "function");
    t.is(typeof harness.logs, "function");
    t.is(typeof harness.localStorageEntries, "function");
    t.is(typeof harness.storage, "function");
    t.is(typeof harness.apiRoutes, "function");
    t.is(typeof harness.spaceCalls, "function");

    t.true(Array.isArray(harness.lifecycle()));
    t.true(Array.isArray(harness.events()));
    t.true(Array.isArray(harness.logs()));
    t.true(typeof harness.localStorageEntries() === "object" && !Array.isArray(harness.localStorageEntries()));
    t.true(Array.isArray(harness.storage()));
    t.true(Array.isArray(harness.apiRoutes()));
    t.true(Array.isArray(harness.spaceCalls()));
});

test("hub harness assertion helpers work without @scramjet/types", async (t) => {
    const harness = createHubHarness();

    await harness.hub.getVersion();
    await harness.hub.sendSequence({ name: "test-seq" });

    t.notThrows(() => {
        harness.assert.called({ method: "GET", path: "/api/v1/version" });
    });
    t.notThrows(() => {
        harness.assert.callCount({ method: "GET", path: "/api/v1/version" }, 1);
    });

    t.throws(() => {
        harness.assert.callCount({ method: "GET", path: "/api/v1/version" }, 99);
    });
});

test("hub harness streamed RPC returns Readable", async (t) => {
    const harness = createHubHarness();

    const stream = await harness.hub.callHostRpcStream("test-stream");

    t.true(stream instanceof Readable);
});

test("hub harness streamed topic data returns Readable", async (t) => {
    const harness = createHubHarness();

    const stream = await harness.hub.getNamedData("test-data");

    t.true(stream instanceof Readable);
});
