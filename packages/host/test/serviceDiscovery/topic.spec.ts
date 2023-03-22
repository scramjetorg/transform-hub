import { PassThrough, Readable, Stream, Writable } from "stream";
import { ReadableState, StreamType, WorkState } from "../../src/lib/serviceDiscovery/StreamHandler";
import StreamWrapper from "../../src/lib/serviceDiscovery/StreamWrapper";
import Topic, { TopicEvent } from "../../src/lib/serviceDiscovery/topic";
import TopicName from "../../src/lib/serviceDiscovery/topicName";

let testTopic: Topic;

beforeEach(() => {
    testTopic = new Topic(new TopicName("TestTopic"), "test content", { encoding: "ascii" });
})

describe("Provider management", () => {
    let testProvider: StreamWrapper<Readable>;

    beforeEach(() => {
        testProvider = StreamWrapper.create(new Readable({ read: () => { } }), "testReadStream", StreamType.Instance, {});
    })

    test("Automaticly add provider on pipe", () => {
        expect(testTopic.providers.size).toBe(0);
        testProvider.stream().pipe(testTopic);
        expect(testTopic.providers.size).toBe(1);
    })

    test("Add only unique streams on pipe", () => {
        testProvider.stream().pipe(testTopic);
        testProvider.stream().pipe(testTopic);
        testProvider.stream().pipe(testTopic);
        expect(testTopic.providers.size).toBe(1);
    })

    test("Add multiple providers on pipe", () => {
        const testProvider1 = StreamWrapper.create(new Readable({ read: () => { } }), "testReadStream1", StreamType.Instance, {});
        const testProvider2 = StreamWrapper.create(new Readable({ read: () => { } }), "testReadStream2", StreamType.Instance, {});
        const testProvider3 = StreamWrapper.create(new Readable({ read: () => { } }), "testReadStream3", StreamType.Instance, {});

        testProvider1.stream().pipe(testTopic);
        testProvider2.stream().pipe(testTopic);
        testProvider3.stream().pipe(testTopic);

        expect(testTopic.providers.size).toBe(3);
    })

    test("Add other topic as provider", () => {
        const otherTopic = new Topic(new TopicName("TestTopic"), "test content");
        otherTopic.pipe(testTopic);
        expect(testTopic.providers.size).toBe(1);
    })

    test("Automaticly remove provider on unpipe(source)", () => {
        testProvider.stream().pipe(testTopic);
        expect(testTopic.providers.size).toBe(1);
        testProvider.stream().unpipe(testTopic);
        expect(testTopic.providers.size).toBe(0);
    })
})

describe("Consumer management", () => {
    let testConsumer: StreamWrapper<Writable>;

    beforeEach(() => {
        testConsumer = StreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream", StreamType.Instance, {});
    })

    test("Automaticly add consumer on pipe", () => {
        expect(testTopic.consumers.size).toBe(0);
        testTopic.pipe(testConsumer);
        expect(testTopic.consumers.size).toBe(1);
    })

    test("Add only unique streams on pipe", () => {
        testTopic.pipe(testConsumer);
        testTopic.pipe(testConsumer);
        testTopic.pipe(testConsumer);
        expect(testTopic.consumers.size).toBe(1);
    })

    test("Add multiple consumer on pipe", () => {
        const testConsumer1 = StreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream1", StreamType.Instance, {});
        const testConsumer2 = StreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream2", StreamType.Instance, {});
        const testConsumer3 = StreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream3", StreamType.Instance, {});

        testTopic.pipe(testConsumer1);
        testTopic.pipe(testConsumer2);
        testTopic.pipe(testConsumer3);

        expect(testTopic.consumers.size).toBe(3);
    })

    test("Add other topic as consumer", () => {
        const otherTopic = new Topic(new TopicName("TestTopic"), "test content");
        testTopic.pipe(otherTopic);
        expect(testTopic.consumers.size).toBe(1);
    })

    test("Automaticly remove consumer on unpipe(source)", () => {
        testTopic.pipe(testConsumer.stream());
        expect(testTopic.consumers.size).toBe(1);
        testTopic.unpipe(testConsumer.stream());
        expect(testTopic.consumers.size).toBe(0);
    })

    test("Automaticly remove all consumers on unpipe()", () => {
        const testConsumer1 = StreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream1", StreamType.Instance, {});
        const testConsumer2 = StreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream2", StreamType.Instance, {});
        const testConsumer3 = StreamWrapper.create(new Writable({ write: () => { } }), "testWriteStream3", StreamType.Instance, {});

        testTopic.pipe(testConsumer1);
        testTopic.pipe(testConsumer2);
        testTopic.pipe(testConsumer3);

        expect(testTopic.consumers.size).toBe(3);
        testTopic.unpipe();
        expect(testTopic.consumers.size).toBe(0);
    })
})

describe("Event flow", () => {
    const waitForEvent = (eventName: string, source: Stream) => {
        return new Promise<boolean>((resolve, reject) => {
            const timeout = setTimeout(() => reject("Timeout"), 100);
            source.on(eventName, () => {
                clearTimeout(timeout);
                resolve(true);
            })
        })
    }

    describe("Duplex events", () => {
        test("Data event", async () => {
            const eventOccured = waitForEvent("data", testTopic);
            testTopic.write("some text");
            await expect(eventOccured).resolves.toBe(true);
        });
        test("Error event", async () => {
            const eventOccured = waitForEvent("error", testTopic);
            testTopic["inReadStream"].destroy(new Error("Test Error"));
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
    })
    describe("Topic events", () => {
        let testProvider: StreamWrapper<Readable>;
        let testConsumer: StreamWrapper<Writable>;

        beforeEach(() => {
            testProvider = StreamWrapper.create(new PassThrough({ encoding: "ascii" }), "testReadStream", StreamType.Instance, {});
            testConsumer = StreamWrapper.create(new PassThrough({ encoding: "ascii" }), "testWriteStream", StreamType.Instance, {});
        })

        test("State when error", async () => {
            const eventOccured = waitForEvent("error", testTopic);
            testTopic["inReadStream"].destroy(new Error("Test Error"));
            await eventOccured;
            expect(testTopic.state()).toBe(WorkState.Error);
        })

        test("State waiting", async () => {
            let eventPromise = waitForEvent(TopicEvent.StateChanged, testTopic);
            testProvider.stream().pipe(testTopic)
            await eventPromise;
            expect(testTopic.state()).toBe(WorkState.Waiting);
        })

        test("State flowing", async () => {
            testProvider.stream().pipe(testTopic)
            expect(testTopic.state()).toBe(WorkState.Waiting);
            const eventPromise = waitForEvent(TopicEvent.StateChanged, testTopic);
            testTopic.pipe(testConsumer);
            await eventPromise
            expect(testTopic.state()).toBe(WorkState.Flowing);

        })

        test("State pause on pause()", async () => {
            const eventPromise = waitForEvent(TopicEvent.StateChanged, testTopic);
            testTopic.pause();
            await eventPromise;
            expect(testTopic.state()).toBe(ReadableState.Paused);
        })

        test("State waiting after resume()", async () => {
            let eventPromise = waitForEvent(TopicEvent.StateChanged, testTopic);
            testTopic.pause();
            await eventPromise;
            expect(testTopic.state()).toBe(ReadableState.Paused);
            eventPromise = waitForEvent(TopicEvent.StateChanged, testTopic);
            testTopic.resume();
            await eventPromise;
            expect(testTopic.state()).toBe(WorkState.Waiting);
        })

        test("State flowing after resume()", async () => {
            let eventPromise = waitForEvent(TopicEvent.StateChanged, testTopic);
            testProvider.stream().pipe(testTopic).pipe(testConsumer);
            await eventPromise;
            expect(testTopic.state()).toBe(WorkState.Flowing);

            eventPromise = waitForEvent(TopicEvent.StateChanged, testTopic);
            testTopic.pause();
            await eventPromise;
            expect(testTopic.state()).toBe(ReadableState.Paused);

            eventPromise = waitForEvent(TopicEvent.StateChanged, testTopic);
            testTopic.resume();
            await eventPromise;
            expect(testTopic.state()).toBe(WorkState.Flowing);
        })
        test("ProvidersChanged on add", async () => {
            const eventPromise = waitForEvent(TopicEvent.ProvidersChanged, testTopic);
            testProvider.stream().pipe(testTopic)
            await eventPromise;
            expect(testTopic.providers.size).toBe(1);
        })
        test("ProvidersChanged on remove", async () => {
            let eventPromise = waitForEvent(TopicEvent.ProvidersChanged, testTopic);
            testProvider.stream().pipe(testTopic)
            await eventPromise;
            eventPromise = waitForEvent(TopicEvent.ProvidersChanged, testTopic);
            testProvider.stream().unpipe(testTopic)
            expect(testTopic.providers.size).toBe(0);
        })
        test("ConsumersChanged on add", async () => {
            const eventPromise = waitForEvent(TopicEvent.ConsumersChanged, testTopic);
            testTopic.pipe(testConsumer);
            await eventPromise;
            expect(testTopic.consumers.size).toBe(1);
        })
        test("ConsumersChanged on remove", async () => {
            let eventPromise = waitForEvent(TopicEvent.ConsumersChanged, testTopic);
            testTopic.pipe(testConsumer);
            await eventPromise;
            eventPromise = waitForEvent(TopicEvent.ConsumersChanged, testTopic);
            testTopic.unpipe(testConsumer);
            expect(testTopic.consumers.size).toBe(0);
        })
    })
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
        const topicFinished = new Promise(resolve => testTopic.on("readable", () => {
            resolve(testTopic.read());
        }));
        testTopic.write(testText);
        const result = await topicFinished
        expect(result).toBe(testText);
    });

    test("Piped flow", async () => {
        const testProvider = StreamWrapper.create(new PassThrough({ encoding: "ascii" }), "testReadStream", StreamType.Instance, {});
        const testConsumer = StreamWrapper.create(new PassThrough({ encoding: "ascii" }), "testWriteStream", StreamType.Instance, {});

        testProvider.stream().pipe(testTopic).pipe(testConsumer);

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
                yield Number(i++).toString()
            }
        }

        const createStreamProvider = (name: string, from: number, to: number): [StreamWrapper<Readable>, Promise<void>] => {
            const gen = generator(from, to);
            const provider = StreamWrapper.create(Readable.from(gen).setEncoding("ascii"), name, StreamType.Instance, {});
            const [streamEndPromise, streamEnd, streamError] = createWaitingPromise();
            provider.stream().on("close", streamEnd).on("error", streamError)
            return [provider, streamEndPromise];
        }

        const [provider1, provider1End] = createStreamProvider("TestReadStream1", 1, 10);
        const [provider2, provider2End] = createStreamProvider("TestReadStream2", 11, 20);
        const [provider3, provider3End] = createStreamProvider("TestReadStream3", 21, 30);

        provider1.stream().pipe(testTopic, { end: false });
        provider2.stream().pipe(testTopic, { end: false });
        provider3.stream().pipe(testTopic, { end: false });

        const result: number[] = [];
        testTopic.on("readable", () => { result.push(Number(testTopic.read())) })

        startGenerating();
        await Promise.all([provider1End, provider2End, provider3End]);
        result.sort((a: number, b: number) => a - b)
        const expectedResult = [...Array(30).keys()].map(val => val + 1);
        const match = result.length === expectedResult.length && !expectedResult.some((value, index) => result[index] !== value)
        expect(match).toBe(true);
    })
    test("Many Consumers reading", async () => {
        const consumer1 = StreamWrapper.create(new PassThrough({ encoding: "ascii" }), "TestWriteStream1", StreamType.Instance, {});
        const consumer2 = StreamWrapper.create(new PassThrough({ encoding: "ascii" }), "TestWriteStream1", StreamType.Instance, {});
        const consumer3 = StreamWrapper.create(new PassThrough({ encoding: "ascii" }), "TestWriteStream1", StreamType.Instance, {});
        
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

        testTopic.pipe(consumer1);
        testTopic.pipe(consumer2);
        testTopic.pipe(consumer3);
        testTopic.write(testText);
        
        await Promise.all([readed1Promise, readed2Promise, readed3Promise]);
        expect(result[0]).toBe(testText);
        expect(result[1]).toBe(testText);
        expect(result[2]).toBe(testText);
    })
})
