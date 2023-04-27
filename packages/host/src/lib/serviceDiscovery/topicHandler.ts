import { Duplex } from "stream";
import { ReadableState, StreamHandler, WorkState, WritableState } from "./streamHandler";
import { ContentType } from "./contentType";

export type TopicOptions = {
    contentType: ContentType
}

export type TopicState = WorkState.Flowing | WorkState.Error | ReadableState.Pause | WritableState.Drain;

interface TopicHandler extends Duplex, StreamHandler {
    options(): TopicOptions
}

export default TopicHandler;
