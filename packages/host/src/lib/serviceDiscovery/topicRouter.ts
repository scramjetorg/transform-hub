import { ObjLogger } from "@scramjet/obj-logger";
import { APIExpose, OpResponse } from "@scramjet/types";
import { ReasonPhrases } from "http-status-codes";
import { ServiceDiscovery } from "./sd-adapter";
import {  IncomingMessage } from "http";
import { StreamOrigin } from "./streamHandler";
import { TopicState } from "./topicHandler";
import { WorkState } from "./streamHandler";
import { isContentType } from "./contentType";
import TopicName from "./topicName";
import Topic from "./topic";

type TopicsPostReq = IncomingMessage & { body?: any; params: {} | undefined };
type TopicsPostRes = {
    id: string
    origin: StreamOrigin
    state: TopicState
    consumers: [] //TODO: fill type
    providers: [] //TODO: fill type
}
type TopicDeleteReq = {}

type TopicStreamReq = IncomingMessage & {
    headers?: {
        "content-type"?: string,
        cpm?: string
    },
    params?: { topic?: string }
}

class TopicRouter {
    private serviceDiscovery: ServiceDiscovery
    logger = new ObjLogger(this);

    constructor(apiServer: APIExpose, apiBaseUrl: string, serviceDiscovery: ServiceDiscovery) {
        this.serviceDiscovery = serviceDiscovery;
        apiServer.get(`${apiBaseUrl}/topics`, () => this.serviceDiscovery.getTopics());
        apiServer.op("post", `${apiBaseUrl}/topics`, this.topicsPost)
        apiServer.op("delete", `${apiBaseUrl}/topic/:topic`, () => this.deleteTopic);
        apiServer.downstream(`${apiBaseUrl}/topic/:topic`, this.topicDownstream, { checkContentType: false });
        apiServer.upstream(`${apiBaseUrl}/topic/:topic`, this.topicUpstream);
    }

    async topicsPost(req: TopicsPostReq): Promise<OpResponse<TopicsPostRes>> {
        return {
            opStatus: ReasonPhrases.OK,
            id: "",
            origin: {
                id: "",
                type: "hub"
            },
            state: WorkState.Flowing,
            consumers: [],
            providers: [],
        };
    }

    async deleteTopic(req: TopicDeleteReq): Promise<OpResponse<{}>> {
        const topicName = "test name"
        return {
            opStatus: ReasonPhrases.OK,
            message: `Topic ${topicName} removed`
        }
    }

    async topicDownstream(req: TopicStreamReq) {
        const { "content-type": contentType = "", cpm } = req.headers;
        const { topic: name = "" } = req.params || {};
        if (!isContentType(contentType)) return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Unsupported content-type" }
        if (!TopicName.validate(name)) return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Topic name incorrect format" }

        const topicName = new TopicName(name);
        this.logger.debug(`Incoming topic '${name}' request`);

        let topic = this.serviceDiscovery.topicsController.get(topicName);
        if (topic) {
            const topicContentType = topic.options().contentType;
            if (contentType !== topicContentType) {
                return {
                    opStatus: ReasonPhrases.UNSUPPORTED_MEDIA_TYPE,
                    error: `Acceptable Content-Type for ${name} is ${topicContentType}`
                };
            }
        } else {
            // FIXME: Single responsibility rule validation
            topic = new Topic(topicName, contentType, { id: "TopicDownstream", type: "hub" });
        }
        req.pipe(topic, { end: false });

        if (!cpm) {
            await this.serviceDiscovery.update({
                provides: topic.id(), contentType: contentType, topicName: topic.id()
            });
        } else {
            this.logger.debug(`Incoming Downstream CPM request for topic '${topic}'`);
        }
        return { opStatus: ReasonPhrases.OK };
    }

    async topicUpstream(req: TopicStreamReq) {
        const { "content-type": contentType = "", cpm } = req.headers;
        const { topic: name = "" } = req.params || {};
        if (!isContentType(contentType)) return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Unsupported content-type" }
        if (!TopicName.validate(name)) return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Topic name incorrect format" }

        const topicName = new TopicName(name);
        //TODO: what should be the default content type and where to store this information?

        if (!cpm) {
            await this.serviceDiscovery.update({
                requires: name, contentType, topicName: topicName.toString()
            });
        } else {
            this.logger.debug(`Incoming Upstream CPM request for topic '${name}'`);
        }

        return this.serviceDiscovery.createTopicIfNotExist({ topic: topicName, contentType });
    }
}

export default TopicRouter;