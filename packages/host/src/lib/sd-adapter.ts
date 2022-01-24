import { ReadableStream, WritableStream } from "@scramjet/types";
import { PassThrough, Stream } from "stream";

import { CPMConnector } from "./cpm-connector";
import { ObjLogger } from "@scramjet/obj-logger";

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
    stream: Stream;
}

/**
 * Topic details type definition.
 */
export type topicDataType = {
    contentType: string,
    stream: ReadableStream<any> | WritableStream<any>,
    localProvider?: string,
    cpmRequest?: boolean
}

/**
 * Service Discovery provides methods to manage topics.
 * Its functionality covers creating, storing, removing topics
 * and requesting Manager when instance requires data but data is not available locally.
 */
export class ServiceDiscovery {
    dataMap = new Map<
        string,
        topicDataType
    >();
    objLogger = new ObjLogger(this);
    cpmConnector?: CPMConnector;

    /**
     * Sets the CPM connector.
     *
     * @param {CPMConnector} cpmConnector Manager connector instance used to communicate with Manager.
     */
    setConnector(cpmConnector: CPMConnector) {
        this.cpmConnector = cpmConnector;
    }

    /**
     * Stores given topic.
     *
     * @param {dataType} config Topic configuration.
     * @param {string} [localProvider] Provider identifier. It not set topic will be considered as extarnal.
     * @returns added topic data.
     */
    addData(config: dataType, localProvider?: string) {
        if (!this.dataMap.has(config.topic)) {
            this.objLogger.trace("Adding data:", config, localProvider);

            const topicStream = new PassThrough();

            this.dataMap.set(config.topic, {
                contentType: config.contentType,
                stream: topicStream,
                localProvider
            });
        } else {
            this.objLogger.trace("Routing data:", config);
        }

        if (localProvider) {
            this.objLogger.trace("Local provider added topic, provider", config.topic, localProvider);

            if (this.cpmConnector) {
                this.cpmConnector
                    .sendTopic(config.topic, this.dataMap.get(config.topic)!);

                this.objLogger.trace("Sending data to cpm");
            }
        }

        return this.dataMap.get(config.topic)!;
    }

    /**
     * @TODO: implement.

     * @returns All topics.
     */
    getTopics() {
        const o: any = [];

        return o;
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
    getData(dataType: dataType):
        ReadableStream<any> | WritableStream<any> | undefined {
        this.objLogger.debug("Get data:", dataType);

        if (this.dataMap.has(dataType.topic)) {
            const topicData = this.dataMap.get(dataType.topic)!;

            this.objLogger.debug("Topic exists", dataType.topic);

            if (topicData?.localProvider) {
                this.objLogger.trace("LocalProvider found topic, provider", dataType.topic, topicData.localProvider);
            } else {
                this.objLogger.trace("Local topic provider not found for:", dataType.topic);

                if (this.cpmConnector) {
                    this.objLogger.trace("Requesting CPM for topic", dataType);

                    this.cpmConnector?.getTopic(dataType.topic)
                        .then(stream => {
                            this.objLogger.trace("CPM connected for topic", dataType);

                            stream.pipe(topicData?.stream as WritableStream<any>);
                        });

                    this.dataMap.set(dataType.topic, { ...topicData, cpmRequest: true });
                }
            }

            return topicData?.stream.on("end", () => this.objLogger.debug("Topic ended", dataType));
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
}
