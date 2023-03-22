import Topic from "./topic";
import TopicName from "./topicName";


class TopicsMap {
    private topicsMap: Map<string, Topic>

    constructor() {
        this.topicsMap = new Map()
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

    set(name: TopicName, topic: Topic) {
        this.topicsMap.set(name.toString(), topic);
    }
    has(name: TopicName) {
        return this.topicsMap.has(name.toString());
    }
    get(name: TopicName) {
        return this.topicsMap.get(name.toString());
    }
    delete(name: TopicName) {
        const topic = this.topicsMap.get(name.toString());
        if (!topic) return false;
        // TODO: should be something like topic.disconnect() (both providers and consumers)
        topic.unpipe();
        return this.topicsMap.delete(name.toString());
    }

}

export default TopicsMap;