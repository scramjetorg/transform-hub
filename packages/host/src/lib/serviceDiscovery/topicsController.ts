import { Topic } from "./topic";
import TopicId from "./topicId";

class TopicsMap {
    private topicsMap: Map<string, Topic>;
    private inventoryAuditHandler?: (topic: Topic | null, name: string) => void;

    constructor() {
        this.topicsMap = new Map();
    }

    setInventoryAuditHandler(handler?: (topic: Topic | null, name: string) => void): void { this.inventoryAuditHandler = handler; }

    get topics() {
        return Array.from(this.topicsMap, ([, topic]) => ({
            id: topic.id(),
            contentType: topic.options().contentType,
            origin: topic.origin(),
            state: topic.state()
        }));
    }

    set(id: TopicId, topic: Topic) {
        this.topicsMap.set(id.toString(), topic);
        this.inventoryAuditHandler?.(topic, id.toString());
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
        topic.delete();
        const deleted = this.topicsMap.delete(id.toString());
        if (deleted) this.inventoryAuditHandler?.(null, id.toString());
        return deleted;
    }
}

export default TopicsMap;
