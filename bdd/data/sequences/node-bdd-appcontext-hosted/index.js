"use strict";

const fixturePackage = require("./package.json");
const loaded = identity("load");
let initialized;
let main;
let callback;

function identity(stage) {
    return {
        stage,
        pid: process.pid,
        ppid: process.ppid,
        runtime: process.versions.bun ? "bun" : "node",
        version: process.versions.bun || process.version,
    };
}

async function initialize() {
    const status = await this.hubClient().status.get();
    if (status.status !== 200 || status.body?.status !== "ok") throw new Error("hosted runtime HubClient request failed");
    const declaration = await this.api.declare({ output: { description: "Hosted runtime identity proof" } });
    initialized = { ...identity("initialize"), declaration };
}

async function hostedRuntimeAppContext(_input, ...args) {
    const argument = args[0];
    main = { ...identity("main"), argument, contextConfig: this.config };
    let finishRpc;
    const rpcCompleted = new Promise(resolve => { finishRpc = resolve; });
    const context = this;
    const runtime = fixturePackage.engines?.bun ? "bun" : "node";

    this.api.use("/health", (_req, res) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ runtime }));
    });
    this.api.create("/identity", async (req, res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (request.token !== "hosted-parity-token") throw new Error("Hosted raw RPC request token mismatch");
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ stages: [loaded, initialized, main, callback, identity("http")] }));
        finishRpc();
    });

    const received = new Promise(resolve => this.on(`hosted-${runtime}-event`, message => {
        callback = identity("callback");
        this.emitToSpace(`hosted-${runtime}-response`, { body: message });
        resolve();
    }));
    this.keepAlive(15000);
    process.stdout.write(`hosted-${runtime}-appcontext\n`);
    await new Promise(resolve => setTimeout(resolve, 100));
    this.logger.info(`hosted-${runtime}-appcontext-log`);
    await received;
    await rpcCompleted;
    context.end();
}

module.exports = { initialize, default: hostedRuntimeAppContext };
