import test from "ava";
import { PassThrough, Readable, Stream } from "stream";
import { StreamOrigin } from "@scramjet/types";
import { Topic, TopicEvent } from "../../src/lib/serviceDiscovery/topic";
import TopicId from "../../src/lib/serviceDiscovery/topicId";
import { ReadableState, WorkState } from "@scramjet/symbols";

const testOrigin: StreamOrigin = { id: "TestEviroment", type: "hub" };

const waitForEvent = (eventName: string, source: Stream) => {
    return new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => reject("Timeout"), 100);

        source.on(eventName, () => {
            clearTimeout(timeout);
            resolve(true);
        });
    });
};

const createWaitingPromise = (): [Promise<void>, () => void, (_: any) => void] => {
    let res = () => { };
    let rej = (_reason: any) => { };
    const promise = new Promise<void>((resolve, reject) => { res = resolve; rej = reject; });

    return [promise, res, rej];
};

// ── Duplex events ───────────────────────────────────────────────

test("Topic event flow: data event", async t => {
    const testTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
    const provider = new PassThrough();
    const consumer = new PassThrough();
    const eventOccured = waitForEvent("data", testTopic);

    provider.pipe(testTopic).pipe(consumer);

    consumer.on("readable", () => { consumer.read(); });
    provider.write("some text123");

    t.true(await eventOccured);
});

test("Topic event flow: pause event", async t => {
    const testTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
    const eventOccured = waitForEvent("pause", testTopic);

    testTopic.pause();
    t.true(await eventOccured);
});

test("Topic event flow: readable event", async t => {
    const testTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
    const eventOccured = waitForEvent("readable", testTopic);

    testTopic.write("some text");
    t.true(await eventOccured);
});

test("Topic event flow: resume event", async t => {
    const testTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
    const eventOccured = waitForEvent("resume", testTopic);

    testTopic.resume();
    t.true(await eventOccured);
});

// ── Topic events ────────────────────────────────────────────────

test("Topic event flow: state when error", async t => {
    const testTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
    const eventOccured = waitForEvent("error", testTopic);

    testTopic.destroy(new Error("Test Error"));
    await eventOccured;
    t.is(testTopic.state(), WorkState.Error);
});

test("Topic event flow: state flowing", async t => {
    const testTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
    const testProvider = new PassThrough({ encoding: "ascii" });
    const testConsumer = new PassThrough({ encoding: "ascii" });

    testProvider.pipe(testTopic);
    testTopic.pause();
    t.is(testTopic.state(), ReadableState.Pause);
    const eventPromise = waitForEvent(TopicEvent.StateChanged, testTopic);

    testTopic.pipe(testConsumer);
    await eventPromise;
    t.is(testTopic.state(), WorkState.Flowing);
});

// ── Data flow ───────────────────────────────────────────────────

test("Topic data flow: basic flow", async t => {
    const testTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
    const testText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
    const topicFinished = new Promise(resolve => testTopic.on("readable", () => {
        resolve(testTopic.read());
    }));

    testTopic.write(testText);
    const result = await topicFinished;

    t.is(result, testText);
});

test("Topic data flow: piped flow", async t => {
    const testTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
    const testText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
    const testProvider = new PassThrough();
    const testConsumer = new PassThrough({ encoding: "utf-8" });

    testProvider.pipe(testTopic).pipe(testConsumer);

    const readPromise = new Promise(resolve => testConsumer.on("readable", () => {
        resolve(testConsumer.read());
    }));

    testProvider.push(testText);
    const readValue = await readPromise;

    t.is(readValue, testText);
});

test("Topic data flow: many providers writing", async t => {
    const testTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });

    const [startGeneratingPromise, startGenerating] = createWaitingPromise();

    async function* generator(from: number, to: number) {
        let i = from;

        while (i <= to) {
            await startGeneratingPromise;
            yield Number(i++).toString();
        }
    }

    const createStreamProvider =
        (from: number, to: number): [Readable, Promise<void>] => {
            const gen = generator(from, to);
            const provider = Readable.from(gen).setEncoding("ascii");
            const [streamEndPromise, streamEnd, streamError] = createWaitingPromise();

            provider.on("close", streamEnd).on("error", streamError);
            return [provider, streamEndPromise];
        };

    const [provider1, provider1End] = createStreamProvider(1, 10);
    const [provider2, provider2End] = createStreamProvider(11, 20);
    const [provider3, provider3End] = createStreamProvider(21, 30);

    provider1.pipe(testTopic, { end: false });
    provider2.pipe(testTopic, { end: false });
    provider3.pipe(testTopic, { end: false });

    const result: number[] = [];

    testTopic.on("data", (chunk) => { result.push(Number(chunk)); });

    startGenerating();
    await Promise.all([provider1End, provider2End, provider3End]);
    result.sort((a: number, b: number) => a - b);
    const expectedResult = [...Array(30).keys()].map(val => val + 1);
    const match = result.length === expectedResult.length &&
        !expectedResult.some((value, index) => result[index] !== value);

    t.true(match);
});

test("Topic data flow: many consumers reading", async t => {
    const testTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
    const testText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
    const consumer1 = new PassThrough({ encoding: "ascii" });
    const consumer2 = new PassThrough({ encoding: "ascii" });
    const consumer3 = new PassThrough({ encoding: "ascii" });

    const result = ["", "", ""];
    const [readed1Promise, readed1] = createWaitingPromise();
    const [readed2Promise, readed2] = createWaitingPromise();
    const [readed3Promise, readed3] = createWaitingPromise();

    consumer1.on("readable", () => {
        result[0] = consumer1.read();
        readed1();
    });
    consumer2.on("readable", () => {
        result[1] = consumer2.read();
        readed2();
    });
    consumer3.on("readable", () => {
        result[2] = consumer3.read();
        readed3();
    });

    testTopic.pipe(consumer1);
    testTopic.pipe(consumer2);
    testTopic.pipe(consumer3);
    testTopic.write(testText);

    await Promise.all([readed1Promise, readed2Promise, readed3Promise]);
    t.is(result[0], testText);
    t.is(result[1], testText);
    t.is(result[2], testText);
});

// ── TopicId validation ─────────────────────────────────────────

test("TopicId validation: accepts dotted topic names", t => {
    t.true(TopicId.validate("receipt.request.v1"));
    t.true(TopicId.validate("receipt.response.v1"));
    t.true(TopicId.validate("receipt.signed.v1"));
});

test("TopicId validation: keeps existing underscore and dash names valid", t => {
    t.true(TopicId.validate("plain_topic"));
    t.true(TopicId.validate("plain-topic+v1"));
});

test("TopicId validation: rejects whitespace empty strings and backslashes", t => {
    t.false(TopicId.validate("bad space"));
    t.false(TopicId.validate(""));
    t.false(TopicId.validate("bad\\topic"));
});
