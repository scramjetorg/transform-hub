import test from "ava";
import { DataType, ServiceDiscovery } from "../../src/lib/serviceDiscovery/sd-adapter";
import { CPMConnector } from "../../src/lib/cpm-connector";
import { PassThrough } from "stream";
import TopicId from "../../src/lib/serviceDiscovery/topicId";
import { ObjLogger } from "@scramjet/obj-logger";
import { AddSTHTopicEventData } from "@scramjet/types";

const testUUID = new TopicId("4fb4230f-5481-487d-a055-a99d20740e96");
const testConfig: DataType = {
    topic: testUUID,
    contentType: "text/plain"
};

// ── Return list of topics ───────────────────────────────────────

test("ServiceDiscovery getTopics: empty list", t => {
    const mockLogger = new ObjLogger({});
    const serviceDiscovery = new ServiceDiscovery(mockLogger, "MockHost");

    const topics = serviceDiscovery.getTopics();

    t.is(topics.length, 0);
});

test("ServiceDiscovery getTopics: list with 5 elements", t => {
    const mockLogger = new ObjLogger({});
    const serviceDiscovery = new ServiceDiscovery(mockLogger, "MockHost");
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

    t.is(topics.length, 5);
});

test("ServiceDiscovery getTopics: list with only unique elements", t => {
    const mockLogger = new ObjLogger({});
    const serviceDiscovery = new ServiceDiscovery(mockLogger, "MockHost");

    for (let i = 0; i < 10; i++)
        serviceDiscovery.createTopicIfNotExist({ topic: new TopicId("1fb4230f-5481-487d-a055-a99d20740e00"), contentType: "text/plain" });

    const topics = serviceDiscovery.getTopics();

    t.is(topics.length, 1);
});

// ── Get topic details ───────────────────────────────────────────

test("ServiceDiscovery getByTopic: get existing topic", t => {
    const mockLogger = new ObjLogger({});
    const serviceDiscovery = new ServiceDiscovery(mockLogger, "MockHost");

    serviceDiscovery.createTopicIfNotExist(testConfig);
    const returnedTopic = serviceDiscovery.getByTopic(testUUID);

    t.truthy(returnedTopic);
    t.is(returnedTopic!.contentType, testConfig.contentType);
});

test("ServiceDiscovery getByTopic: get not existing topic", t => {
    const mockLogger = new ObjLogger({});
    const serviceDiscovery = new ServiceDiscovery(mockLogger, "MockHost");

    const returnedTopic = serviceDiscovery.getByTopic(testUUID);

    t.is(returnedTopic, undefined);
});

test("ServiceDiscovery getData: get topic details", t => {
    const mockLogger = new ObjLogger({});
    const serviceDiscovery = new ServiceDiscovery(mockLogger, "MockHost");

    serviceDiscovery.getData(testConfig);
    // Unable to test actual behavior
    t.pass();
});

test("ServiceDiscovery deleteTopic: remove stored topic with given id", t => {
    const mockLogger = new ObjLogger({});
    const serviceDiscovery = new ServiceDiscovery(mockLogger, "MockHost");

    serviceDiscovery.createTopicIfNotExist(testConfig);
    t.is(serviceDiscovery.getTopics().length, 1);
    serviceDiscovery.deleteTopic(testUUID);
    t.is(serviceDiscovery.getTopics().length, 0);
});

test("ServiceDiscovery routeTopicToStream: route topic to stream", async t => {
    const mockLogger = new ObjLogger({});
    const serviceDiscovery = new ServiceDiscovery(mockLogger, "MockHost");
    let topicInfo: AddSTHTopicEventData | undefined;

    serviceDiscovery.cpmConnector = {
        sendTopicInfo: (data: AddSTHTopicEventData): Promise<void> => {
            topicInfo = data;
            return Promise.resolve();
        }
    } as CPMConnector;

    const testTarget = new PassThrough();

    await serviceDiscovery.routeTopicToStream(testConfig, testTarget);
    t.truthy(topicInfo);
    t.is(topicInfo!.requires, testConfig.topic.toString());
    t.is(topicInfo!.contentType, testConfig.contentType);
});

test("ServiceDiscovery routeStreamToTopic: route stream to topic", async t => {
    const mockLogger = new ObjLogger({});
    const serviceDiscovery = new ServiceDiscovery(mockLogger, "MockHost");
    let topicInfo: AddSTHTopicEventData | undefined;

    serviceDiscovery.cpmConnector = {
        sendTopicInfo: (data: AddSTHTopicEventData): Promise<void> => {
            topicInfo = data;
            return Promise.resolve();
        }
    } as CPMConnector;

    const testSource = new PassThrough();

    await serviceDiscovery.routeStreamToTopic(testSource, testConfig);
    t.truthy(topicInfo);
    t.is(topicInfo!.provides, testConfig.topic.toString());
    t.is(topicInfo!.contentType, testConfig.contentType);
});

test("ServiceDiscovery update: update with provides", async t => {
    const mockLogger = new ObjLogger({});
    const serviceDiscovery = new ServiceDiscovery(mockLogger, "MockHost");
    let topicInfo: AddSTHTopicEventData | undefined;

    serviceDiscovery.cpmConnector = {
        sendTopicInfo: (data: AddSTHTopicEventData): Promise<void> => {
            topicInfo = data;
            return Promise.resolve();
        },
        connected: true
    } as CPMConnector;

    await serviceDiscovery.update({ provides: "dummyProvides", topicName: "dummyTopicName", contentType: "dummyContentType", status: "add" });
    t.truthy(topicInfo);
    t.is(topicInfo!.provides, "dummyProvides");
    t.is(topicInfo!.topicName, "dummyTopicName");
    t.is(topicInfo!.contentType, "dummyContentType");
});

test("ServiceDiscovery update: update with requires", async t => {
    const mockLogger = new ObjLogger({});
    const serviceDiscovery = new ServiceDiscovery(mockLogger, "MockHost");
    let topicInfo: AddSTHTopicEventData | undefined;

    serviceDiscovery.cpmConnector = {
        sendTopicInfo: (data: AddSTHTopicEventData): Promise<void> => {
            topicInfo = data;
            return Promise.resolve();
        },
        connected: true
    } as CPMConnector;

    await serviceDiscovery.update({ requires: "dummyRequires", topicName: "dummyTopicName", contentType: "dummyContentType", status: "add" });
    t.truthy(topicInfo);
    t.is(topicInfo!.requires, "dummyRequires");
    t.is(topicInfo!.topicName, "dummyTopicName");
    t.is(topicInfo!.contentType, "dummyContentType");
});
