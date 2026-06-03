module.exports = async function orderedBehaviorSequence(input) {
    await this.localStorage.setItem("sequence-test:meta", "fixture");
    await this.localStorage.getItem("sequence-test:meta");

    const topic = await this.hub.createTopic("ordered-behavior-topic", "text/plain");
    const topicName = topic && typeof topic === "object" && "topicName" in topic
        ? topic.topicName
        : (topic && typeof topic === "object" && "id" in topic
            ? topic.id
            : "ordered-behavior-topic");

    await this.hub.sendTopic(topicName, "fixture-topic-payload");
    const topicStream = await this.hub.getNamedData(topicName);

    let topicChunk = "";
    for await (const chunk of topicStream) {
        topicChunk += Buffer.from(typeof chunk === "string" ? chunk : (chunk instanceof Buffer ? chunk : String(chunk))).toString("utf8");
    }

    const metadata = await this.hub.getVersion();
    this.logger.info("metadata-loaded", metadata.version);

    const rpcResult = await this.hub.callHostRpc("ordered", {
        status: "requested"
    });
    const rpcStream = await this.hub.callHostRpcStream("ordered-stream", {
        status: "streamed"
    });

    let rpcChunk = "";
    for await (const chunk of rpcStream) {
        rpcChunk += Buffer.from(typeof chunk === "string" ? chunk : (chunk instanceof Buffer ? chunk : String(chunk))).toString("utf8");
    }

    await this.hub.getStatus();
    this.emit("item.processed", { id: input?.[0]?.id ?? "unknown" });
    this.emitToSpace("item.processed", { id: input?.[0]?.id ?? "unknown" });

    this.api.use("/health", (_req, res) => {
        if (typeof res?.writeHead === "function") {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ status: "ok" }));
        }
    });

    await this.space.get("/v1/ping");

    await this.localStorage.removeItem("sequence-test:meta");

    this.keepAlive(125);
    this.end();

    return input.map((item) => ({
        id: item.id,
        metadata: metadata.version,
        topic: "fixture-topic-payload",
        rpc: rpcResult && typeof rpcResult === "object" && "rpc" in rpcResult ? rpcResult.rpc : null,
        rpcChunk,
        topicChunk
    }));
};
