import { Duplex } from "stream";

import { ContentType } from "./sd-content-type";
import { ReadableState, StreamHandler, WorkState, WritableState } from "./sd-stream-handler";

export type TopicOptions = {
    contentType: ContentType
}

export type TopicState = WorkState.Flowing | WorkState.Error | ReadableState.Pause | WritableState.Drain;

export interface TopicHandler extends Duplex, StreamHandler {
    options(): TopicOptions
}

export default TopicHandler;
