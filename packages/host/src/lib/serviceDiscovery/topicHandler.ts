import { Duplex, Stream } from "stream"
import { ReadableState, StreamHandler, WorkState, WritableState } from "./streamHandler"
import { ContentType } from "./contentType"

export type Providers = Map<Stream, StreamHandler>
export type Consumers = Map<Stream, StreamHandler>

export type TopicOptions = {
    contentType: ContentType
}

export type TopicState = WorkState.Flowing | WorkState.Error | ReadableState.Pause | WritableState.Drain;

interface TopicHandler extends Duplex, StreamHandler {
    providers: Providers
    consumers: Consumers
    options(): TopicOptions
}

export default TopicHandler;