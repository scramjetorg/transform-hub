import { PassThrough, Readable, Stream } from "stream";
import { StreamOrigin, StreamType } from "../../src/lib/serviceDiscovery/streamHandler";
import { Topic } from "../../src/lib/serviceDiscovery/topic";
import TopicId from "../../src/lib/serviceDiscovery/topicId";
import ReadableStreamWrapper from "../../src/lib/streamWrapper/readableStreamWrapper";
// import WritableStreamWrapper from "../../src/lib/streamWrapper/writableStreamWrapper";

let testTopic: Topic;
const testOrigin: StreamOrigin = { id: "TestEviroment", type: "hub" };

beforeEach(() => {
    testTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin, { encoding: "ascii" });
});

// describe("Provider management", () => {
//     let testProvider: ReadableStreamWrapper<Readable>;

//     beforeEach(() => {
//         testProvider = ReadableStreamWrapper.create(new Readable({ read: () => { } }), "testReadStream", StreamType.Instance, testOrigin, {});
//     });

//     test("Automaticly add provider on pipe", () => {
//         expect(testTopic.providers.size).toBe(0);
//         testProvider.stream().pipe(testTopic);
//         expect(testTopic.providers.size).toBe(1);
//     });

//     test("Add only unique streams on pipe", () => {
//         testProvider.stream().pipe(testTopic);
//         testProvider.stream().pipe(testTopic);
//         testProvider.stream().pipe(testTopic);
//         expect(testTopic.providers.size).toBe(1);
//     });

//     test("Add multiple providers on pipe", () => {
//         const testProvider1 = ReadableStreamWrapper.create(new Readable({ read: () => { } }), "testReadStream1", StreamType.Instance, testOrigin, {});
//         const testProvider2 = ReadableStreamWrapper.create(new Readable({ read: () => { } }), "testReadStream2", StreamType.Instance, testOrigin, {});
//         const testProvider3 = ReadableStreamWrapper.create(new Readable({ read: () => { } }), "testReadStream3", StreamType.Instance, testOrigin, {});

//         testProvider1.stream().pipe(testTopic);
//         testProvider2.stream().pipe(testTopic);
//         testProvider3.stream().pipe(testTopic);

//         expect(testTopic.providers.size).toBe(3);
//     });

//     test("Add other topic as provider", () => {
//         const otherTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin);

//         otherTopic.pipe(testTopic);
//         expect(testTopic.providers.size).toBe(1);
//     });

//     test("Automaticly remove provider on unpipe(source)", () => {
//         testProvider.stream().pipe(testTopic);
//         expect(testTopic.providers.size).toBe(1);
//         testProvider.stream().unpipe(testTopic);
//         expect(testTopic.providers.size).toBe(0);
//     });
// });

// describe("Consumer management", () => {
//     let testConsumer: WritableStreamWrapper<Writable>;

//     beforeEach(() => {
//         testConsumer = WritableStreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream", StreamType.Instance, testOrigin, {});
//     });

//     test("Automaticly add consumer on pipe", () => {
//         expect(testTopic.consumers.size).toBe(0);
//         testTopic.pipe(testConsumer);
//         expect(testTopic.consumers.size).toBe(1);
//     });

//     test("Add only unique streams on pipe", () => {
//         testTopic.pipe(testConsumer);
//         testTopic.pipe(testConsumer);
//         testTopic.pipe(testConsumer);
//         expect(testTopic.consumers.size).toBe(1);
//     });

//     test("Add multiple consumer on pipe", () => {
//         const testConsumer1 = WritableStreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream1", StreamType.Instance, testOrigin, {});
//         const testConsumer2 = WritableStreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream2", StreamType.Instance, testOrigin, {});
//         const testConsumer3 = WritableStreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream3", StreamType.Instance, testOrigin, {});

//         testTopic.pipe(testConsumer1);
//         testTopic.pipe(testConsumer2);
//         testTopic.pipe(testConsumer3);

//         expect(testTopic.consumers.size).toBe(3);
//     });

//     test("Add other topic as consumer", () => {
//         const otherTopic = new Topic(new TopicId("TestTopic"), "text/plain", testOrigin);

//         testTopic.pipe(otherTopic);
//         expect(testTopic.consumers.size).toBe(1);
//     });

//     test("Automaticly remove consumer on unpipe(source)", () => {
//         testTopic.pipe(testConsumer.stream());
//         expect(testTopic.consumers.size).toBe(1);
//         testTopic.unpipe(testConsumer.stream());
//         expect(testTopic.consumers.size).toBe(0);
//     });

//     test("Automaticly remove all consumers on unpipe()", () => {
//         const testConsumer1 = WritableStreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream1", StreamType.Instance, testOrigin, {});
//         const testConsumer2 = WritableStreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream2", StreamType.Instance, testOrigin, {});
//         const testConsumer3 = WritableStreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream3", StreamType.Instance, testOrigin, {});

//         testTopic.pipe(testConsumer1);
//         testTopic.pipe(testConsumer2);
//         testTopic.pipe(testConsumer3);

//         expect(testTopic.consumers.size).toBe(3);
//         testTopic.unpipe();
//         expect(testTopic.consumers.size).toBe(0);
//     });
// });

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
            const eventOccured = waitForEvent("data", testTopic);

            testTopic.on("readable", () => { testTopic.read(); });
            testTopic.write("some text123");
            await expect(eventOccured).resolves.toBe(true);
        });
        // test("Error event", async () => {
        //     const eventOccured = waitForEvent("error", testTopic);

        //     testTopic.destroy(new Error("Test Error"));
        //     await expect(eventOccured).resolves.toBe(true);
        // });
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
    // describe("Topic events", () => {
    //     let testProvider: ReadableStreamWrapper<Readable>;
    //     let testConsumer: WritableStreamWrapper<Writable>;

    //     beforeEach(() => {
    //         testProvider = ReadableStreamWrapper.create(new PassThrough({ encoding: "ascii" }), "testReadStream", StreamType.Instance, testOrigin, {});
    //         testConsumer = WritableStreamWrapper.create(new PassThrough({ encoding: "ascii" }), "testWriteStream", StreamType.Instance, testOrigin, {});
    //     });

    //     test("State when error", async () => {
    //         const eventOccured = waitForEvent("error", testTopic);

    //         testTopic.destroy(new Error("Test Error"));
    //         await eventOccured;
    //         expect(testTopic.state()).toBe(WorkState.Error);
    //     });

    // test("State flowing", async () => {
    //     testProvider.stream().pipe(testTopic);
    //     expect(testTopic.state()).toBe(ReadableState.Pause);
    //     const eventPromise = waitForEvent(TopicEvent.StateChanged, testTopic);

    //     testTopic.pipe(testConsumer);
    //     await eventPromise;
    //     expect(testTopic.state()).toBe(WorkState.Flowing);
    // });

    // test("ProvidersChanged on add", async () => {
    //     const eventPromise = waitForEvent(TopicEvent.ProvidersChanged, testTopic);

    //     testProvider.stream().pipe(testTopic);
    //     await eventPromise;
    //     expect(testTopic.providers.size).toBe(1);
    // });
    // test("ProvidersChanged on remove", async () => {
    //     let eventPromise = waitForEvent(TopicEvent.ProvidersChanged, testTopic);

    //     testProvider.stream().pipe(testTopic);
    //     await eventPromise;
    //     eventPromise = waitForEvent(TopicEvent.ProvidersChanged, testTopic);
    //     testProvider.stream().unpipe(testTopic);
    //     expect(testTopic.providers.size).toBe(0);
    // });
    // test("ConsumersChanged on add", async () => {
    //     const eventPromise = waitForEvent(TopicEvent.ConsumersChanged, testTopic);

    //     testTopic.pipe(testConsumer);
    //     await eventPromise;
    //     expect(testTopic.consumers.size).toBe(1);
    // });
    // test("ConsumersChanged on remove", async () => {
    //     let eventPromise = waitForEvent(TopicEvent.ConsumersChanged, testTopic);

    //     testTopic.pipe(testConsumer);
    //     await eventPromise;
    //     eventPromise = waitForEvent(TopicEvent.ConsumersChanged, testTopic);
    //     testTopic.unpipe(testConsumer);
    //     expect(testTopic.consumers.size).toBe(0);
    // });
    // });
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
        // const testProvider = ReadableStreamWrapper.create(new PassThrough({ encoding: "ascii" }), "testReadStream", StreamType.Instance, testOrigin, {});
        // const testConsumer = WritableStreamWrapper.create(new PassThrough({ encoding: "ascii" }), "testWriteStream", StreamType.Instance, testOrigin, {});

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
            (name: string, from: number, to: number): [ReadableStreamWrapper<Readable>, Promise<void>] => {
                const gen = generator(from, to);
                const provider = ReadableStreamWrapper.create(Readable.from(gen).setEncoding("ascii"), name, StreamType.Instance, testOrigin, {});
                const [streamEndPromise, streamEnd, streamError] = createWaitingPromise();

                provider.stream().on("close", streamEnd).on("error", streamError);
                return [provider, streamEndPromise];
            };

        const [provider1, provider1End] = createStreamProvider("TestReadStream1", 1, 10);
        const [provider2, provider2End] = createStreamProvider("TestReadStream2", 11, 20);
        const [provider3, provider3End] = createStreamProvider("TestReadStream3", 21, 30);

        provider1.stream().pipe(testTopic, { end: false });
        provider2.stream().pipe(testTopic, { end: false });
        provider3.stream().pipe(testTopic, { end: false });

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
        // const consumer1 = WritableStreamWrapper.create(new PassThrough({ encoding: "ascii" }), "TestWriteStream1", StreamType.Instance, testOrigin, {});
        // const consumer2 = WritableStreamWrapper.create(new PassThrough({ encoding: "ascii" }), "TestWriteStream1", StreamType.Instance, testOrigin, {});
        // const consumer3 = WritableStreamWrapper.create(new PassThrough({ encoding: "ascii" }), "TestWriteStream1", StreamType.Instance, testOrigin, {});
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
