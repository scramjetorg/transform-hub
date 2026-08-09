"use strict";

module.exports = async function hostedBunAppContext() {
    const status = await this.hubClient().status.get();
    const hubs = await this.spaceClient().hubs.get();
    if (status.status !== 200 || hubs.status !== 200) throw new Error("hosted Bun client request failed");

    this.api.use("/health", (_req, res) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ runtime: "bun" }));
    });
    const received = new Promise(resolve => this.on("hosted-bun-event", message => {
        this.emitToSpace("hosted-bun-response", { body: message });
        resolve();
    }));
    this.keepAlive(15000);
    process.stdout.write("hosted-bun-appcontext\n");
    await new Promise(resolve => setTimeout(resolve, 100));
    this.logger.info("hosted-bun-appcontext-log");
    await received;
    this.end();
};
