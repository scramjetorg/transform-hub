
import { Duplex, Readable, Writable } from "stream";
import { CPMConnector } from "../cpm-connector";
import { ObjLogger } from "@scramjet/obj-logger";
import TopicId from "./topicId";
import TopicsMap from "./topicsController";
import { Topic } from "./topic";
import { ContentType } from "./contentType";
import { StreamOrigin } from "./streamHandler";
import { IObjectLogger } from "@scramjet/types";

export type DataType = {
    topic: TopicId,
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

/**
 * Service Discovery provides methods to manage topics.
 * Its functionality covers creating, storing, removing topics
 * and requesting Manager when Instance requires data but data is not available locally.
 */
export class ServiceDiscovery {
    private logger = new ObjLogger(this);
    private hostName: string;
    protected topicsController: TopicsMap;
    cpmConnector?: CPMConnector;

    constructor(logger: IObjectLogger, hostName: string) {
        this.topicsController = new TopicsMap();
        this.hostName = hostName;
        this.logger.pipe(logger);
    }

    getTopic(id: TopicId): Topic | undefined {
        return this.topicsController.get(id);
    }

    deleteTopic(id: TopicId) { return this.topicsController.delete(id); }

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
        const topic = this.topicsController.get(topicName);

        if (topic) {
            config.contentType ||= topic.contentType;

            if (topic.contentType !== config.contentType) {
                this.logger.error("Content-type mismatch, existing and requested ", topic.contentType, config.contentType);
                throw new Error("Content-type mismatch");
            }
            this.logger.debug("Topic routed:", config);
            return topic;
        }

        this.logger.debug("Topic added:", config);
        const origin: StreamOrigin = { id: this.hostName, type: "hub" };
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
    }

    /**
     * Returns topic details for given topic.
     *
     * @param {string} topic Topic name.
     * @returns {StreamType|undefined} Topic details.
     */
    getByTopic(topic: TopicId): StreamType | undefined {
        const foundTopic = this.topicsController.get(topic);

        if (!foundTopic) return;

        // eslint-disable-next-line consistent-return
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

    public async routeTopicToStream(topicData: DataType, target: Writable) {
        const topic = this.createTopicIfNotExist(topicData);

        //FIXME: Writable wrapper for target
        topic.pipe(target);

        await this.cpmConnector?.sendTopicInfo({
            requires: topicData.topic.toString(),
            topicName: topicData.topic.toString(),
            contentType: topicData.contentType
        });
    }

    public async routeStreamToTopic(source: Readable, topicData: DataType) {
        const topic = this.createTopicIfNotExist(topicData);

        topic.acceptPipe(source);
        await this.cpmConnector?.sendTopicInfo({
            provides: topicData.topic.toString(),
            topicName: topicData.topic.toString(),
            contentType: topicData.contentType
        });
    }

    async update(data: { provides?: string, requires?: string, topicName: string, contentType: string }) {
        this.logger.trace("Topic update. Send topic info to CPM", data);

        if (this.cpmConnector?.connected) {
            await this.cpmConnector?.sendTopicInfo(data);
        }
    }
}
