
import { APIRoute, ReadableStream } from "@scramjet/types";
import { Duplex, PassThrough, Readable, Writable } from "stream";

import { CPMConnector } from "./cpm-connector";
import { ObjLogger } from "@scramjet/obj-logger";
import { getRouter } from "@scramjet/api-server";
import { ReasonPhrases } from "http-status-codes";

/**
 * TODO: Refactor types below.
 */
export type dataType = {
    topic: string;
    contentType: string;
}

/**
 * Topic stream type definition.
 */
export type streamType = {
    contentType: string;
    stream: Duplex;
}

/**
 * Topic details type definition.
 */
export type topicDataType = {
    contentType: string,
    stream: Duplex,
    localProvider?: string,
    cpmRequest?: boolean
}

const NEWLINE_BYTE = "\n".charCodeAt(0);

function pipeToTopic(source: Readable, target: topicDataType) {
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
    dataMap = new Map<
        string,
        topicDataType
    >();

    logger = new ObjLogger(this);

    cpmConnector?: CPMConnector;

    public router: APIRoute = getRouter();

    constructor() {
        this.createTopicsRouter();
    }

    createTopicsRouter() {
        this.router.downstream("/:topic", async (req) => {
            const contentType = req.headers["content-type"] || "";
            const { topic } = req.params || {};
            const { cpm } = req.headers;

            this.logger.debug(`Incoming topic '${topic}' request`);
            let target = this.getByTopic(topic);

            req.on("close", () => {
                //@TODO: Should remove this actor"
            });

            if (!target) {
                target = this.addData(
                    { contentType, topic },
                    "api"
                );
            } else if (contentType !== target.contentType) {
                return { opStatus: ReasonPhrases.UNSUPPORTED_MEDIA_TYPE, error: `Acceptable Content-Type for ${topic.name} is ${topic.contentType}` };
            }

            pipeToTopic(req, target);

            if (!cpm) {
                await this.update({
                    provides: topic, contentType: contentType, topicName: topic });
            } else {
                this.logger.debug(`Incoming Downstream CPM request for topic '${topic}'`);
            }
            return {};
        }, { checkContentType: false });

        this.router.upstream("/:topic", async (req) => {
            //TODO: what should be the default content type and where to store this information?
            const contentType = req.headers["content-type"] || "application/x-ndjson";
            const { topic } = req.params || {};
            const { cpm } = req.headers;

            if (!cpm) {
                await this.update({
                    requires: topic, contentType, topicName: topic });
            } else {
                this.logger.debug(`Incoming Upstream CPM request for topic '${topic}'`);
            }

            return this.getData({ topic, contentType });
        });
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
     * Stores given topic.
     *
     * @param {dataType} config Topic configuration.
     * @param {string} [localProvider] Provider identifier. If not set topic will be considered as external.
     * @returns added topic data.
     */
    addData(config: dataType, localProvider?: string) {
        if (!config.contentType || config.contentType==="undefined") {
            config.contentType = "application/x-ndjson";
        }

        if (!this.dataMap.has(config.topic)) {
            this.logger.trace("Adding data:", config, localProvider);

            const topicStream = new PassThrough();

            this.dataMap.set(config.topic, {
                contentType: config.contentType,
                stream: topicStream,
                localProvider

            });
        } else {
            this.logger.trace("Routing data:", config);
        }

        return this.dataMap.get(config.topic)!;
    }

    /**
     * @TODO: implement.

     * @returns All topics.
     */
    getTopics() {
        return Array.from(this.dataMap, ([key, value]) => ({
            contentType: value.contentType,
            localProvider: value.localProvider,
            topic: key,
            topicName: key
        }));
    }

    /**
     * Returns topic details for given topic.
     *
     * @param {string} topic Topic name.
     * @returns {streamType|undefined} Topic details.
     */
    getByTopic(topic: string): streamType | undefined {
        if (this.dataMap.has(topic)) {
            return this.dataMap.get(topic);
        }

        return undefined;
    }

    /**
     * Unsets local provider for given topic.
     *
     * @param {string} topic Topic name.
     */
    removeLocalProvider(topic: string) {
        const d = this.dataMap.get(topic);

        if (d) {
            this.dataMap.set(topic, { ...d, localProvider: undefined });
        }
    }

    /**
     * Returns topic details for given topic.
     * If topic does not exist it will be created.
     * If topic exists but is not local, data will be requested from Manager.
     *
     * @param {dataType} dataType Topic configuration.
     * @returns Topic stream.
     */
    getData(dataType: dataType): Duplex {
        this.logger.debug("Get data:", dataType);

        if (this.dataMap.has(dataType.topic)) {
            const topicData = this.dataMap.get(dataType.topic)!;

            this.logger.debug("Topic exists", dataType.topic);

            if (topicData?.localProvider) {
                this.logger.trace("LocalProvider found topic, provider", dataType.topic, topicData.localProvider);
            } else {
                this.logger.trace("Local topic provider not found for:", dataType.topic);

                if (this.cpmConnector) {
                    this.dataMap.set(dataType.topic, topicData);
                }
            }

            return topicData?.stream.on("end", () => this.logger.debug("Topic ended", dataType));
        }

        this.addData(dataType);

        return this.getData(dataType);
    }

    /**
     * Removes store topic with given id.
     *
     * @param {string} topic Topic name.
     */
    removeData(topic: string) {
        if (this.dataMap.has(topic)) {
            // eslint-disable-next-line no-extra-parens
            (this.dataMap.get(topic)?.stream as ReadableStream<any>).unpipe();
            this.dataMap.delete(topic);
        }
    }

    public async routeTopicToStream(topicData: dataType, target: Writable) {
        this.getData(topicData).pipe(target);

        await this.cpmConnector?.sendTopicInfo({ requires: topicData.topic, topicName: topicData.topic, contentType: topicData.contentType });
    }

    public async routeStreamToTopic(source: Readable, topicData: dataType, localProvider?: string) {
        const topic = this.addData(topicData, localProvider);

        pipeToTopic(source, topic);
        await this.cpmConnector?.sendTopicInfo({ provides: topicData.topic, topicName: topicData.topic, contentType: topicData.contentType });
    }

    async update(data: { provides?: string, requires?: string, topicName: string, contentType: string }) {
        this.logger.trace("Topic update. Send topic info to CPM", data);

        if (this.cpmConnector?.connected) {
            await this.cpmConnector?.sendTopicInfo(data);
        }
    }
}
