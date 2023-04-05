import { ObjLogger } from "@scramjet/obj-logger";
import { APIExpose, OpResponse, ParsedMessage } from "@scramjet/types";
import { ReasonPhrases } from "http-status-codes";
import { ServiceDiscovery } from "./sd-adapter";
import { IncomingMessage } from "http";
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

type TopicDownstreamReq = IncomingMessage & {
    headers: {
        "content-type": string,
        cpm?: string
    },
    params: { topic: string }
}

class TopicRouter {
    private serviceDiscovery: ServiceDiscovery
    logger = new ObjLogger(this);

    constructor(apiServer: APIExpose, apiBaseUrl: string, serviceDiscovery: ServiceDiscovery) {
        this.serviceDiscovery = serviceDiscovery;
        apiServer.get(`${apiBaseUrl}/topics`, () => this.serviceDiscovery.getTopics());
        apiServer.op("post", `${apiBaseUrl}/topics`, this.topicsPost)
        apiServer.get(`${apiBaseUrl}/topic/:topic`, () => this.deleteTopic);
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

    async topicDownstream(req: TopicDownstreamReq) {
        const { "content-type": contentType = "", cpm } = req.headers;
        const { topic: topicName } = req.params;
        if (!isContentType(contentType)) return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Unsupported content-type" }
        if (!TopicName.validate(topicName)) return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Topic name incorrect format" }

        const name = new TopicName(topicName);
        this.logger.debug(`Incoming topic '${name}' request`);

        let topic = this.serviceDiscovery.topicsController.get(name);
        if (topic) {
            const topicContentType = topic.options().contentType;
            if (contentType !== topicContentType) {
                return {
                    opStatus: ReasonPhrases.UNSUPPORTED_MEDIA_TYPE,
                    error: `Acceptable Content-Type for ${name} is ${topicContentType}`
                };
            }
        } else {
            topic = new Topic(name, contentType, { id: "TopicDownstream", type: "hub" });
        }
        req.pipe(topic, { end: false });

        if (!cpm) {
            await this.serviceDiscovery.update({
                provides: topic, contentType: contentType, topicName: topic
            });
        } else {
            this.logger.debug(`Incoming Downstream CPM request for topic '${topic}'`);
        }
        return {};
    }

    async topicUpstream(req: ParsedMessage) {
        //TODO: what should be the default content type and where to store this information?
        const contentType = req.headers["content-type"] || "application/x-ndjson";
        const { topic } = req.params || {};
        const { cpm } = req.headers;

        if (!cpm) {
            await this.serviceDiscovery.update({
                requires: topic, contentType, topicName: topic
            });
        } else {
            this.logger.debug(`Incoming Upstream CPM request for topic '${topic}'`);
        }

        return this.serviceDiscovery.createTopicIfNotExist({ topic, contentType });
    }
}

export default TopicRouter;