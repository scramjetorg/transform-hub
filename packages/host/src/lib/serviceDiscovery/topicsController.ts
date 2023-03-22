import Topic from "./topic";
import TopicName from "./topicName";


class TopicsMap {
    private topicsMap: Map<string, Topic>

    constructor() {
        this.topicsMap = new Map()
    }

    get topics() {
        return Array.from(this.topicsMap, ([, topic]) => ({
            name: topic.name(),
            contentType: topic.options().contentType,
            providers: Array.from(topic.providers, ([, provider])=>({
                name: provider.name(),
                type: provider.type(),
                state: provider.state(),
            })),
            consumers: Array.from(topic.providers, ([, consumer])=>({
                name: consumer.name(),
                type: consumer.type(),
                state: consumer.state(),
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
        topic.unpipe();
        return this.topicsMap.delete(name.toString());
    }

}

export default TopicsMap;