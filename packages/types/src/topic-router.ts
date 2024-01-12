import { IncomingMessage, ServerResponse } from "http";
import { StreamOrigin } from "./sd-stream-handler";
import { TopicState } from "./sd-topic-handler";
import { ContentType } from "./sd-content-type";

export type TopicsPostReq = IncomingMessage & {
    body?: {
        id?: string,
        "content-type"?: string,
    };
};

export type TopicsPostRes = {
    id: string
    origin: StreamOrigin
    state: TopicState
    contentType: ContentType
}

export type TopicDeleteReq = IncomingMessage & {
    params?: { topic?: string }
}

export type TopicStreamReq = IncomingMessage & {
    headers?: {
        "content-type"?: string,
        cpm?: string
    },
    params?: { topic?: string }
}

export type TopicStreamReqWithContinue = TopicStreamReq & { writeContinue: ServerResponse["writeContinue"] };
