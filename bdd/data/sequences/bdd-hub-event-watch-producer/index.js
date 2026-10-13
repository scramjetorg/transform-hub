const fixturePackage = require("./package.json");
const { existsSync } = require("node:fs");
const { isAbsolute, basename, join } = require("node:path");
let gatedProducerOutput;
let completeProducer;
const producerCompletion = new Promise(resolve => {
    completeProducer = resolve;
});

function provenance() {
    const loadedPaths = Object.keys(require.cache || {}).map((path) => path.replace(/\\/g, "/"));
    const modulePath = (name) => loadedPaths.find((path) => path.includes(`/packages/${name}/`) || path.includes(`/dist/${name}/`) || path.includes(`/node_modules/@scramjet/${name}/`)) || null;
    return {
        declaredEngines: fixturePackage.engines, pid: process.pid, ppid: process.ppid,
        execPath: process.execPath, runtime: { name: "node", version: process.version }, argv1: process.argv[1] || null,
        requireCacheProductModulePaths: loadedPaths.filter((path) => /\/(?:host|runner|runner-node|rest-api2|api-router|adapter-process|hub-state)\//.test(path)),
        productModulePaths: Object.fromEntries(["host", "runner", "runner-node", "rest-api2", "api-router", "adapter-process", "hub-state"].map((name) => [name, modulePath(name)]))
    };
}

function parse(payload) {
    const action = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (!action || typeof action !== "object" || Array.isArray(action)) throw new Error("hub-watch producer action must be an object");
    return action;
}

function declaration(config, version) {
    return {
        input: { description: `Hub event watch fixture input v${version}`, mediaType: "application/json", schema: { type: "object", properties: { value: { type: "string", enum: ["watch-fixture-v1"] } }, required: ["value"], additionalProperties: false } },
        output: { description: "Stable hub event watch fixture output", mediaType: "application/json", schema: { type: "object", properties: { value: { type: "string", enum: ["watch-fixture-v1"] } }, required: ["value"], additionalProperties: false } },
        topics: [{ name: config.topic || "hub-event-watch-fixture", direction: "output", description: "Hub event watch fixture topic", mediaType: "application/json", schema: { type: "object", properties: { value: { type: "string" } }, required: ["value"] } }]
    };
}

async function initialize() {
    const context = this;
    const config = context.config || {};
    if (typeof config.runId !== "string" || !config.runId) throw new Error("hub-watch producer requires runId");
    let version = Number.isSafeInteger(config.version) ? config.version : 1;
    let finished = false;
    context.exitTimeout = 0;
    if (typeof config.initializeGatePath === "string" && config.initializeGatePath) {
        if (!isAbsolute(config.initializeGatePath) && basename(config.initializeGatePath) !== config.initializeGatePath) throw new Error("hub-watch initialization gate must be an absolute path or a fixture-local filename");
        const gatePath = isAbsolute(config.initializeGatePath) ? config.initializeGatePath : join(__dirname, config.initializeGatePath);
        context.emit("hub-watch-producer-gate-entered", {
            runId: config.runId,
            gateId: config.runId,
            pid: process.pid,
            instanceId: context.instanceId,
            nodeVersion: process.version
        });
        const { PassThrough } = require("node:stream");
        gatedProducerOutput = new PassThrough();
        const deadline = Date.now() + 60_000;
        while (!existsSync(gatePath)) {
            if (Date.now() >= deadline) throw new Error("hub-watch initialization gate timed out");
            await new Promise(resolve => setTimeout(resolve, 20));
        }
    }
    const perform = async (action) => {
        if (action.runId !== config.runId) return;
        if (action.action === "finish") {
            finished = true;
            context.emit("hub-watch-producer-finished", { runId: config.runId, commandId: action.commandId, version, provenance: provenance() });
            if (gatedProducerOutput && !gatedProducerOutput.destroyed) gatedProducerOutput.end();
            completeProducer();
            return;
        }
        if (finished) return;
        if (!["publish", "update"].includes(action.action)) throw new Error(`unsupported producer action: ${String(action.action)}`);
        if (action.action === "update") version++;
        const receipt = await context.api.declare(declaration(config, version));
        const result = { runId: config.runId, commandId: action.commandId, action: action.action, version, receipt, provenance: provenance() };
        context.emit("hub-watch-producer-receipt", result);
        context.emit(`hub-watch-producer-receipt-${action.commandId}`, result);
    };
    context.on("hub-watch-producer-action", (payload) => {
        void Promise.resolve().then(() => perform(parse(payload))).catch((error) => context.emit("hub-watch-producer-error", {
            runId: config.runId,
            commandId: (() => { try { return parse(payload).commandId; } catch { return null; } })(),
            error: { name: error?.name || "Error", code: typeof error?.code === "string" ? error.code : null },
            provenance: provenance()
        }));
    });
    const receipt = config.publish === false ? null : await context.api.declare(declaration(config, version));
    context.emit("hub-watch-producer-ready", { runId: config.runId, version, receipt, provenance: provenance() });
}

async function producer() {
    if (gatedProducerOutput) return gatedProducerOutput;
    await producerCompletion;
}

module.exports = { initialize, default: producer };
