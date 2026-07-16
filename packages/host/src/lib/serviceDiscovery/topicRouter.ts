import { CeroError } from "@scramjet/api-server";
import { APIExpose, ParsedMessage } from "@scramjet/api-types";
import { ObjLogger } from "@scramjet/obj-logger";
import { IObjectLogger } from "@scramjet/runtime-types";
import { IncomingMessage } from "http";
import { ReasonPhrases } from "http-status-codes";
import { ContentType, OpResponse, StreamOrigin, TopicState } from "../types/from-types";
import { isContentType } from "./contentType";
import { ServiceDiscovery } from "./sd-adapter";
import TopicId from "./topicId";

type TopicsPostReq = IncomingMessage & {
    body?: {
        id?: string;
        "content-type"?: string;
    };
};

type TopicsPostRes = {
    id: string;
    origin: StreamOrigin;
    state: TopicState;
    contentType: ContentType;
};

type TopicDeleteReq = IncomingMessage & {
    params?: { topic?: string };
};

type TopicStreamReq = ParsedMessage & {
    headers?: {
        "content-type"?: string;
        cpm?: string;
    };
    params?: { topic?: string };
};

const missingBodyId = "Missing body param: id";
const invalidContentTypeMsg = "Unsupported content-type";
const invalidTopicIdMsg = "Topic id incorrect format";

class TopicRouter {
    logger = new ObjLogger(this);
    private serviceDiscovery: ServiceDiscovery;

    constructor(logger: IObjectLogger, apiServer: APIExpose, apiBaseUrl: string, serviceDiscovery: ServiceDiscovery) {
        this.serviceDiscovery = serviceDiscovery;
        this.logger.pipe(logger);

        apiServer.get(`${apiBaseUrl}/topics`, () => this.serviceDiscovery.getTopics());
        apiServer.op("post", `${apiBaseUrl}/topics`, (req) => this.topicsPost(req));
        apiServer.op("delete", `${apiBaseUrl}/topics/:topic`, (req) => this.deleteTopic(req));
        apiServer.downstream(`${apiBaseUrl}/topic/:topic`, (req) => this.topicDownstream(req), { checkContentType: false, postponeContinue: true });
        apiServer.upstream(`${apiBaseUrl}/topic/:topic`, (req) => this.topicUpstream(req));
    }

    async topicsPost(req: TopicsPostReq): Promise<OpResponse<TopicsPostRes>> {
        if (!req.body?.id) return { opStatus: ReasonPhrases.BAD_REQUEST, error: missingBodyId };
        if (!req.body?.["content-type"]) return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Missing body param: content-type" };

        const { "content-type": contentType, id } = req.body;

        if (!isContentType(contentType)) return { opStatus: ReasonPhrases.BAD_REQUEST, error: invalidContentTypeMsg };
        if (!TopicId.validate(id)) return { opStatus: ReasonPhrases.BAD_REQUEST, error: invalidTopicIdMsg };

        const topicId = new TopicId(id);
        const topicExist = this.serviceDiscovery.getTopic(topicId) !== undefined;

        if (topicExist) return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Topic with given id already exist" };

        const topic = this.serviceDiscovery.createTopicIfNotExist({ topic: topicId, contentType });

        await this.serviceDiscovery.update({
            contentType,
            topicName: topicId.toString(),
            status: "add"
        });

        return {
            opStatus: ReasonPhrases.OK,
            id: topic.id(),
            origin: topic.origin(),
            state: topic.state(),
            contentType: topic.options().contentType
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

        const topic = this.serviceDiscovery.createTopicIfNotExist({ topic: topicId, contentType });

        if (topic.contentType !== contentType) {
            return {
                opStatus: ReasonPhrases.UNSUPPORTED_MEDIA_TYPE,
                error: `Acceptable Content-Type for ${id} is ${topic.contentType}`
            };
        }

        // Register these before the service-discovery update.  A short request can
        // finish while the update is in flight; registering them afterwards loses
        // the end event and leaves the HTTP handler waiting forever.
        let requestSettled = false;
        let requestEnded = false;
        let resolveRequest!: () => void;
        let rejectRequest!: (error: Error) => void;
        const requestCompletion = new Promise<void>((resolve, reject) => {
            resolveRequest = resolve;
            rejectRequest = reject;
        });
        const completeRequest = () => {
            if (requestSettled) return;
            requestSettled = true;
            resolveRequest();
        };
        const endRequest = () => {
            requestEnded = true;
            completeRequest();
        };
        const closeRequest = () => {
            if (requestEnded) return;
            failRequest();
        };
        const failRequest = () => {
            if (requestSettled) return;
            requestSettled = true;
            rejectRequest(new CeroError("DOWNSTREAM_REQUEST_ERROR"));
        };

        req.once("end", endRequest);
        req.once("close", closeRequest);
        req.once("aborted", failRequest);
        req.once("error", failRequest);

        const cleanupRequestListeners = () => {
            req.removeListener("end", endRequest);
            req.removeListener("close", closeRequest);
            req.removeListener("aborted", failRequest);
            req.removeListener("error", failRequest);
        };

        topic.acceptPipe(req);

        try {
            if (!cpm) {
                await Promise.all([
                    this.serviceDiscovery.update({
                        provides: topic.id(),
                        contentType: contentType,
                        topicName: topic.id(),
                        status: "add"
                    }),
                    requestCompletion
                ]);
            } else {
                this.logger.debug(`Incoming Downstream CPM request for topic: '${topic.id()}, ${topic.contentType}'`);
                await requestCompletion;
            }
        } finally {
            cleanupRequestListeners();
        }

        return { opStatus: ReasonPhrases.OK };
    }

    async topicUpstream(req: TopicStreamReq) {
        const { "content-type": contentType = "application/x-ndjson", cpm } = req.headers;
        const { topic: id = "" } = req.params || {};

        if (!isContentType(contentType)) {
            throw new CeroError("ERR_INVALID_CONTENT_TYPE", undefined, invalidContentTypeMsg);
        }
        if (!TopicId.validate(id)) {
            throw new CeroError("ERR_CANNOT_PARSE_CONTENT", undefined, invalidTopicIdMsg);
        }

        const topicId = new TopicId(id);

        try {
            const topic = this.serviceDiscovery.createTopicIfNotExist({ topic: topicId, contentType });

            if (!cpm) {
                await this.serviceDiscovery.update({
                    requires: id,
                    contentType,
                    topicName: topicId.toString(),
                    status: "add"
                });
            } else {
                this.logger.debug(`Incoming CPM Upstream request for topic '${id}'`);
            }

            return topic;
        } catch {
            throw new CeroError("ERR_INVALID_CONTENT_TYPE", undefined, invalidContentTypeMsg);
        }
    }
}

export default TopicRouter;
