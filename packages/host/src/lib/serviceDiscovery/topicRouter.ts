import { ObjLogger } from "@scramjet/obj-logger";
import { APIExpose, ParsedMessage } from "@scramjet/types";
import { ReasonPhrases } from "http-status-codes";
// import { Readable } from "stream";
import { pipeToTopic, ServiceDiscovery } from "./sd-adapter";
// import { TopicDataType } from "./topicsController";

// type TopicUpstreamRequest = {}
// type TopicUpstreamResponse = {}
// type TopicDownstreamRequest = {}
// type TopicDownstreamResponse = {}


class TopicRouter {
    private serviceDiscovery: ServiceDiscovery
    logger = new ObjLogger(this);

    constructor(apiServer: APIExpose, apiBaseUrl: string, serviceDiscovery: ServiceDiscovery) {
        this.serviceDiscovery = serviceDiscovery;
        apiServer.get(`${apiBaseUrl}/topics`, () => this.serviceDiscovery.getTopics());
        apiServer.downstream(`${apiBaseUrl}/topic/:topic`, this.topicDownstream, { checkContentType: false });
        apiServer.upstream(`${apiBaseUrl}/topic/:topic`, this.topicUpstream);
    }

    async topicDownstream(req: ParsedMessage) {
        const contentType = req.headers["content-type"] || "";
        const { topic } = req.params || {};
        const { cpm } = req.headers;

        this.logger.debug(`Incoming topic '${topic}' request`);
        let target = this.serviceDiscovery.getByTopic(topic);

        req.on("close", () => {
            //@TODO: Should remove this actor"
        });

        if (!target) {
            target = this.serviceDiscovery.createTopicIfNotExist(
                { contentType, topic },
                "api"
            );
        } else if (contentType !== target.contentType) {
            // FIXME: this comment have no sense: topic.contentType
            return { opStatus: ReasonPhrases.UNSUPPORTED_MEDIA_TYPE, error: `Acceptable Content-Type for ${topic.name} is ${topic.contentType}` };
        }

        pipeToTopic(req, target);

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

        return this.serviceDiscovery.getData({ topic, contentType });
    }
}

export default TopicRouter;