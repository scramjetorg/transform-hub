import { EventEmitter, PassThrough, Readable } from "stream";
import { StreamOrigin } from "../../src/lib/serviceDiscovery/streamHandler";
import TopicId from "../../src/lib/serviceDiscovery/topicId";
import PersistentTopic from "../../src/lib/serviceDiscovery/persistentTopic";

let testPersistentTopic: PersistentTopic;
const testOrigin: StreamOrigin = { id: "TestEviroment", type: "hub" };

beforeEach(() => {
    const mockInstance = new PassThrough();

    testPersistentTopic = new PersistentTopic(mockInstance, mockInstance, new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
});

describe("Passing events thorugh persistent topic", () => {
    const waitForEvent = (eventName: string, source: EventEmitter) => {
        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject("Timeout"), 100);

            source.on(eventName, () => {
                clearTimeout(timeout);
                resolve();
            });
        });
    };

    test("Data event", async () => {
        const provider = new PassThrough();
        const consumer = new PassThrough();
        const eventOccured = waitForEvent("data", testPersistentTopic);

        provider.pipe(testPersistentTopic).pipe(consumer);

        consumer.on("readable", () => { consumer.read(); });
        provider.write("some text123");
        await expect(eventOccured).resolves;
    });

    test("Readable event", async () => {
        const eventOccured = waitForEvent("readable", testPersistentTopic);

        testPersistentTopic.write("some text");
        await expect(eventOccured).resolves;
    });
    test("Resume event", async () => {
        const eventOccured = waitForEvent("resume", testPersistentTopic);

        testPersistentTopic.resume();
        await expect(eventOccured).resolves;
    });
    test("Pause event", async () => {
        const eventOccured = waitForEvent("pause", testPersistentTopic);

        testPersistentTopic.pause();
        await expect(eventOccured).resolves;
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
        const instance = new PassThrough({ highWaterMark: 0 });

        testPersistentTopic = new PersistentTopic(instance, instance, new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
        const topicFinished = new Promise(resolve => testPersistentTopic.on("readable", () => {
            resolve(testPersistentTopic.read());
        }));

        testPersistentTopic.write(testText);
        const result = await topicFinished;

        expect(result).toBe(testText);
    });

    test("Piped flow", async () => {
        const testProvider = new PassThrough({ encoding: "ascii" });
        const testConsumer = new PassThrough({ encoding: "ascii" });

        testProvider.pipe(testPersistentTopic, { end: false }).pipe(testConsumer);

        const readPromise = new Promise(resolve => testConsumer.on("readable", () => {
            resolve(testConsumer.read());
        }));

        testProvider.write(testText);
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

        provider1.pipe(testPersistentTopic, { end: false });
        provider2.pipe(testPersistentTopic, { end: false });
        provider3.pipe(testPersistentTopic, { end: false });

        const result: number[] = [];

        testPersistentTopic.on("data", (chunk) => { result.push(Number(chunk)); });

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

        testPersistentTopic.pipe(consumer1);
        testPersistentTopic.pipe(consumer2);
        testPersistentTopic.pipe(consumer3);
        testPersistentTopic.write(testText);

        await Promise.all([readed1Promise, readed2Promise, readed3Promise]);
        expect(result[0]).toBe(testText);
        expect(result[1]).toBe(testText);
        expect(result[2]).toBe(testText);
    });
});
