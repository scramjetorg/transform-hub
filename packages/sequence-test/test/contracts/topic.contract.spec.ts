import test from "ava";
import { PassThrough } from "stream";

import { createHubHarness } from "../../src";
import { Topic } from "../../../host/src/lib/serviceDiscovery/topic";
import TopicId from "../../../host/src/lib/serviceDiscovery/topicId";
import { topicError } from "../../../host/src/lib/serviceDiscovery/topic-errors";

const HUB_BASE = "/api/v2";
const SPACE_BASE = "/api/v1/cpm/api/v2";
const MIME_TYPES = ["text/x-ndjson", "application/x-ndjson", "text/plain", "application/octet-stream"] as const;

function responseBody(response: { body?: unknown }) {
    return JSON.parse(String(response.body)) as Record<string, unknown>;
}

test("topic creation accepts only the four MIME types and caller-selected canonical names", async t => {
    const harness = createHubHarness({ basePath: HUB_BASE });

    for (const [index, contentType] of MIME_TYPES.entries()) {
        const name = `topic-${index}`;
        const response = await harness.hub.handle({
            method: "POST",
            path: `${HUB_BASE}/topics`,
            headers: { "content-type": "application/json" },
            body: { topic: { name, contentType } }
        });

        t.is(response.status, 200);
        t.is((responseBody(response).operation as { id: string }).id, name);
    }

    const missingName = await harness.hub.handle({
        method: "POST",
        path: `${HUB_BASE}/topics`,
        headers: { "content-type": "application/json" },
        body: { topic: { contentType: "text/plain" } }
    });
    t.is(missingName.status, 400);
    t.deepEqual(responseBody(missingName).error, { code: "INVALID_TOPIC", message: "Topic name is required" });

    const unsupported = await harness.hub.handle({
        method: "POST",
        path: `${HUB_BASE}/topics`,
        headers: { "content-type": "application/json" },
        body: { topic: { name: "unsupported", contentType: "application/json" } }
    });
    t.is(unsupported.status, 415);
    t.deepEqual(responseBody(unsupported).error, { code: "INVALID_CONTENT_TYPE", message: "Unsupported content-type" });
});

test("Hub exposes list/create/delete/read/write, without a Hub topic-info route", async t => {
    const harness = createHubHarness({ basePath: HUB_BASE });
    const name = "hub-orders";

    t.deepEqual(await harness.context.hub.post(`${HUB_BASE}/topics`, { topic: { name, contentType: "text/plain" } }), {
        operation: { id: name, status: "completed" },
        result: { topic: { name, contentType: "text/plain", origin: { type: "hub", id: "fixture-hub" } } }
    });
    t.deepEqual(await harness.context.hub.get(`${HUB_BASE}/topics`), {
        items: [{ name, contentType: "text/plain", origin: { type: "hub", id: "fixture-hub" } }]
    });

    const write = await harness.hub.handle({
        method: "POST",
        path: `${HUB_BASE}/topics/${name}/stream`,
        headers: { "content-type": "text/plain" },
        body: "order-1"
    });
    t.is(write.status, 200);
    t.deepEqual(responseBody(write).result, { accepted: true });

    const read = await harness.hub.handle({ method: "GET", path: `${HUB_BASE}/topics/${name}/stream`, headers: {} });
    t.is(read.status, 200);
    t.is(read.headers?.["content-type"], "text/plain");
    t.truthy(read.stream);

    const hubInfo = await harness.hub.handle({ method: "GET", path: `${HUB_BASE}/topics/${name}`, headers: {} });
    t.is(hubInfo.status, 404);

    t.deepEqual(await harness.context.hub.delete(`${HUB_BASE}/topics/${name}`), {
        operation: { id: name, status: "completed" },
        result: { topic: name, deleted: true }
    });
});

test("Space exposes list/info/read/write, without a Space topic-create route", async t => {
    const harness = createHubHarness({ basePath: SPACE_BASE });
    const name = "space-events";

    const read = await harness.hub.handle({ method: "GET", path: `${SPACE_BASE}/topics/${name}/stream`, headers: {} });
    t.is(read.status, 200);
    t.is(read.headers?.["content-type"], "application/x-ndjson");

    const write = await harness.hub.handle({
        method: "POST",
        path: `${SPACE_BASE}/topics/${name}/stream`,
        headers: { "content-type": "application/x-ndjson" },
        body: "{\"event\":1}\n"
    });
    t.is(write.status, 200);
    t.deepEqual(responseBody(write).result, { accepted: true });
    t.deepEqual(JSON.parse(String((await harness.hub.handle({ method: "GET", path: `${SPACE_BASE}/topics`, headers: {} })).body)), {
        items: [{ name, contentType: "application/x-ndjson", origin: { type: "space", id: "fixture-space" } }]
    });
    t.deepEqual(JSON.parse(String((await harness.hub.handle({ method: "GET", path: `${SPACE_BASE}/topics/${name}`, headers: {} })).body)), {
        name,
        contentType: "application/x-ndjson",
        origin: { type: "space", id: "fixture-space" }
    });

    const create = await harness.hub.handle({
        method: "POST",
        path: `${SPACE_BASE}/topics`,
        headers: { "content-type": "application/json" },
        body: { topic: { name: "not-created", contentType: "text/plain" } }
    });
    t.is(create.status, 404);

    const del = await harness.hub.handle({
        method: "DELETE",
        path: `${SPACE_BASE}/topics/${name}`,
        headers: {}
    });
    t.is(del.status, 404);
});

test("topic content-type conflicts preserve the canonical code", async t => {
    const harness = createHubHarness({ basePath: HUB_BASE });
    await harness.context.hub.post(`${HUB_BASE}/topics`, { topic: { name: "orders", contentType: "text/plain" } });

    const duplicate = await harness.hub.handle({
        method: "POST",
        path: `${HUB_BASE}/topics`,
        headers: { "content-type": "application/json" },
        body: { topic: { name: "orders", contentType: "application/octet-stream" } }
    });
    t.is(duplicate.status, 409);
    t.deepEqual(responseBody(duplicate).error, { code: "TOPIC_CONTENT_TYPE_MISMATCH", message: "Content-type mismatch" });
});

test("topic backpressure resumes delivery after the consumer drains", async t => {
    const topic = new Topic(new TopicId("backpressure"), "application/octet-stream", { type: "hub", id: "hub-1" });
    const consumer = new PassThrough();
    consumer.pause();
    topic.pipe(consumer);
    topic.pause();

    topic.write(Buffer.alloc(1_000_000));
    t.is((topic as unknown as { needDrain: boolean }).needDrain, true);

    consumer.resume();
    topic.resume();

    topic.destroy();
    consumer.destroy();
});

test("disconnect reports an error and reconnect starts a fresh live topic", async t => {
    const disconnected = new Topic(new TopicId("reconnect"), "text/plain", { type: "hub", id: "hub-1" });
    const error = new Promise<Error>(resolve => disconnected.once("error", resolve));
    disconnected.destroy(topicError("TOPIC_DISCONNECTED", "Topic connection disconnected"));
    t.is((await error as Error & { code?: string }).code, "TOPIC_DISCONNECTED");

    const reconnected = new Topic(new TopicId("reconnect"), "text/plain", { type: "hub", id: "hub-1" });
    const output: string[] = [];
    const consumer = new PassThrough();
    consumer.setEncoding("utf8").on("data", chunk => output.push(chunk));
    reconnected.pipe(consumer);
    reconnected.write("after-reconnect");
    await new Promise<void>(resolve => setImmediate(resolve));
    t.deepEqual(output, ["after-reconnect"]);

    reconnected.destroy();
    consumer.destroy();
});

test("a topic with zero consumers does not replay earlier writes", async t => {
    const topic = new Topic(new TopicId("live-only"), "text/plain", { type: "hub", id: "hub-1" });
    topic.write("not-replayed");

    const output: string[] = [];
    const consumer = new PassThrough();
    consumer.setEncoding("utf8").on("data", chunk => output.push(chunk));
    topic.pipe(consumer);
    topic.write("live");
    await new Promise<void>(resolve => setImmediate(resolve));

    t.deepEqual(output, ["live"]);
    topic.destroy();
    consumer.destroy();
});
