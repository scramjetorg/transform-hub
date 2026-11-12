const fixturePackage = require("./package.json");

function requiredConsumerConfig(context) {
    const config = context.config;
    if (!config || typeof config.runId !== "string" || config.runId.length === 0) {
        throw new Error("runtime manifest consumer requires the received runId config");
    }
    if (typeof config.producerSequenceId !== "string" || config.producerSequenceId.length === 0) {
        throw new Error("runtime manifest consumer requires producerSequenceId config");
    }
    if (!Array.isArray(config.producerInstanceIds) || config.producerInstanceIds.length === 0 ||
        config.producerInstanceIds.some((id) => typeof id !== "string" || id.length === 0)) {
        throw new Error("runtime manifest consumer requires actual producerInstanceIds config");
    }
    return { runId: config.runId, producerSequenceId: config.producerSequenceId, producerInstanceIds: [...config.producerInstanceIds] };
}

function provenance() {
    const fs = require("node:fs");
    const path = require("node:path");
    const cacheSnapshot = Object.keys(require.cache || []).map((file) => {
        try { return fs.realpathSync(file); } catch { return null; }
    }).filter(Boolean);
    const packageModulePath = (name) => {
        const roots = new Set();
        for (const file of cacheSnapshot) {
            const parts = file.split(path.sep);
            for (let index = 0; index < parts.length; index++) {
                if ((parts[index] === "packages" || parts[index] === "dist") && parts[index + 1] === name) {
                    roots.add(path.resolve(path.sep, ...parts.slice(0, index + 2)));
                }
                if (parts[index] === "node_modules" && parts[index + 1] === "@scramjet" && parts[index + 2] === name) {
                    roots.add(path.resolve(path.sep, ...parts.slice(0, index + 3)));
                }
            }
        }
        if (roots.size !== 1) return null;

        const [root] = roots;
        try {
            const manifestPath = path.join(root, "package.json");
            const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
            if (manifest.name !== `@scramjet/${name}` || typeof manifest.main !== "string") return null;
            const entry = fs.realpathSync(path.resolve(root, manifest.main));
            const relativeEntry = path.relative(root, entry);
            if (relativeEntry === ".." || relativeEntry.startsWith(`..${path.sep}`) || path.isAbsolute(relativeEntry) || !fs.statSync(entry).isFile()) return null;
            return cacheSnapshot.includes(entry) ? entry : null;
        } catch {
            return null;
        }
    };
    return {
        declaredEngines: fixturePackage.engines,
        pid: process.pid,
        ppid: process.ppid,
        argv1: process.argv[1] || null,
        execPath: process.execPath,
        nodeVersion: process.version,
        bunVersion: process.versions.bun || null,
        productModulePaths: {
            runnerNode: packageModulePath("runner-node"),
            restApi2: packageModulePath("rest-api2"),
            apiRouter: packageModulePath("api-router")
        }
    };
}

function parseAction(payload) {
    const action = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (!action || typeof action !== "object" || Array.isArray(action)) throw new Error("runtime manifest action must be a JSON object");
    return action;
}

async function observe(context, config, phase) {
    const instanceResponses = await Promise.all(config.producerInstanceIds.map(async (instanceId) => {
        const response = await context.hubClient().instance(instanceId).manifest();
        return { status: response.status, headers: response.headers, body: response.body };
    }));
    const sequence = await context.hubClient().sequence(config.producerSequenceId).manifest();
    context.emit("runtime-manifest-observed", {
        runId: config.runId,
        phase,
        instanceResponses,
        sequenceResponse: { status: sequence.status, headers: sequence.headers, body: sequence.body },
        provenance: provenance()
    });
}

module.exports = async function runtimeManifestConsumer() {
    const context = this;
    const config = requiredConsumerConfig(context);
    const finished = new Promise((resolve) => {
        context.on("runtime-manifest-action", (payload) => {
            void (async () => {
                const action = parseAction(payload);
                if (action.runId !== config.runId) return;
                if (action.action === "finish") resolve();
                else if (action.action === "refresh") await observe(context, config, "refresh");
            })().catch((error) => context.logger.error("runtime manifest consumer action failed", error));
        });
    });
    context.exitTimeout = 0;
    await observe(context, config, "initial");
    await finished;
};
