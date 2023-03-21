
import { Duplex, PassThrough, Readable, Writable } from "stream";

import { CPMConnector } from "./cpm-connector";
import { ObjLogger } from "@scramjet/obj-logger";
import TopicName from "./topicName";
import TopicsController, { DataType, TopicDataType } from "./topicsController";

// class Topic {
//     private name: TopicName;
//     private contentType: ContentType;

//     constructor() {
//         this.name = new TopicName("");
//         this.contentType = "";
//     }
// }

/**
 * Topic stream type definition.
 */
export type streamType = {
    contentType: string;
    stream: Duplex;
}

const NEWLINE_BYTE = "\n".charCodeAt(0);

export function pipeToTopic(source: Readable, target: TopicDataType) {
    source.pipe(target.stream, { end: false });

    // for json streams, make sure that the last message will be ended with newline
    if (target.contentType === "application/x-ndjson") {
        let lastChunk = Buffer.from([]);

        source
            .on("data", (chunk) => {
                lastChunk = chunk as Buffer;
            })
            .on("end", () => {
                const lastByte = lastChunk[lastChunk.length - 1];

                if (lastByte !== NEWLINE_BYTE) {
                    target.stream.write("\n");
                }
            });
    }
}

/**
 * Service Discovery provides methods to manage topics.
 * Its functionality covers creating, storing, removing topics
 * and requesting Manager when Instance requires data but data is not available locally.
 */
export class ServiceDiscovery {
    logger = new ObjLogger(this);

    cpmConnector?: CPMConnector;

    private topicsController: TopicsController;

    constructor() {
        this.topicsController = new TopicsController();
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
    createTopicIfNotExist(config: DataType, localProvider?: string) {
        const topicName = config.topic;
        let topic = this.topicsController.get(topicName);
        const topicExist = topic !== undefined;
        if (topicExist) {
            this.logger.trace("Routing topic:", config);
        } else {
            this.logger.trace("Adding topic:", config, localProvider);
            topic = {
                contentType: config.contentType,
                stream: new PassThrough(),
                localProvider
            }
            this.topicsController.set(topicName, topic);
        }
        return topic!;
    }

    /**
     * @returns All topics.
     */
    getTopics() {
        // return Array.from(this.dataMap, ([key, value]) => ({
        //     contentType: value.contentType,
        //     localProvider: value.localProvider,
        //     topic: key,
        //     topicName: key
        // }));
        return this.topicsController.topics;
    }

    /**
     * Returns topic details for given topic.
     *
     * @param {string} topic Topic name.
     * @returns {streamType|undefined} Topic details.
     */
    getByTopic(topic: TopicName): streamType | undefined {
        return this.topicsController.get(topic);
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

        if (topic?.localProvider) {
            this.logger.trace("LocalProvider found topic, provider", dataType.topic, topic.localProvider);
        } else {
            this.logger.trace("Local topic provider not found for:", dataType.topic);
        }
        return topic.stream.on("end", () => this.logger.debug("Topic ended", dataType));
    }

    /**
     * Removes store topic with given id.
     *
     * @param {string} topic Topic name.
     */
    removeData(topic: TopicName) {
        this.topicsController.delete(topic);
    }

    public async routeTopicToStream(topicData: DataType, target: Writable) {
        this.getData(topicData).pipe(target);

        await this.cpmConnector?.sendTopicInfo({ requires: topicData.topic.toString(), topicName: topicData.topic.toString(), contentType: topicData.contentType });
    }

    public async routeStreamToTopic(source: Readable, topicData: DataType, localProvider?: string) {
        const topic = this.createTopicIfNotExist(topicData, localProvider);

        pipeToTopic(source, topic);
        await this.cpmConnector?.sendTopicInfo({ provides: topicData.topic.toString(), topicName: topicData.topic.toString(), contentType: topicData.contentType });
    }

    async update(data: { provides?: string, requires?: string, topicName: string, contentType: string }) {
        this.logger.trace("Topic update. Send topic info to CPM", data);

        if (this.cpmConnector?.connected) {
            await this.cpmConnector?.sendTopicInfo(data);
        }
    }
}
