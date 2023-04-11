
import { Duplex, Readable, Writable } from "stream";

import { CPMConnector } from "../cpm-connector";
import { ObjLogger } from "@scramjet/obj-logger";
import TopicName from "./topicName";
import TopicsMap from "./topicsController";
import Topic from "./topic";
import { ContentType } from "./contentType";
import { StreamOrigin } from "./streamHandler";
// import Consumer from "./serviceDiscovery/consumer";
// import Provider from "./serviceDiscovery/provider";

export type DataType = {
    topic: TopicName,
    contentType: ContentType
}

/**
 * Topic stream type definition.
 */
export type StreamType = {
    contentType: string;
    stream: Duplex;
}

/**
 * Topic details type definition.
 */
export type TopicDataType = {
    contentType: string,
    stream: Duplex,
    localProvider?: string,
    cpmRequest?: boolean
}

// class TopicFacade {
//     logger = new ObjLogger(this);
//     private topicsController: TopicsMap;
//     constructor() {
//         this.topicsController = new TopicsMap();
//     }

//     getTopics() {
//         return this.topicsController.topics;
//     }
//     addTopicProvider(name: TopicName, provider: Provider){

//     }
//     addTopicConsumer(name: TopicName, consumer: Consumer){

//     }
// }

// class CpmReportingTopicFacade extends TopicFacade{
//     private cpmConnector: CPMConnector;
//     constructor(cpmConnector: CPMConnector){
//         super();
//         this.cpmConnector = cpmConnector;
//     }
// }

/**
 * Service Discovery provides methods to manage topics.
 * Its functionality covers creating, storing, removing topics
 * and requesting Manager when Instance requires data but data is not available locally.
 */
export class ServiceDiscovery {
    logger = new ObjLogger(this);

    cpmConnector?: CPMConnector;

    // change to private
    topicsController: TopicsMap;

    constructor() {
        this.topicsController = new TopicsMap();
    }

    /**
     * Sets the CPM connector.
     *
     * @param {CPMConnector} cpmConnector Manager connector Instance used to communicate with Manager.
     */
    setConnector(cpmConnector: CPMConnector) {
        this.cpmConnector = cpmConnector;
    }

    /**
     * Returns topic with given configuration, if not exists creates new one.
     *
     * @param {DataType} config Topic configuration.
     * @param {string} [localProvider] Provider identifier. It not set topic will be considered as external.
     * @returns added topic data.
     */
    createTopicIfNotExist(config: DataType) {
        const topicName = config.topic;
        let topic = this.topicsController.get(topicName); // TODO: sprawdzanie content Type
        if (topic) {
            this.logger.trace("Routing topic:", config);
            return topic;
        }
        this.logger.trace("Adding topic:", config);
        const origin: StreamOrigin = { id: "XXXX", type: "hub" }
        const newTopic = new Topic(topicName, config.contentType, origin);
        this.topicsController.set(topicName, newTopic);
        return newTopic;
    }

    /**
     * @returns All topics.
     */
    getTopics() {
        return this.topicsController.topics.map((value) => ({
            contentType: value.contentType,
            localProvider: "",
            topic: value.id,
            topicName: value.id
        }));
        // return this.topicsController.topics;
        // TODO: map to this
        // return Array.from(this.dataMap, ([key, value]) => ({
        //     contentType: value.contentType,
        //     localProvider: value.localProvider,
        //     topic: key,
        //     topicName: key
        // }));
    }

    /**
     * Returns topic details for given topic.
     *
     * @param {string} topic Topic name.
     * @returns {StreamType|undefined} Topic details.
     */
    getByTopic(topic: TopicName): StreamType | undefined {
        const foundTopic = this.topicsController.get(topic);
        if (!foundTopic) return;

        return {
            contentType: foundTopic.options().contentType,
            stream: foundTopic
        };
    }

    /**
     * Returns topic details for given topic.
     * If topic does not exist it will be created.
     * If topic exists but is not local, data will be requested from Manager.
     *
     * @param {DataType} dataType Topic configuration.
     * @returns Topic stream.
     */
    getData(dataType: DataType): Duplex {
        this.logger.debug("Get data:", dataType);

        const topic = this.createTopicIfNotExist(dataType);
        return topic;
    }

    /**
     * Removes store topic with given id.
     *
     * @param {string} topic Topic name.
     */
    // removeData(topic: TopicName) {
    //     this.topicsController.delete(topic);
    // }

    public async routeTopicToStream(topicData: DataType, target: Writable) {
        const topic = this.createTopicIfNotExist(topicData);

        //FIXME: Writable wrapper for target
        topic.pipe(target);

        await this.cpmConnector?.sendTopicInfo({ requires: topicData.topic.toString(), topicName: topicData.topic.toString(), contentType: topicData.contentType });
    }

    public async routeStreamToTopic(source: Readable, topicData: DataType) {
        const topic = this.createTopicIfNotExist(topicData);

        source.pipe(topic, { end: false });
        await this.cpmConnector?.sendTopicInfo({ provides: topicData.topic.toString(), topicName: topicData.topic.toString(), contentType: topicData.contentType });
    }

    async update(data: { provides?: string, requires?: string, topicName: string, contentType: string }) {
        this.logger.trace("Topic update. Send topic info to CPM", data);

        if (this.cpmConnector?.connected) {
            await this.cpmConnector?.sendTopicInfo(data);
        }
    }
}
