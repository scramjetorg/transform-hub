module.exports = async function spaceMinimalSequence(input) {
    await this.space.get("/space/ping");
    await this.space.get("/space/echo");
    await this.space.post("/space/echo", { ok: true });
    await this.space.request("POST", "/space/send", { marker: "space" });

    return input.map((item) => ({
        id: item.id,
        spaceCallsRecorded: true
    }));
};
