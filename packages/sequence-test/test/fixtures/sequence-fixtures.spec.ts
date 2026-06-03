import path from "node:path";

import test from "ava";

import { runSequence, createHubHarness, resolveSequenceFixtureMetadata } from "../../src";

const fixtureMetadataPath = async (name: string): Promise<string> => {
    const directory = path.resolve(__dirname, name);
    const metadata = await resolveSequenceFixtureMetadata(directory);

    return metadata.mainPath;
};

const collectStreamText = async (stream: AsyncIterable<unknown>): Promise<string> => {
    const chunks: string[] = [];

    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk as Buffer | string).toString("utf8"));
    }

    return chunks.join("");
};

test("appcontext fixture uses sequence app context", async t => {
    const sequencePath = await fixtureMetadataPath("appcontext");

    const result = await runSequence({
        runtime: "node",
        sequencePath,
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

test("metadata resolves package-backed fixture runtime", async t => {
    const sequencePath = await fixtureMetadataPath("ordered-behavior");
    const harness = createHubHarness();

    const result = await runSequence({
        runtime: "node",
        sequencePath,
        context: harness.context,
        input: {
            contentType: "application/x-ndjson",
            body: [{ id: "meta-1" }]
        }
    });

    t.deepEqual(result.output.ndjson(), [
        {
            id: "meta-1",
            metadata: "dev",
            topic: "fixture-topic-payload",
            rpc: "ordered",
            rpcChunk: "rpc-stream",
            topicChunk: "fixture-topic-payload"
        }
    ]);

    t.deepEqual(harness.lifecycle().map(entry => entry.action), ["keepAlive", "end"]);
});

test("hub-calls fixture makes expected host calls", async t => {
    const harness = createHubHarness();
    const sequencePath = await fixtureMetadataPath("hub-calls");

    const result = await runSequence({
        runtime: "node",
        sequencePath,
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
    const sequencePath = await fixtureMetadataPath("lifecycle-calls");

    const result = await runSequence({
        runtime: "node",
        sequencePath,
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
    const sequencePath = await fixtureMetadataPath("events");

    const result = await runSequence({
        runtime: "node",
        sequencePath,
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
    const sequencePath = await fixtureMetadataPath("exposed-api");

    const result = await runSequence({
        runtime: "node",
        sequencePath,
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

test("ordered fixture asserts ordered timeline across hub and behavior", async t => {
    const harness = createHubHarness();
    const sequencePath = await fixtureMetadataPath("ordered-behavior");

    const result = await runSequence({
        runtime: "node",
        sequencePath,
        context: harness.context,
        input: {
            contentType: "application/x-ndjson",
            body: [{ id: "ordered-1" }]
        }
    });

    t.deepEqual(result.output.ndjson(), [{
        id: "ordered-1",
        metadata: "dev",
        topic: "fixture-topic-payload",
        rpc: "ordered",
        rpcChunk: "rpc-stream",
        topicChunk: "fixture-topic-payload"
    }]);

    harness.assert.order([
        { method: "POST", path: "/api/v1/topics" },
        { method: "POST", path: "/api/v1/topics/ordered-behavior-topic" },
        { method: "GET", path: "/api/v1/topics/ordered-behavior-topic/stream" },
        { method: "GET", path: "/api/v1/version" },
        { method: "POST", path: "/api/v1/rpc/ordered" },
        { method: "POST", path: "/api/v1/rpc/ordered-stream/stream" }
    ]);

    t.deepEqual(harness.lifecycle().map(entry => entry.action), ["keepAlive", "end"]);
    t.deepEqual(harness.events().map(entry => `${entry.scope}:${entry.name}`), ["host:item.processed", "space:item.processed"]);
    t.deepEqual(harness.storage().map(entry => entry.action), ["setItem", "getItem", "removeItem"]);
    t.deepEqual(harness.logs().map(entry => entry.level), ["info"]);
    t.deepEqual(harness.apiRoutes().map(entry => entry.path), ["/health"]);
    t.deepEqual(harness.spaceCalls().map(entry => `${entry.method} ${entry.path}`), ["GET /v1/ping"]);

});

test("stream fixture captures streamed RPC and topic responses", async t => {
    const sequencePath = await fixtureMetadataPath("stream-behavior");
    const harness = createHubHarness({
        streamDefaults: {
            rpc: "ordered-rpc",
            topic: "ordered-topic-stream"
        }
    });

    const result = await runSequence({
        runtime: "node",
        sequencePath,
        context: harness.context,
        input: {
            contentType: "application/x-ndjson",
            body: [{ id: "stream-1" }]
        }
    });

    t.deepEqual(result.output.ndjson(), [{
        id: "stream-1",
        topicChunk: "payload",
        rpcChunk: "ordered-rpc"
    }]);

    t.deepEqual(harness.calls().map(entry => `${entry.method} ${entry.path}`), [
        "POST /api/v1/topics",
        "POST /api/v1/topics/stream-behavior-topic",
        "GET /api/v1/topics/stream-behavior-topic/stream",
        "POST /api/v1/rpc/stream-behavior-stream/stream"
    ]);

    const directRpcStream = await harness.hub.callHostRpcStream("stream-behavior-stream");
    const directTopicStream = await harness.hub.getNamedData("stream-behavior-topic");

    t.is(await collectStreamText(directRpcStream), "ordered-rpc");
    t.is(await collectStreamText(directTopicStream), "payload");
});

test("space context supports minimal invocation", async t => {
    const harness = createHubHarness();
    const sequencePath = await fixtureMetadataPath("space-minimal");

    const result = await runSequence({
        runtime: "node",
        sequencePath,
        context: harness.context,
        input: {
            contentType: "application/x-ndjson",
            body: [{ id: "space-1" }]
        }
    });

    t.deepEqual(result.output.ndjson(), [{ id: "space-1", spaceCallsRecorded: true }]);
    t.deepEqual(harness.spaceCalls().map(entry => `${entry.method} ${entry.path}`), [
        "GET /space/ping",
        "GET /space/echo",
        "POST /space/echo",
        "POST /space/send"
    ]);
});
