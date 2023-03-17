import { Duplex } from "stream";
import TopicName from "./topicName";


export type ContentType = "text/plain" | "application/x-ndjson" | string
export type TopicProvider = "api" | string;

export type TopicDataType = {
    contentType: ContentType,
    stream: Duplex,
    localProvider?: "api" | string,
    cpmRequest?: boolean
}

export type DataType = {
    topic: TopicName;
    contentType: ContentType;
}

class TopicsController {
    private topicsMap: Map<TopicName, TopicDataType>

    constructor() {
        this.topicsMap = new Map()
    }

    get topics() {
        return Array.from(this.topicsMap, ([key, value]) => ({
            contentType: value.contentType,
            localProvider: value.localProvider,
            topic: key
        }));
    }

    // TODO: change to set(topic);
    set(name: TopicName, topic: TopicDataType) {
        this.topicsMap.set(name, topic);
    }
    has(name: TopicName) {
        return this.topicsMap.has(name);
    }
    get(name: TopicName) {
        return this.topicsMap.get(name);
    }
    delete(name: TopicName) {
        const topic = this.topicsMap.get(name);
        if (!topic) return false;
        topic.stream.unpipe();
        return this.topicsMap.delete(name);
    }

}

export default TopicsController;