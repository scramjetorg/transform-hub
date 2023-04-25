
import { Duplex, Readable, Writable } from "stream";
import { CPMConnector } from "../cpm-connector";
import { ObjLogger } from "@scramjet/obj-logger";
import TopicId from "./topicId";
import TopicsMap from "./topicsController";
import { Topic } from "./topic";
import { ContentType } from "./contentType";
import { StreamOrigin } from "./streamHandler";
import PersistentTopic from "./persistentTopic";
import { IObjectLogger, SequenceInfo } from "@scramjet/types";
import { CSIController } from "../csi-controller";
// import Consumer from "./serviceDiscovery/consumer";
// import Provider from "./serviceDiscovery/provider";

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

type StartSequenceCb = (seq: SequenceInfo) => Promise<CSIController>;
/**
 * Service Discovery provides methods to manage topics.
 * Its functionality covers creating, storing, removing topics
 * and requesting Manager when Instance requires data but data is not available locally.
 */
export class ServiceDiscovery {
    private logger = new ObjLogger(this);
    private hostName: string;
    private startSequenceCb: StartSequenceCb;
    cpmConnector?: CPMConnector;

    // change to private
    topicsController: TopicsMap;

    //FIXME: Get rid of startSequenceCb to avoid Circular Reference
    constructor(logger: IObjectLogger, hostName: string, startSequenceCb: StartSequenceCb) {
        this.topicsController = new TopicsMap();
        this.hostName = hostName;
        this.logger.pipe(logger);
        this.startSequenceCb = startSequenceCb;
    }

    getTopic(id: TopicId): Topic | undefined {
        return this.topicsController.get(id);
    }

    createTopic(id: TopicId, contentType: ContentType) {
        const topic = new Topic(id, contentType, { id: this.hostName, type: "hub" });

        this.topicsController.set(id, topic);
        return topic;
    }

    async createPersistentTopic(id: TopicId, contentType: ContentType, sequence: SequenceInfo) {
        const csic = await this.startSequenceCb(sequence);
        const input = csic.getInputStream();
        const output = csic.getOutputStream();

        const origin: StreamOrigin = { id: this.hostName, type: "hub" };
        const topic = new PersistentTopic(input, output, id, contentType, origin);

        this.topicsController.set(id, topic);
        return topic;
    }

    deleteTopic(id: TopicId) { return this.topicsController.delete(id); }

    topics() { return this.topicsController.topics; }

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
        const topic = this.topicsController.get(topicName); // TODO: sprawdzanie content Type

        if (topic) {
            this.logger.trace("Routing topic:", config);
            return topic;
        }
        this.logger.trace("Adding topic:", config);
        const origin: StreamOrigin = { id: "XXXX", type: "hub" };
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

        source.pipe(topic, { end: false });
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
