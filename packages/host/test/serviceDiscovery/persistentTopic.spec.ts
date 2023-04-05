import { Duplex, PassThrough, Readable, Stream } from "stream";
import { StreamOrigin, StreamType } from "../../src/lib/serviceDiscovery/streamHandler";
import TopicName from "../../src/lib/serviceDiscovery/topicName";
import ReadableStreamWrapper from "../../src/lib/streamWrapper/readableStreamWrapper";
import WritableStreamWrapper from "../../src/lib/streamWrapper/writableStreamWrapper";
import PersistentTopic from "../../src/lib/serviceDiscovery/persistentTopic";

let persistentSequence: Duplex;
let testPersistentTopic: PersistentTopic;
const testOrigin: StreamOrigin = { id: "TestEviroment", type: "hub" };

beforeEach(() => {
    testPersistentTopic = new PersistentTopic(new TopicName("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
    persistentSequence = testPersistentTopic.persistentSequence;
})

describe("Passing events thorugh persistent topic", () => {
    const waitForEvent = (eventName: string, source: Stream) => {
        return new Promise<boolean>((resolve, reject) => {
            const timeout = setTimeout(() => reject("Timeout"), 100);
            source.on(eventName, () => {
                clearTimeout(timeout);
                resolve(true);
            })
        })
    }

    test("Data event", async () => {
        const eventOccured = waitForEvent("data", persistentSequence);
        persistentSequence.on("readable", () => { persistentSequence.read() })
        testPersistentTopic.write("some text123");
        await expect(eventOccured).resolves.toBe(true);
    });
    // test("Error event", async () => {
    //     const eventOccured = waitForEvent("error", persistentSequence);
    //     testPersistentTopic.destroy(new Error("Test Error"));
    //     await expect(eventOccured).resolves.toBe(true);
    // });
    // test("Pause event", async () => {
    //     // const provider 
    //     // const consumer = WritableStreamWrapper.create(new PassThrough({ encoding: "ascii" }), "TestWriteStream1", StreamType.Instance, testOrigin, {});
    //     // testPersistentTopic.pipe(consumer)
    //     let testPersistentTopic = new PassThrough()
    //     await expect(testPersistentTopic.isPaused()).resolves.toBe(false);
    //     // const eventOccured = waitForEvent("pause", persistentSequence);
    //     testPersistentTopic.pause();
    //     await expect(testPersistentTopic.isPaused()).resolves.toBe(true);
    //     testPersistentTopic.resume();
    //     await expect(testPersistentTopic.isPaused()).resolves.toBe(false);
    //     // await expect(eventOccured).resolves.toBe(true);
    // });
    test("Readable event", async () => {
        const eventOccured = waitForEvent("readable", testPersistentTopic);
        testPersistentTopic.write("some text");
        await expect(eventOccured).resolves.toBe(true);
    });
    test("Resume event", async () => {
        const eventOccured = waitForEvent("resume", testPersistentTopic);
        testPersistentTopic.resume();
        await expect(eventOccured).resolves.toBe(true);
    });
})

describe("Data flow", () => {
    const testText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

    const createWaitingPromise = (): [Promise<void>, () => void, (_: any) => void] => {
        let res = () => { }
        let rej = (reason: any) => { };
        const promise = new Promise<void>((resolve, reject) => { res = resolve, rej = reject })
        return [promise, res, rej]
    }

    test("Basic flow", async () => {
        const topicFinished = new Promise(resolve => testPersistentTopic.on("readable", () => {
            resolve(testPersistentTopic.read());
        }));
        testPersistentTopic.write(testText);
        const result = await topicFinished
        expect(result).toBe(testText);
    });
    test("Piped flow", async () => {
        const testProvider = ReadableStreamWrapper.create(new PassThrough({ encoding: "ascii" }), "testReadStream", StreamType.Instance, testOrigin, {});
        const testConsumer = WritableStreamWrapper.create(new PassThrough({ encoding: "ascii" }), "testWriteStream", StreamType.Instance, testOrigin, {});

        testProvider.stream().pipe(testPersistentTopic).pipe(testConsumer);

        const readPromise = new Promise(resolve => testConsumer.stream().on("readable", () => {
            resolve(testConsumer.stream().read())
        }));
        testProvider.stream().push(testText);
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

        const createStreamProvider = (name: string, from: number, to: number): [ReadableStreamWrapper<Readable>, Promise<void>] => {
            const gen = generator(from, to);
            const provider = ReadableStreamWrapper.create(Readable.from(gen).setEncoding("ascii"), name, StreamType.Instance, testOrigin, {});
            const [streamEndPromise, streamEnd, streamError] = createWaitingPromise();
            provider.stream().on("close", streamEnd).on("error", streamError)
            return [provider, streamEndPromise];
        }

        const [provider1, provider1End] = createStreamProvider("TestReadStream1", 1, 10);
        const [provider2, provider2End] = createStreamProvider("TestReadStream2", 11, 20);
        const [provider3, provider3End] = createStreamProvider("TestReadStream3", 21, 30);

        provider1.stream().pipe(testPersistentTopic, { end: false });
        provider2.stream().pipe(testPersistentTopic, { end: false });
        provider3.stream().pipe(testPersistentTopic, { end: false });

        const result: number[] = [];
        testPersistentTopic.on("data", (chunk) => { result.push(Number(chunk)) })

        startGenerating();
        await Promise.all([provider1End, provider2End, provider3End]);
        result.sort((a: number, b: number) => a - b)
        const expectedResult = [...Array(30).keys()].map(val => val + 1);
        const match = result.length === expectedResult.length && !expectedResult.some((value, index) => result[index] !== value)
        expect(match).toBe(true);
    })
    test("Many Consumers reading", async () => {
        const consumer1 = WritableStreamWrapper.create(new PassThrough({ encoding: "ascii" }), "TestWriteStream1", StreamType.Instance, testOrigin, {});
        const consumer2 = WritableStreamWrapper.create(new PassThrough({ encoding: "ascii" }), "TestWriteStream1", StreamType.Instance, testOrigin, {});
        const consumer3 = WritableStreamWrapper.create(new PassThrough({ encoding: "ascii" }), "TestWriteStream1", StreamType.Instance, testOrigin, {});

        let result = ["", "", ""];
        const [readed1Promise, readed1] = createWaitingPromise();
        const [readed2Promise, readed2] = createWaitingPromise();
        const [readed3Promise, readed3] = createWaitingPromise();

        consumer1.stream().on("readable", () => {
            result[0] = consumer1.stream().read();
            readed1();
        })
        consumer2.stream().on("readable", () => {
            result[1] = consumer2.stream().read();
            readed2();
        })
        consumer3.stream().on("readable", () => {
            result[2] = consumer3.stream().read();
            readed3();
        })

        testPersistentTopic.pipe(consumer1);
        testPersistentTopic.pipe(consumer2);
        testPersistentTopic.pipe(consumer3);
        testPersistentTopic.write(testText);

        await Promise.all([readed1Promise, readed2Promise, readed3Promise]);
        expect(result[0]).toBe(testText);
        expect(result[1]).toBe(testText);
        expect(result[2]).toBe(testText);
    })
})
