/* eslint-disable complexity */
import { ObjLogger } from "@scramjet/obj-logger";
import { APIExpose, IObjectLogger, OpResponse, SequenceInfo } from "@scramjet/types";
import { ReasonPhrases } from "http-status-codes";
import { ServiceDiscovery } from "./sd-adapter";
import { IncomingMessage, ServerResponse } from "http";
import { TopicState } from "./topicHandler";
import { StreamOrigin } from "./streamHandler";
import { ContentType, isContentType } from "./contentType";
import TopicId from "./topicId";
import { Topic } from "./topic";
import { PassThrough } from "stream";
import SequenceStore from "../sequenceStore";

type TopicsPostReq = IncomingMessage & {
    body?: {
        id?: string,
        "content-type"?: string,
        persistentSequence?: string
    };
};
type TopicsPostRes = {
    id: string
    origin: StreamOrigin
    state: TopicState
    contentType: ContentType
}
type TopicDeleteReq = IncomingMessage & {
    params?: { topic?: string }
}
type TopicStreamReq = IncomingMessage & {
    headers?: {
        "content-type"?: string,
        cpm?: string
    },
    params?: { topic?: string }
}

const missingBodyId = "Missing body param: id";
const invalidContentTypeMsg = "Unsupported content-type";
const invalidTopicIdMsg = "Topic id incorrect format";

class TopicRouter {
    private logger = new ObjLogger(this);
    private serviceDiscovery: ServiceDiscovery;
    private sequenceStore: SequenceStore;

    constructor(logger: IObjectLogger, apiServer: APIExpose,
        apiBaseUrl: string, serviceDiscovery: ServiceDiscovery,
        sequenceStore: SequenceStore) {
        this.serviceDiscovery = serviceDiscovery;
        this.logger.pipe(logger);
        this.sequenceStore = sequenceStore;

        apiServer.get(`${apiBaseUrl}/topics`, () => this.serviceDiscovery.getTopics());
        apiServer.op("post", `${apiBaseUrl}/topics`, (req) => this.topicsPost(req));
        apiServer.op("delete", `${apiBaseUrl}/topics/:topic`, (req) => this.deleteTopic(req));
        apiServer.downstream(`${apiBaseUrl}/topic/:topic`, (req) => this.topicDownstream(req), { checkContentType: false });
        apiServer.upstream(`${apiBaseUrl}/topic/:topic`, (req, res) => this.topicUpstream(req, res));
    }

    async topicsPost(req: TopicsPostReq): Promise<OpResponse<TopicsPostRes>> {
        if (!req.body?.id) return { opStatus: ReasonPhrases.BAD_REQUEST, error: missingBodyId };
        if (!req.body?.["content-type"]) return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Missing body param: content-type" };
        const { "content-type": contentType, id, persistentSequence } = req.body;

        if (!isContentType(contentType)) return { opStatus: ReasonPhrases.BAD_REQUEST, error: invalidContentTypeMsg };
        if (!TopicId.validate(id)) return { opStatus: ReasonPhrases.BAD_REQUEST, error: invalidTopicIdMsg };

        const topicId = new TopicId(id);
        const topicExist = this.serviceDiscovery.getTopic(topicId) !== undefined;

        if (topicExist) return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Topic with given id already exist" };

        let topic: Topic;
        let sequence: SequenceInfo | undefined;

        if (persistentSequence) {
            sequence = this.sequenceStore.getByNameOrId(persistentSequence);
            if (!sequence) return { opStatus: ReasonPhrases.NOT_FOUND, error: `Couldn't find sequence ${persistentSequence}` };
            topic = await this.serviceDiscovery.createPersistentTopic(topicId, contentType, sequence);
        } else
            topic = this.serviceDiscovery.createTopic(topicId, contentType);

        return {
            opStatus: ReasonPhrases.OK,
            id: topic.id(),
            origin: topic.origin(),
            state: topic.state(),
            contentType: topic.options().contentType,
        };
    }

    async deleteTopic(req: TopicDeleteReq) {
        const { topic: id = "" } = req.params || {};

        if (!TopicId.validate(id)) return { opStatus: ReasonPhrases.BAD_REQUEST, error: invalidTopicIdMsg };

        const topicId = new TopicId(id);
        const removed = this.serviceDiscovery.deleteTopic(topicId);

        if (!removed)
            return {
                opStatus: ReasonPhrases.NOT_FOUND,
                error: `Topic ${topicId} not found`
            };
        return {
            opStatus: ReasonPhrases.OK,
            message: `Topic ${topicId} removed`
        };
    }

    async topicDownstream(req: TopicStreamReq) {
        const { "content-type": contentType = "", cpm } = req.headers;
        const { topic: id = "" } = req.params || {};

        if (!isContentType(contentType)) return { opStatus: ReasonPhrases.BAD_REQUEST, error: invalidContentTypeMsg };
        if (!TopicId.validate(id)) return { opStatus: ReasonPhrases.BAD_REQUEST, error: invalidTopicIdMsg };

        const topicId = new TopicId(id);

        this.logger.debug(`Incoming topic '${id}' request`);

        let topic = this.serviceDiscovery.getTopic(topicId);

        if (topic) {
            const topicContentType = topic.options().contentType;

            if (contentType !== topicContentType) {
                return {
                    opStatus: ReasonPhrases.UNSUPPORTED_MEDIA_TYPE,
                    error: `Acceptable Content-Type for ${id} is ${topicContentType}`
                };
            }
        } else {
            topic = this.serviceDiscovery.createTopic(topicId, contentType);
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

    async topicUpstream(req: TopicStreamReq, res: ServerResponse) {
        const { "content-type": contentType = "application/x-ndjson", cpm } = req.headers;
        const { topic: id = "" } = req.params || {};

        if (!isContentType(contentType)) {
            res.end({ opStatus: ReasonPhrases.BAD_REQUEST, error: invalidContentTypeMsg });
            return new PassThrough();
        }
        if (!TopicId.validate(id)) {
            res.end({ opStatus: ReasonPhrases.BAD_REQUEST, error: invalidTopicIdMsg });
            return new PassThrough();
        }

        const topicId = new TopicId(id);

        if (!cpm) {
            await this.serviceDiscovery.update({
                requires: id, contentType, topicName: topicId.toString()
            });
        } else {
            this.logger.debug(`Incoming Upstream CPM request for topic '${id}'`);
        }

        return this.serviceDiscovery.createTopicIfNotExist({ topic: topicId, contentType });
    }

    protected persistentToBoolean(persistenString: string | undefined) {
        if (persistenString === "true") return true;
        if (persistenString !== "false") return null;
        return false;
    }
}

export default TopicRouter;
