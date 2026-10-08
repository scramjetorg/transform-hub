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

    return {
        runId: config.runId,
        producerSequenceId: config.producerSequenceId,
        producerInstanceIds: [...config.producerInstanceIds]
    };
}

function provenance() {
    const loadedPaths = Object.keys(require.cache || {}).map((path) => path.replace(/\\/g, "/"));
    const packageModulePath = (name) =>
        loadedPaths.find((path) => path.includes(`/packages/${name}/`) || path.includes(`/dist/${name}/`) || path.includes(`/node_modules/@scramjet/${name}/`)) || null;

    return {
        declaredEngines: fixturePackage.engines,
        pid: process.pid,
        ppid: process.ppid,
        argv1: process.argv[1] || null,
        execPath: process.execPath,
        nodeVersion: process.version,
        productModulePaths: {
            runnerNode: packageModulePath("runner-node"),
            restApi2: packageModulePath("rest-api2"),
            apiRouter: packageModulePath("api-router")
        }
    };
}

function parseAction(payload) {
    const action = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (!action || typeof action !== "object" || Array.isArray(action)) {
        throw new Error("runtime manifest action must be a JSON object");
    }
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
                if (action.action === "finish") {
                    resolve();
                } else if (action.action === "refresh") {
                    await observe(context, config, "refresh");
                }
            })().catch((error) => context.logger.error("runtime manifest consumer action failed", error));
        });
    });

    context.exitTimeout = 0;
    await observe(context, config, "initial");
    await finished;
};
