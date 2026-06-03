import path from "node:path";

import test from "ava";

import { runSequence } from "../../src";

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
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const result = await runSequence({
        runtime: "node",
        sequencePath: fixture("hub-calls"),
        context: {
            hub: {
                get: async (route: string) => calls.push({ method: "GET", path: route }),
                post: async (route: string, body: unknown) => calls.push({ method: "POST", path: route, body })
            }
        },
        input: {
            contentType: "application/x-ndjson",
            body: [{ id: "job-1" }]
        }
    });

    t.deepEqual(result.output.ndjson(), [{ id: "job-1", reported: true }]);
    t.deepEqual(calls, [
        { method: "GET", path: "/api/v1/version" },
        { method: "POST", path: "/api/v1/events", body: { type: "item.processed", id: "job-1" } }
    ]);
});

test("lifecycle-calls fixture uses keepAlive and end", async t => {
    const lifecycle: Array<{ name: string; value?: unknown }> = [];
    const result = await runSequence({
        runtime: "node",
        sequencePath: fixture("lifecycle-calls"),
        context: {
            keepAlive: (milliseconds: number) => lifecycle.push({ name: "keepAlive", value: milliseconds }),
            end: () => lifecycle.push({ name: "end" })
        },
        input: {
            contentType: "application/x-ndjson",
            body: [{ command: "stop" }]
        }
    });

    t.deepEqual(result.output.ndjson(), [{ command: "stop", handled: true }]);
    t.deepEqual(lifecycle, [
        { name: "keepAlive", value: 250 },
        { name: "end" }
    ]);
});

test("events fixture emits host and space events", async t => {
    const events: Array<{ scope: string; name: string; message: unknown }> = [];
    const result = await runSequence({
        runtime: "node",
        sequencePath: fixture("events"),
        context: {
            emit: (name: string, message: unknown) => events.push({ scope: "host", name, message }),
            emitToSpace: (name: string, message: unknown) => events.push({ scope: "space", name, message })
        },
        input: {
            contentType: "application/x-ndjson",
            body: [{ id: "order-1" }]
        }
    });

    t.deepEqual(result.output.ndjson(), [{ id: "order-1", emitted: true }]);
    t.deepEqual(events, [
        { scope: "host", name: "item.received", message: { id: "order-1" } },
        { scope: "space", name: "item.received", message: { id: "order-1", scope: "space" } }
    ]);
});

test("exposed-api fixture registers an endpoint", async t => {
    const routes: Array<{ path: string; handler: unknown }> = [];
    const result = await runSequence({
        runtime: "node",
        sequencePath: fixture("exposed-api"),
        context: {
            api: {
                use: (route: string, handler: unknown) => routes.push({ path: route, handler })
            }
        },
        input: {
            contentType: "application/x-ndjson",
            body: [{ id: "api-1" }]
        }
    });

    t.deepEqual(result.output.ndjson(), [{ id: "api-1", apiRegistered: true }]);
    t.is(routes.length, 1);
    t.is(routes[0].path, "/health");
    t.is(typeof routes[0].handler, "function");
});
