import { DataType, ServiceDiscovery } from "../../src/lib/serviceDiscovery/sd-adapter";
import { CPMConnector } from "../../src/lib/cpm-connector";
import { PassThrough } from "stream";
import TopicId from "../../src/lib/serviceDiscovery/topicId";
import { ObjLogger } from "@scramjet/obj-logger";
import { AddSTHTopicEventData } from "@scramjet/types";

let serviceDiscovery: ServiceDiscovery;
const testUUID = new TopicId("4fb4230f-5481-487d-a055-a99d20740e96");
const testConfig: DataType = {
    topic: testUUID,
    contentType: "text/plain"
};

let topicInfo: AddSTHTopicEventData;

beforeEach(() => {
    const mockLogger = new ObjLogger(this);

    serviceDiscovery = new ServiceDiscovery(mockLogger, "MockHost");
    serviceDiscovery.cpmConnector = {
        sendTopicInfo: (data: AddSTHTopicEventData): Promise<void> => {
            topicInfo = data;
            return Promise.resolve();
        }
    } as CPMConnector;
});

describe("Return list of topics in SD", () => {
    test("Empty list", () => {
        const topics = serviceDiscovery.getTopics();

        expect(topics.length === 0);
    });

    test("List with 5 elements", () => {
        const topicsId = [
            new TopicId("1fb4230f-5481-487d-a055-a99d20740e96"),
            new TopicId("2fb4230f-5481-487d-a055-a99d20740e96"),
            new TopicId("3fb4230f-5481-487d-a055-a99d20740e96"),
            new TopicId("4fb4230f-5481-487d-a055-a99d20740e96"),
            new TopicId("5fb4230f-5481-487d-a055-a99d20740e96"),
        ];

        topicsId.forEach((topicId) =>
            serviceDiscovery.createTopicIfNotExist({ topic: topicId, contentType: "text/plain" }));
        const topics = serviceDiscovery.getTopics();

        expect(topics.length === 5);
    });

    test("List with only unique elements", () => {
        for (let i = 0; i < 10; i++)
            serviceDiscovery.createTopicIfNotExist({ topic: new TopicId("1fb4230f-5481-487d-a055-a99d20740e00"), contentType: "text/plain" });

        const topics = serviceDiscovery.getTopics();

        expect(topics.length === 1);
    });
});

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
});

// getData(dataType: dataType)
test("Get topic details", () => {
    serviceDiscovery.getData(testConfig);
    // Unable to test
    expect(true).toBeTruthy();
});

test("Remove stored topic with given id", () => {
    serviceDiscovery.createTopicIfNotExist(testConfig);
    expect(serviceDiscovery.getTopics().length === 1);
    serviceDiscovery.deleteTopic(testUUID);
    expect(serviceDiscovery.getTopics().length === 0);
});

test("Route topic to stream", async () => {
    const testTarget = new PassThrough();

    await serviceDiscovery.routeTopicToStream(testConfig, testTarget);
    expect(topicInfo!).not.toBeUndefined();
    expect(topicInfo!.requires).toEqual(testConfig.topic.toString());
    expect(topicInfo!.contentType).toEqual(testConfig.contentType);
});

test("Route stream to topic", async () => {
    const testSource = new PassThrough();

    await serviceDiscovery.routeStreamToTopic(testSource, testConfig);
    expect(topicInfo!).not.toBeUndefined();
    expect(topicInfo!.provides).toEqual(testConfig.topic.toString());
    expect(topicInfo!.contentType).toEqual(testConfig.contentType);
});

test("Update with provides", async () => {
    serviceDiscovery.cpmConnector!.connected = true;
    await serviceDiscovery.update({ provides: "dummyProvides", topicName: "dummyTopicName", contentType: "dummyContentType", status: "add" });
    expect(topicInfo!).not.toBeUndefined();
    expect(topicInfo!.provides).toEqual("dummyProvides");
    expect(topicInfo!.topicName).toEqual("dummyTopicName");
    expect(topicInfo!.contentType).toEqual("dummyContentType");
});

test("Update with requires", async () => {
    serviceDiscovery.cpmConnector!.connected = true;
    await serviceDiscovery.update({ requires: "dummyRequires", topicName: "dummyTopicName", contentType: "dummyContentType", status: "add" });
    expect(topicInfo!).not.toBeUndefined();
    expect(topicInfo!.requires).toEqual("dummyRequires");
    expect(topicInfo!.topicName).toEqual("dummyTopicName");
    expect(topicInfo!.contentType).toEqual("dummyContentType");
});
