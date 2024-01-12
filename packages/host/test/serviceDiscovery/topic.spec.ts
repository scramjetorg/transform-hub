import { PassThrough, Readable, Stream, Writable } from "stream";
import { ReadableState, StreamOrigin, WorkState } from "@scramjet/types";
import { Topic, TopicEvent } from "../../src/lib/serviceDiscovery/topic";
import TopicId from "../../src/lib/serviceDiscovery/topicId";

let testTopic: Topic;
const testOrigin: StreamOrigin = { id: "TestEviroment", type: "hub" };

beforeEach(() => {
    testTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
});

describe("Event flow", () => {
    const waitForEvent = (eventName: string, source: Stream) => {
        return new Promise<boolean>((resolve, reject) => {
            const timeout = setTimeout(() => reject("Timeout"), 100);

            source.on(eventName, () => {
                clearTimeout(timeout);
                resolve(true);
            });
        });
    };

    describe("Duplex events", () => {
        test("Data event", async () => {
            const provider = new PassThrough();
            const consumer = new PassThrough();
            const eventOccured = waitForEvent("data", testTopic);

            provider.pipe(testTopic).pipe(consumer);

            consumer.on("readable", () => { consumer.read(); });
            provider.write("some text123");

            await expect(eventOccured).resolves.toBe(true);
        });
        test("Pause event", async () => {
            const eventOccured = waitForEvent("pause", testTopic);

            testTopic.pause();
            await expect(eventOccured).resolves.toBe(true);
        });
        test("Readable event", async () => {
            const eventOccured = waitForEvent("readable", testTopic);

            testTopic.write("some text");
            await expect(eventOccured).resolves.toBe(true);
        });
        test("Resume event", async () => {
            const eventOccured = waitForEvent("resume", testTopic);

            testTopic.resume();
            await expect(eventOccured).resolves.toBe(true);
        });
    });
    describe("Topic events", () => {
        let testProvider: Readable;
        let testConsumer: Writable;

        beforeEach(() => {
            testProvider = new PassThrough({ encoding: "ascii" });
            testConsumer = new PassThrough({ encoding: "ascii" });
        });

        test("State when error", async () => {
            const eventOccured = waitForEvent("error", testTopic);

            testTopic.destroy(new Error("Test Error"));
            await eventOccured;
            expect(testTopic.state()).toBe(WorkState.Error);
        });

        test("State flowing", async () => {
            testProvider.pipe(testTopic);
            testTopic.pause();
            expect(testTopic.state()).toBe(ReadableState.Pause);
            const eventPromise = waitForEvent(TopicEvent.StateChanged, testTopic);

            testTopic.pipe(testConsumer);
            await eventPromise;
            expect(testTopic.state()).toBe(WorkState.Flowing);
        });
    });
});

describe("Data flow", () => {
    const testText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

    const createWaitingPromise = (): [Promise<void>, () => void, (_: any) => void] => {
        let res = () => { };
        let rej = (_reason: any) => { };
        const promise = new Promise<void>((resolve, reject) => { res = resolve; rej = reject; });

        return [promise, res, rej];
    };

    test("Basic flow", async () => {
        const topicFinished = new Promise(resolve => testTopic.on("readable", () => {
            resolve(testTopic.read());
        }));

        testTopic.write(testText);
        const result = await topicFinished;

        expect(result).toBe(testText);
    });
    test("Piped flow", async () => {
        const testProvider = new PassThrough();
        const testConsumer = new PassThrough({ encoding: "utf-8" });

        testProvider.pipe(testTopic).pipe(testConsumer);

        const readPromise = new Promise(resolve => testConsumer.on("readable", () => {
            resolve(testConsumer.read());
        }));

        testProvider.push(testText);
        const readValue = await readPromise;

        expect(readValue).toBe(testText);
    });
    test("Many Providers writing", async () => {
        const [startGeneratingPromise, startGenerating] = createWaitingPromise();

        async function* generator(from: number, to: number) {
            let i = from;

            while (i <= to) {
                await startGeneratingPromise;
                yield Number(i++).toString();
            }
        }

        const createStreamProvider =
            (name: string, from: number, to: number): [Readable, Promise<void>] => {
                const gen = generator(from, to);
                const provider = Readable.from(gen).setEncoding("ascii");
                const [streamEndPromise, streamEnd, streamError] = createWaitingPromise();

                provider.on("close", streamEnd).on("error", streamError);
                return [provider, streamEndPromise];
            };

        const [provider1, provider1End] = createStreamProvider("TestReadStream1", 1, 10);
        const [provider2, provider2End] = createStreamProvider("TestReadStream2", 11, 20);
        const [provider3, provider3End] = createStreamProvider("TestReadStream3", 21, 30);

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

        expect(match).toBe(true);
    });
    test("Many Consumers reading", async () => {
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
        expect(result[0]).toBe(testText);
        expect(result[1]).toBe(testText);
        expect(result[2]).toBe(testText);
    });
});
