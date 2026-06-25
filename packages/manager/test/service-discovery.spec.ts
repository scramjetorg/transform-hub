import test from "ava";
import { ServiceDiscovery, TopicActor } from "../src/lib/service-discovery";
import { ActorRole, ActorType, ISTHController } from "@scramjet/types";
import { PassThrough } from "stream";

/**
 * Minimal mock ISTHController needed for host-type actors.
 */
function mockHostController(id: string): ISTHController & {
  calls: { upstream: number; downstream: number };
  streams: { upstream: PassThrough[]; downstream: PassThrough[] };
} {
    const calls = { upstream: 0, downstream: 0 };
    const streams = { upstream: [] as PassThrough[], downstream: [] as PassThrough[] };

    return {
        id,
        calls,
        streams,
        createDownstreamTopicRequest: async (_name: string, _contentType: string) => {
            calls.downstream += 1;
            const stream = new PassThrough();

            streams.downstream.push(stream);

            return stream as any;
        },
        createUpstreamTopicRequest: async (_name: string, _contentType: string) => {
            calls.upstream += 1;
            const stream = new PassThrough();

            streams.upstream.push(stream);

            return stream as any;
        },
    } as any as ISTHController & {
    calls: { upstream: number; downstream: number };
    streams: { upstream: PassThrough[]; downstream: PassThrough[] };
  };
}

function waitImmediate(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

function readChunk(stream: PassThrough): Promise<string> {
    return new Promise(resolve => {
        stream.once("data", chunk => resolve(Buffer.from(chunk).toString("utf8")));
    });
}

function readChunks(stream: PassThrough, count: number): Promise<string[]> {
    return new Promise(resolve => {
        const chunks: string[] = [];
        const onData = (chunk: Buffer) => {
            chunks.push(Buffer.from(chunk).toString("utf8"));

            if (chunks.length === count) {
                stream.off("data", onData);
                resolve(chunks);
            }
        };

        stream.on("data", onData);
    });
}

// ---------------------------------------------------------------------------
// ServiceDiscovery basics
// ---------------------------------------------------------------------------

test("ServiceDiscovery: exists returns false for unknown topic", (t) => {
    const sd = new ServiceDiscovery();

    t.false(sd.exists("unknown"));
});

test("ServiceDiscovery: createTopic and exists", (t) => {
    const sd = new ServiceDiscovery();

    sd.createTopic("test-topic", { contentType: "application/json" });
    t.true(sd.exists("test-topic"));
});

test("ServiceDiscovery: createTopic stores contentType", (t) => {
    const sd = new ServiceDiscovery();

    sd.createTopic("json-topic", { contentType: "application/json" });
    const topics = sd.list();

    const topic = topics.find((t_) => t_.name === "json-topic");

    t.not(topic, undefined);
    t.is(topic!.contentType, "application/json");
    t.deepEqual(topic!.actors, []);
});

test("ServiceDiscovery: findRole returns empty for non-existing topic", (t) => {
    const sd = new ServiceDiscovery();
    const providers = sd.findRole(ActorRole.PROVIDER, "nonexistent");

    t.deepEqual(providers, []);
});

test("ServiceDiscovery: findRole returns correct actors by role", (t) => {
    const sd = new ServiceDiscovery();

    sd.createTopic("multi-role", { contentType: "text/plain" });

    const provider = new TopicActor("multi-role", ActorRole.PROVIDER, ActorType.API, "text/plain", undefined as any);
    const consumer = new TopicActor("multi-role", ActorRole.CONSUMER, ActorType.API, "text/plain", undefined as any);

    sd.register(provider);
    sd.register(consumer);

    const providers = sd.findRole(ActorRole.PROVIDER, "multi-role");

    t.is(providers.length, 1);
    t.is(providers[0].role, ActorRole.PROVIDER);

    const consumers = sd.findRole(ActorRole.CONSUMER, "multi-role");

    t.is(consumers.length, 1);
    t.is(consumers[0].role, ActorRole.CONSUMER);
});

// ---------------------------------------------------------------------------
// ServiceDiscovery register / unregister
// ---------------------------------------------------------------------------

test("ServiceDiscovery: register creates topic if needed", (t) => {
    const sd = new ServiceDiscovery();
    const actor = new TopicActor("new-topic", ActorRole.PROVIDER, ActorType.API, "text/plain", undefined as any);

    sd.register(actor);

    t.true(sd.exists("new-topic"));
});

test("ServiceDiscovery: register adds actor to topic", (t) => {
    const sd = new ServiceDiscovery();
    const actor = new TopicActor("topic-1", ActorRole.PROVIDER, ActorType.API, "text/plain", undefined as any);

    sd.register(actor);

    const providers = sd.findRole(ActorRole.PROVIDER, "topic-1");

    t.is(providers.length, 1);
    t.is(providers[0].topic, "topic-1");
});

test("ServiceDiscovery: register does not add duplicate host actor for same role", (t) => {
    const sd = new ServiceDiscovery();
    const hostCtrl = mockHostController("host-1");

    const actor1 = new TopicActor("topic-1", ActorRole.PROVIDER, ActorType.HOST, "text/plain", hostCtrl as any);
    const actor2 = new TopicActor("topic-1", ActorRole.PROVIDER, ActorType.HOST, "text/plain", hostCtrl as any);

    sd.register(actor1);
    sd.register(actor2);

    const providers = sd.findRole(ActorRole.PROVIDER, "topic-1");

    t.is(providers.length, 1);
});

test("ServiceDiscovery: register allows different host for same role", (t) => {
    const sd = new ServiceDiscovery();
    const hostCtrl1 = mockHostController("host-1");
    const hostCtrl2 = mockHostController("host-2");

    const actor1 = new TopicActor("topic-1", ActorRole.PROVIDER, ActorType.HOST, "text/plain", hostCtrl1 as any);
    const actor2 = new TopicActor("topic-1", ActorRole.PROVIDER, ActorType.HOST, "text/plain", hostCtrl2 as any);

    sd.register(actor1);
    sd.register(actor2);

    const providers = sd.findRole(ActorRole.PROVIDER, "topic-1");

    t.is(providers.length, 2);
});

test("ServiceDiscovery: unregister marks actor retired", (t) => {
    const sd = new ServiceDiscovery();
    const actor = new TopicActor("topic-1", ActorRole.PROVIDER, ActorType.API, "text/plain", undefined as any);

    sd.register(actor);
    sd.unregister(actor);

    t.true(actor.retired);
});

test("ServiceDiscovery: list returns topic details", (t) => {
    const sd = new ServiceDiscovery();
    const hostCtrl = mockHostController("host-1");

    const provider = new TopicActor("api-topic", ActorRole.PROVIDER, ActorType.API, "application/json", undefined as any);
    const consumer = new TopicActor("api-topic", ActorRole.CONSUMER, ActorType.HOST, "application/json", hostCtrl as any);

    sd.register(provider);
    sd.register(consumer);

    const topics = sd.list();

    t.is(topics.length, 1);

    const topic = topics[0];

    t.is(topic.name, "api-topic");
    t.is(topic.contentType, "application/json");
    t.is(topic.actors.length, 2);

    const apiActor = topic.actors.find((a) => a.type === ActorType.API);
    const hostActor = topic.actors.find((a) => a.type === ActorType.HOST);

    t.not(apiActor, undefined);
    t.is(apiActor!.role, ActorRole.PROVIDER);
    t.is(apiActor!.stream, false);

    t.not(hostActor, undefined);
    t.is(hostActor!.role, ActorRole.CONSUMER);
    t.is(hostActor!.hostId, "host-1");
});

// ---------------------------------------------------------------------------
// TopicActor basics
// ---------------------------------------------------------------------------

test("TopicActor: constructor sets fields correctly", (t) => {
    const hostCtrl = mockHostController("host-1");
    const actor = new TopicActor("test-topic", ActorRole.PROVIDER, ActorType.HOST, "text/csv", hostCtrl as any);

    t.is(actor.topic, "test-topic");
    t.is(actor.role, ActorRole.PROVIDER);
    t.is(actor.type, ActorType.HOST);
    t.is(actor.contentType, "text/csv");
    t.is(actor.host?.id, "host-1");
    t.false(actor.retired);
    t.false(actor.handled);
    t.is(actor.stream, undefined);
});

test("TopicActor: addStream stores stream and wires close listener", (t) => {
    const actor = new TopicActor("test-topic", ActorRole.PROVIDER, ActorType.API, "text/plain", undefined as any);
    const stream = new PassThrough();

    const result = actor.addStream(stream);

    t.is(result, stream);
    t.is(actor.stream, stream);
    t.false(actor.retired);
});

test("TopicActor: stream error marks retired and emits update", async (t) => {
    const actor = new TopicActor("test-topic", ActorRole.PROVIDER, ActorType.API, "text/plain", undefined as any);
    const stream = new PassThrough();

    actor.addStream(stream);

    const updatePromise = new Promise<void>((resolve) => actor.on("update", () => resolve()));

    stream.destroy(new Error("test error"));

    await updatePromise;
    t.true(actor.retired);
});

test("TopicActor: stream close marks retired and emits update", async (t) => {
    const actor = new TopicActor("test-topic", ActorRole.PROVIDER, ActorType.API, "text/plain", undefined as any);
    const stream = new PassThrough();

    actor.addStream(stream);

    const updatePromise = new Promise<void>((resolve) => actor.on("update", () => resolve()));

    stream.destroy();

    await updatePromise;
    t.true(actor.retired);
});

// ---------------------------------------------------------------------------
// ServiceDiscovery onTopicUpdate / provider-consumer routing
// ---------------------------------------------------------------------------

test("ServiceDiscovery: onTopicUpdateWorker removes retired actors", (t) => {
    const sd = new ServiceDiscovery();

    const actor = new TopicActor("topic-1", ActorRole.PROVIDER, ActorType.API, "text/plain", undefined as any);

    sd.register(actor);

    // Simulate retired
    actor.retired = true;
    sd.onTopicUpdate("topic-1");

    // The topic should be cleaned up when no active actors remain
    // After the async microtask settles
    return new Promise<void>((resolve) => {
        setImmediate(() => {
            const providers = sd.findRole(ActorRole.PROVIDER, "topic-1");

            t.is(providers.length, 0);
            resolve();
        });
    });
});

test("ServiceDiscovery: same-host provider and consumer are not connected to themselves", (t) => {
    const sd = new ServiceDiscovery();

    const hostCtrl = mockHostController("host-1");

    const provider = new TopicActor("topic-1", ActorRole.PROVIDER, ActorType.HOST, "text/plain", hostCtrl as any);
    const consumer = new TopicActor("topic-1", ActorRole.CONSUMER, ActorType.HOST, "text/plain", hostCtrl as any);

    sd.register(provider);
    sd.register(consumer);

    // After registration, onTopicUpdateWorker runs asynchronously
    // Both host actors should have streams created via their host controllers
    return new Promise<void>((resolve) => {
        setImmediate(() => {
            t.is(hostCtrl.calls.upstream, 0);
            t.is(hostCtrl.calls.downstream, 0);
            t.is(provider.stream, undefined);
            t.is(consumer.stream, undefined);
            resolve();
        });
    });
});

test("ServiceDiscovery: exact host-to-host topic pair uses Manager data-plane pipe", (t) => {
    const sd = new ServiceDiscovery();
    const hostCtrl1 = mockHostController("host-1");
    const hostCtrl2 = mockHostController("host-2");

    const provider = new TopicActor("topic-2", ActorRole.PROVIDER, ActorType.HOST, "text/plain", hostCtrl1 as any);
    const consumer = new TopicActor("topic-2", ActorRole.CONSUMER, ActorType.HOST, "text/plain", hostCtrl2 as any);

    sd.register(provider);
    sd.register(consumer);

    return new Promise<void>((resolve) => {
        setImmediate(() => {
            t.is(hostCtrl1.calls.upstream, 1);
            t.is(hostCtrl2.calls.downstream, 1);
            t.not(provider.stream, undefined);
            t.not(consumer.stream, undefined);
            resolve();
        });
    });
});

test("ServiceDiscovery: host provider to host consumer cross-hub live data flow", async (t) => {
    const sd = new ServiceDiscovery();
    const hostCtrl1 = mockHostController("host-1");
    const hostCtrl2 = mockHostController("host-2");

    const provider = new TopicActor("topic-host-flow", ActorRole.PROVIDER, ActorType.HOST, "text/plain", hostCtrl1 as any);
    const consumer = new TopicActor("topic-host-flow", ActorRole.CONSUMER, ActorType.HOST, "text/plain", hostCtrl2 as any);

    sd.register(provider);
    sd.register(consumer);
    await waitImmediate();

    // Provider upstream feeds consumer downstream via Manager pipe
    t.is(hostCtrl1.calls.upstream, 1);
    t.is(hostCtrl2.calls.downstream, 1);
    t.not(provider.stream, undefined);
    t.not(consumer.stream, undefined);

    const received = readChunk(hostCtrl2.streams.downstream[0]);

    hostCtrl1.streams.upstream[0].write("cross-hub-payload");

    t.is(await received, "cross-hub-payload");
});

test("ServiceDiscovery: host provider end closes cross-hub consumer stream", async (t) => {
    const sd = new ServiceDiscovery();
    const hostCtrl1 = mockHostController("host-1");
    const hostCtrl2 = mockHostController("host-2");

    const provider = new TopicActor("topic-host-end", ActorRole.PROVIDER, ActorType.HOST, "text/plain", hostCtrl1 as any);
    const consumer = new TopicActor("topic-host-end", ActorRole.CONSUMER, ActorType.HOST, "text/plain", hostCtrl2 as any);

    sd.register(provider);
    sd.register(consumer);
    await waitImmediate();

    const ended = new Promise<void>(resolve => hostCtrl2.streams.downstream[0].once("finish", resolve));

    hostCtrl1.streams.upstream[0].end("final-payload");

    await ended;
    t.true(hostCtrl2.streams.downstream[0].writableEnded);
});

test("ServiceDiscovery: host provider to host consumer cross-hub cleanup on both stream close", async (t) => {
    const sd = new ServiceDiscovery();
    const hostCtrl1 = mockHostController("host-1");
    const hostCtrl2 = mockHostController("host-2");

    const provider = new TopicActor("topic-host-cleanup", ActorRole.PROVIDER, ActorType.HOST, "text/plain", hostCtrl1 as any);
    const consumer = new TopicActor("topic-host-cleanup", ActorRole.CONSUMER, ActorType.HOST, "text/plain", hostCtrl2 as any);

    sd.register(provider);
    sd.register(consumer);
    await waitImmediate();

    t.is(hostCtrl1.calls.upstream, 1);
    t.is(hostCtrl2.calls.downstream, 1);

    // Close both streams — triggers retired on each actor and topic cleanup
    await new Promise<void>((resolve) => {
        let updates = 0;
        const onUpdate = () => {
            updates++;
            if (updates >= 2) resolve();
        };
        consumer.on("update", onUpdate);
        provider.on("update", onUpdate);

        consumer.stream!.destroy();
        provider.stream!.destroy();
    });

    t.true(consumer.retired);
    t.true(provider.retired);

    // After async cleanup, the topic should be removed (no active actors remain)
    await waitImmediate();
    t.false(sd.exists("topic-host-cleanup"));
});

test("ServiceDiscovery: api-type provider stream reaches consumer stream", (t) => {
    const sd = new ServiceDiscovery();

    const provider = new TopicActor("topic-3", ActorRole.PROVIDER, ActorType.API, "text/plain", undefined as any);
    const consumer = new TopicActor("topic-3", ActorRole.CONSUMER, ActorType.API, "text/plain", undefined as any);

    // Add explicit streams (since API-type actors don't auto-create via host)
    const pStream = new PassThrough();
    const cStream = new PassThrough();

    provider.addStream(pStream);
    consumer.addStream(cStream);

    const received = new Promise<Buffer>((resolve) => {
        cStream.once("data", (chunk) => resolve(Buffer.from(chunk)));
    });

    sd.register(provider);
    sd.register(consumer);

    return new Promise<void>((resolve, reject) => {
        setImmediate(() => {
            pStream.write("payload");
            received
                .then((chunk) => {
                    t.is(chunk.toString(), "payload");
                    resolve();
                })
                .catch(reject);
        });
    });
});

test("ServiceDiscovery: Manager topic multiplexer routes API provider to STH consumer live", async (t) => {
    const sd = new ServiceDiscovery();
    const hostCtrl = mockHostController("host-1");
    const provider = new TopicActor("topic-api-to-sth", ActorRole.PROVIDER, ActorType.API, "text/plain", undefined as any);
    const consumer = new TopicActor("topic-api-to-sth", ActorRole.CONSUMER, ActorType.HOST, "text/plain", hostCtrl as any);
    const providerStream = new PassThrough();

    provider.addStream(providerStream);
    sd.register(provider);
    sd.register(consumer);
    await waitImmediate();

    t.is(hostCtrl.calls.downstream, 1);
    t.is(hostCtrl.streams.downstream.length, 1);

    const received = readChunk(hostCtrl.streams.downstream[0]);

    providerStream.write("api-to-sth");

    t.is(await received, "api-to-sth");
});

test("ServiceDiscovery: Manager topic multiplexer routes STH provider to API consumer live", async (t) => {
    const sd = new ServiceDiscovery();
    const hostCtrl = mockHostController("host-1");
    const provider = new TopicActor("topic-sth-to-api", ActorRole.PROVIDER, ActorType.HOST, "text/plain", hostCtrl as any);
    const consumer = new TopicActor("topic-sth-to-api", ActorRole.CONSUMER, ActorType.API, "text/plain", undefined as any);
    const consumerStream = new PassThrough();

    consumer.addStream(consumerStream);
    sd.register(provider);
    sd.register(consumer);
    await waitImmediate();

    t.is(hostCtrl.calls.upstream, 1);
    t.is(hostCtrl.streams.upstream.length, 1);

    const received = readChunk(consumerStream);

    hostCtrl.streams.upstream[0].write("sth-to-api");

    t.is(await received, "sth-to-api");
});

test("ServiceDiscovery: Manager topic multiplexer supports many-to-many live streams", async (t) => {
    const sd = new ServiceDiscovery();
    const providerA = new TopicActor("topic-many", ActorRole.PROVIDER, ActorType.API, "text/plain", undefined as any);
    const providerB = new TopicActor("topic-many", ActorRole.PROVIDER, ActorType.API, "text/plain", undefined as any);
    const consumerA = new TopicActor("topic-many", ActorRole.CONSUMER, ActorType.API, "text/plain", undefined as any);
    const consumerB = new TopicActor("topic-many", ActorRole.CONSUMER, ActorType.API, "text/plain", undefined as any);
    const providerAStream = new PassThrough();
    const providerBStream = new PassThrough();
    const consumerAStream = new PassThrough();
    const consumerBStream = new PassThrough();

    providerA.addStream(providerAStream);
    providerB.addStream(providerBStream);
    consumerA.addStream(consumerAStream);
    consumerB.addStream(consumerBStream);

    sd.register(providerA);
    sd.register(providerB);
    sd.register(consumerA);
    sd.register(consumerB);
    await waitImmediate();

    const consumerAChunks = readChunks(consumerAStream, 2);
    const consumerBChunks = readChunks(consumerBStream, 2);

    providerAStream.write("from-a");
    providerBStream.write("from-b");

    t.deepEqual(await consumerAChunks, ["from-a", "from-b"]);
    t.deepEqual(await consumerBChunks, ["from-a", "from-b"]);
});

test("ServiceDiscovery: list shows retired actors after removal via onTopicUpdate", (t) => {
    const sd = new ServiceDiscovery();

    const actor = new TopicActor("topic-4", ActorRole.PROVIDER, ActorType.API, "text/plain", undefined as any);

    sd.register(actor);

    // Count: one actor
    t.is(sd.list()[0].actors.length, 1);

    actor.retired = true;
    sd.onTopicUpdate("topic-4");

    return new Promise<void>((resolve) => {
        setImmediate(() => {
            // Topic should be deleted since no active actors remain
            t.false(sd.exists("topic-4"));
            resolve();
        });
    });
});
