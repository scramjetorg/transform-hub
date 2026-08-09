module.exports = async function exposedApiSequence(input) {
    this.api.use("/health", (_req, res) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
    });

    return input.map((item) => ({ id: item.id, apiRegistered: true }));
};
