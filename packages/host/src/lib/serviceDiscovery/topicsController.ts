import { Topic } from "./topic";
import TopicId from "./topicId";

class TopicsMap {
    private topicsMap: Map<string, Topic>;

    constructor() {
        this.topicsMap = new Map();
    }

    get topics() {
        return Array.from(this.topicsMap, ([, topic]) => ({
            id: topic.id(),
            contentType: topic.options().contentType,
            state: topic.state(),
        }));
    }

    set(id: TopicId, topic: Topic) {
        this.topicsMap.set(id.toString(), topic);
    }
    has(id: TopicId) {
        return this.topicsMap.has(id.toString());
    }
    get(id: TopicId) {
        return this.topicsMap.get(id.toString());
    }
    delete(id: TopicId) {
        const topic = this.topicsMap.get(id.toString());

        if (!topic) return false;
        topic.unpipe();
        return this.topicsMap.delete(id.toString());
    }
}

export default TopicsMap;
