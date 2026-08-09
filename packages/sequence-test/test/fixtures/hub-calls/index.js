module.exports = async function hubCallsSequence(input) {
    await this.hub.get("/api/v1/version");

    for (const item of input) {
        await this.hub.post("/api/v1/events", {
            type: "item.processed",
            id: item.id
        });
    }

    return input.map((item) => ({ id: item.id, reported: true }));
};
