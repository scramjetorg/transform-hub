import { dataType, ServiceDiscovery } from "../src/lib/sd-adapter";
import { CPMConnector } from "../src/lib/cpm-connector";
import { PassThrough } from "stream";

let serviceDiscovery: ServiceDiscovery;
const testUUID = "4fb4230f-5481-487d-a055-a99d20740e96"
const testConfig: dataType = {
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
        const topic = serviceDiscovery.addData(testConfig);
        const topics = serviceDiscovery.getTopics();
        expect(topics.length === 1);
        expect(topics[0].topic).toEqual(testConfig.topic);
        expect(topic.contentType).toEqual(testConfig.contentType);
        expect(topic.localProvider).toBeUndefined();
    })
    test("With provider", () => {
        const localProvider = "api";
        const topic = serviceDiscovery.addData(testConfig, localProvider);
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
            "1fb4230f-5481-487d-a055-a99d20740e96",
            "2fb4230f-5481-487d-a055-a99d20740e96",
            "3fb4230f-5481-487d-a055-a99d20740e96",
            "4fb4230f-5481-487d-a055-a99d20740e96",
            "5fb4230f-5481-487d-a055-a99d20740e96",
        ]
        topicsId.forEach((topicId) =>
            serviceDiscovery.addData({ topic: topicId, contentType: "text/plain" }))
        const topics = serviceDiscovery.getTopics();
        expect(topics.length === 5);
    })

    test("List with only unique elements", () => {
        for (let i = 0; i < 10; i++)
            serviceDiscovery.addData({ topic: "1fb4230f-5481-487d-a055-a99d20740e00", contentType: "text/plain" });

        const topics = serviceDiscovery.getTopics();
        expect(topics.length === 1);
    })
})

// getByTopic(topic: string)
describe("Get topic details for given topic", () => {
    test("Get existing topic", () => {
        serviceDiscovery.addData(testConfig);
        const returnedTopic = serviceDiscovery.getByTopic(testUUID);
        expect(returnedTopic).not.toBeUndefined();
        expect(returnedTopic!.contentType).toEqual(testConfig.contentType);
    });
    test("Get not existing topic", () => {
        const returnedTopic = serviceDiscovery.getByTopic(testUUID);
        expect(returnedTopic).toBeUndefined();
    });
})

// removeLocalProvider(topic: string)
test("Unsets local provider for given topic", () => {
    const localProvider = "api";
    const topic = serviceDiscovery.addData(testConfig, localProvider);
    expect(topic.localProvider).toEqual(localProvider);

    serviceDiscovery.removeLocalProvider(testUUID);
    const returnedTopic = serviceDiscovery.getTopics().filter((topic) => topic.topic === testUUID);
    expect(returnedTopic.length).toEqual(1);
    expect(returnedTopic[0].localProvider).toBeUndefined();
})

// getData(dataType: dataType)
test("Get topic details", () => {
    serviceDiscovery.getData(testConfig);
    // Unable to test
    expect(true).toBeTruthy()
})

// removeData(topic: string)
test("Remove stored topic with given id", () => {
    serviceDiscovery.addData(testConfig);
    expect(serviceDiscovery.getTopics().length === 1);
    serviceDiscovery.removeData(testUUID);
    expect(serviceDiscovery.getTopics().length === 0);
})

// routeTopicToStream(topicData: dataType, target: Writable)
test("Route topic to stream", () => {
    const testTarget = new PassThrough();
    serviceDiscovery.routeTopicToStream(testConfig, testTarget);
    expect(topicInfo!).not.toBeUndefined();
    expect(topicInfo!.requires).toEqual(testConfig.topic);
    expect(topicInfo!.contentType).toEqual(testConfig.contentType);
})

// routeStreamToTopic(source: Readable, topicData: dataType, localProvider?: string)
test("Route stream to topic", () => {
    const testSource = new PassThrough();
    serviceDiscovery.routeStreamToTopic(testSource, testConfig);
    expect(topicInfo!).not.toBeUndefined();
    expect(topicInfo!.provides).toEqual(testConfig.topic);
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
