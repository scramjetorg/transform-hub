module.exports = async function streamBehaviorSequence(input) {
    const topic = await this.hub.createTopic("stream-behavior-topic", "text/plain");
    const topicName = topic && typeof topic === "object" && "topicName" in topic
        ? topic.topicName
        : (topic && typeof topic === "object" && "id" in topic
            ? topic.id
            : "stream-behavior-topic");

    await this.hub.sendNamedData(topicName, "payload");

    const stream = await this.hub.getNamedData(topicName);
    let topicChunk = "";
    for await (const chunk of stream) {
        topicChunk += Buffer.from(typeof chunk === "string" ? chunk : (chunk instanceof Buffer ? chunk : String(chunk))).toString("utf8");
    }

    const rpcStream = await this.hub.callHostRpcStream("stream-behavior-stream", { id: 1 });
    let rpcChunk = "";
    for await (const chunk of rpcStream) {
        rpcChunk += Buffer.from(typeof chunk === "string" ? chunk : (chunk instanceof Buffer ? chunk : String(chunk))).toString("utf8");
    }

    return input.map((item) => ({
        id: item.id,
        topicChunk,
        rpcChunk
    }));
};
