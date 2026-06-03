import path from "node:path";

import test from "ava";

import { runSequence } from "../../src";
import { createHubHarness } from "../../src";

const fixture = (name: string) => path.resolve(__dirname, name, "index.js");

test("appcontext fixture uses sequence app context", async t => {
    const result = await runSequence({
        runtime: "node",
        sequencePath: fixture("appcontext"),
        context: {
            config: { multiplier: 3 },
            instanceId: "instance-1"
        },
        input: {
            contentType: "application/x-ndjson",
            body: [{ id: 1, value: 2 }]
        }
    });

    t.deepEqual(result.output.ndjson(), [{ id: 1, value: 6, instanceId: "instance-1" }]);
});

test("hub-calls fixture makes expected host calls", async t => {
    const harness = createHubHarness();

    const result = await runSequence({
        runtime: "node",
        sequencePath: fixture("hub-calls"),
        context: harness.context,
        input: {
            contentType: "application/x-ndjson",
            body: [{ id: "job-1" }]
        }
    });

    t.deepEqual(result.output.ndjson(), [{ id: "job-1", reported: true }]);

    const hubCalls = harness.calls().map(entry => ({
        method: entry.method,
        path: entry.path,
        body: entry.body
    }));

    t.true(hubCalls.some(
        entry => entry.method === "GET" && entry.path === "/api/v1/version" && entry.body === undefined
    ));
    t.true(hubCalls.some(
        entry => entry.method === "POST" && entry.path === "/api/v1/events" &&
            typeof entry.body === "object" && !!entry.body &&
            (entry.body as { type: string; id: string }).type === "item.processed" &&
            (entry.body as { type: string; id: string }).id === "job-1"
    ));
});

test("lifecycle-calls fixture uses keepAlive and end", async t => {
    const harness = createHubHarness();

    const result = await runSequence({
        runtime: "node",
        sequencePath: fixture("lifecycle-calls"),
        context: harness.context,
        input: {
            contentType: "application/x-ndjson",
            body: [{ command: "stop" }]
        }
    });

    t.deepEqual(result.output.ndjson(), [{ command: "stop", handled: true }]);
    t.deepEqual(
        harness.lifecycle().map((entry) => entry.action),
        ["keepAlive", "end"]
    );
});

test("events fixture emits host and space events", async t => {
    const harness = createHubHarness();

    const result = await runSequence({
        runtime: "node",
        sequencePath: fixture("events"),
        context: harness.context,
        input: {
            contentType: "application/x-ndjson",
            body: [{ id: "order-1" }]
        }
    });

    t.deepEqual(result.output.ndjson(), [{ id: "order-1", emitted: true }]);
    t.deepEqual(harness.events().map((entry) => ({
        scope: entry.scope,
        name: entry.name,
        message: entry.message
    })), [
        { scope: "host", name: "item.received", message: { id: "order-1" } },
        { scope: "space", name: "item.received", message: { id: "order-1", scope: "space" } }
    ]);
});

test("exposed-api fixture registers an endpoint", async t => {
    const harness = createHubHarness();

    const result = await runSequence({
        runtime: "node",
        sequencePath: fixture("exposed-api"),
        context: harness.context,
        input: {
            contentType: "application/x-ndjson",
            body: [{ id: "api-1" }]
        }
    });

    t.deepEqual(result.output.ndjson(), [{ id: "api-1", apiRegistered: true }]);
    t.is(harness.apiRoutes().length, 1);
    t.is(harness.apiRoutes()[0].path, "/health");
    t.true(typeof harness.apiRoutes()[0].handler === "function");
});
