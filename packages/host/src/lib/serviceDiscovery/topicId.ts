class TopicId {
    private topicName: string;

    constructor(name: string) {
        this.topicName = name;
    }
    toString() {
        return this.topicName;
    }
    isValid() {
        return TopicId.validate(this.topicName);
    }
    static validate(topicName: string) {
        if (topicName.match(/^[A-Za-z0-9_.+-]+$/)) return true;
        return false;
    }
}

export default TopicId;
