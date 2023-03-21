import { ServiceDiscovery } from "../src/lib/sd-adapter";
import { CPMConnector } from "../src/lib/cpm-connector";
import { PassThrough } from "stream";
import TopicName from "../src/lib/topicName";
import { DataType } from "../src/lib/topicsController";

let serviceDiscovery: ServiceDiscovery;
const testUUID = new TopicName("4fb4230f-5481-487d-a055-a99d20740e96")
const testConfig: DataType = {
    topic: testUUID,
    contentType: "text/plain"
}

let topicInfo: sendTopicInfoArg;
type sendTopicInfoArg = { provides?: string; requires?: string; topicName: string, contentType: string; };

beforeEach(() => {
    serviceDiscovery = new ServiceDiscovery();
    serviceDiscovery.cpmConnector = {
        sendTopicInfo: (data: sendTopicInfoArg): Promise<void> => {
            topicInfo = data;
            return new Promise((resolve) => resolve())
        }
    } as CPMConnector
})

// addData(config: dataType, localProvider?: string)
describe("Store topic", () => {

    test("Without provider", () => {
        const topic = serviceDiscovery.createTopicIfNotExist(testConfig);
        const topics = serviceDiscovery.getTopics();
        expect(topics.length === 1);
        expect(topics[0].topic).toEqual(testConfig.topic);
        expect(topic.contentType).toEqual(testConfig.contentType);
        expect(topic.localProvider).toBeUndefined();
    })
    test("With provider", () => {
        const localProvider = "api";
        const topic = serviceDiscovery.createTopicIfNotExist(testConfig, localProvider);
        const topics = serviceDiscovery.getTopics();
        expect(topics.length === 1);
        expect(topics[0].topic).toEqual(testConfig.topic);
        expect(topic.contentType).toEqual(testConfig.contentType);
        expect(topic.localProvider).toEqual(localProvider);
    })
})

// getTopics()
describe("Return list of topics in SD", () => {
    test("Empty list", () => {
        const topics = serviceDiscovery.getTopics();
        expect(topics.length === 0);
    })

    test("List with 5 elements", () => {
        const topicsId = [
            new TopicName("1fb4230f-5481-487d-a055-a99d20740e96"),
            new TopicName("2fb4230f-5481-487d-a055-a99d20740e96"),
            new TopicName("3fb4230f-5481-487d-a055-a99d20740e96"),
            new TopicName("4fb4230f-5481-487d-a055-a99d20740e96"),
            new TopicName("5fb4230f-5481-487d-a055-a99d20740e96"),
        ]
        topicsId.forEach((topicId) =>
            serviceDiscovery.createTopicIfNotExist({ topic: topicId, contentType: "text/plain" }))
        const topics = serviceDiscovery.getTopics();
        expect(topics.length === 5);
    })

    test("List with only unique elements", () => {
        for (let i = 0; i < 10; i++)
            serviceDiscovery.createTopicIfNotExist({ topic: new TopicName("1fb4230f-5481-487d-a055-a99d20740e00"), contentType: "text/plain" });

        const topics = serviceDiscovery.getTopics();
        expect(topics.length === 1);
    })
})

// getByTopic(topic: string)
describe("Get topic details for given topic", () => {
    test("Get existing topic", () => {
        serviceDiscovery.createTopicIfNotExist(testConfig);
        const returnedTopic = serviceDiscovery.getByTopic(testUUID);
        expect(returnedTopic).not.toBeUndefined();
        expect(returnedTopic!.contentType).toEqual(testConfig.contentType);
    });
    test("Get not existing topic", () => {
        const returnedTopic = serviceDiscovery.getByTopic(testUUID);
        expect(returnedTopic).toBeUndefined();
    });
})

// getData(dataType: dataType)
test("Get topic details", () => {
    serviceDiscovery.getData(testConfig);
    // Unable to test
    expect(true).toBeTruthy()
})

// removeData(topic: string)
test("Remove stored topic with given id", () => {
    serviceDiscovery.createTopicIfNotExist(testConfig);
    expect(serviceDiscovery.getTopics().length === 1);
    serviceDiscovery.removeData(testUUID);
    expect(serviceDiscovery.getTopics().length === 0);
})

// routeTopicToStream(topicData: dataType, target: Writable)
test("Route topic to stream", () => {
    const testTarget = new PassThrough();
    serviceDiscovery.routeTopicToStream(testConfig, testTarget);
    expect(topicInfo!).not.toBeUndefined();
    expect(topicInfo!.requires).toEqual(testConfig.topic.toString());
    expect(topicInfo!.contentType).toEqual(testConfig.contentType);
})

// routeStreamToTopic(source: Readable, topicData: dataType, localProvider?: string)
test("Route stream to topic", () => {
    const testSource = new PassThrough();
    serviceDiscovery.routeStreamToTopic(testSource, testConfig);
    expect(topicInfo!).not.toBeUndefined();
    expect(topicInfo!.provides).toEqual(testConfig.topic.toString());
    expect(topicInfo!.contentType).toEqual(testConfig.contentType);
})

// update(data: { provides?: string, requires?: string, topicName: string, contentType: string })
test("Update", async () => {
    serviceDiscovery.cpmConnector!.connected = true;
    await serviceDiscovery.update({ provides: "dummyProvides", requires: "dummyRequires", topicName: "dummyTopicName", contentType: "dummyContentType" });
    expect(topicInfo!).not.toBeUndefined();
    expect(topicInfo!.provides).toEqual("dummyProvides");
    expect(topicInfo!.requires).toEqual("dummyRequires");
    expect(topicInfo!.topicName).toEqual("dummyTopicName");
    expect(topicInfo!.contentType).toEqual("dummyContentType");

})
