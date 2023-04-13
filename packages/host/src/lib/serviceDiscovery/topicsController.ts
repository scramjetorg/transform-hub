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
            providers: Array.from(topic.providers, ([, provider]) => ({
                type: provider.type(),
                id: provider.id(),
                state: provider.state(),
                origin: provider.origin(),
            })),
            consumers: Array.from(topic.providers, ([, consumer]) => ({
                type: consumer.type(),
                id: consumer.id(),
                state: consumer.state(),
                origin: consumer.origin()
            }))
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
        // TODO: should be something like topic.disconnect() (both providers and consumers)
        topic.unpipe();
        return this.topicsMap.delete(id.toString());
    }
}

export default TopicsMap;
