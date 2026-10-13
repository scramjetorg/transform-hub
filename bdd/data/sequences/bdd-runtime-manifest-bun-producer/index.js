const { PassThrough } = require("stream");
const fixturePackage = require("./package.json");
const producerState = new WeakMap();

function requiredProducerConfig(context) {
    const config = context.config;

    if (!config || typeof config.runId !== "string" || config.runId.length === 0) {
        throw new Error("runtime manifest producer requires the received runId config");
    }
    if (config.variant !== "string" && config.variant !== "object") {
        throw new Error("runtime manifest producer requires variant 'string' or 'object'");
    }
    if (typeof config.version !== "number" || !Number.isFinite(config.version)) {
        throw new Error("runtime manifest producer requires a finite numeric version config");
    }
    if (config.publish !== undefined && typeof config.publish !== "boolean") {
        throw new Error("runtime manifest producer publish config must be boolean when provided");
    }

    return {
        runId: config.runId,
        variant: config.variant,
        version: config.version,
        publish: config.publish === undefined ? true : config.publish
    };
}

function declarationFor(state) {
    const extension = {
        "x-runtime-manifest": {
            runId: state.runId,
            variant: state.variant,
            version: state.version
        }
    };
    const outputSchema = state.variant === "string"
        ? { type: "string", ...extension }
        : {
              type: "object",
              properties: { value: { type: "string" } },
              required: ["value"],
              ...extension
          };

    return {
        input: {
            description: "One JSON input record",
            mediaType: "application/json",
            schema: {
                type: "object",
                properties: { value: { type: "string" } },
                "x-input-extension": { owner: "runtime-manifest-fixture" }
            }
        },
        output: {
            description: state.variant === "string" ? "A string result" : "An object result",
            mediaType: state.variant === "string" ? "text/plain" : "application/json",
            schema: outputSchema
        },
        rpc: [
            {
                procedure: "math/add",
                description: "Add two numeric inputs",
                contractIdentity: "bdd.math.add.v1",
                request: {
                    type: "array",
                    prefixItems: [{ type: "number" }, { type: "number" }],
                    minItems: 2,
                    maxItems: 2
                },
                response: {
                    type: "object",
                    properties: { total: { type: "number" } },
                    required: ["total"]
                }
            }
        ],
        topics: [
            {
                name: "runtime-manifest-status",
                direction: "output",
                description: "A descriptive status topic",
                mediaType: "application/json",
                schema: { type: "object", properties: { status: { type: "string" } } }
            }
        ]
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

function errorInfo(error) {
    return {
        code: typeof error?.code === "string" ? error.code : error?.name || "Error",
        message: error instanceof Error ? error.message : String(error)
    };
}

function parseAction(payload) {
    const action = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (!action || typeof action !== "object" || Array.isArray(action)) {
        throw new Error("runtime manifest action must be a JSON object");
    }
    return action;
}

function installActionHandler(context, state, output) {
    const emitResult = (result) => context.emit("runtime-manifest-result", result);

    context.on("runtime-manifest-action", (payload) => {
        void (async () => {
            let action;
            try {
                action = parseAction(payload);
                if (action.runId !== state.runId) throw new Error("runtime manifest action runId did not match producer config");

                if (action.action === "finish") {
                    output.end();
                    return;
                }

                if (action.action === "invalid") {
                    let rejection;
                    try {
                        await context.api.declare({ output: { description: 17 } });
                    } catch (error) {
                        rejection = error;
                    }
                    emitResult({
                        runId: state.runId,
                        action: "invalid",
                        rejected: rejection !== undefined,
                        ...(rejection === undefined ? {} : { error: errorInfo(rejection) }),
                        provenance: provenance()
                    });
                    return;
                }

                if (action.action === "update") {
                    const variant = action.variant === undefined ? state.variant : action.variant;
                    const version = action.version === undefined ? state.version + 1 : action.version;
                    if (variant !== "string" && variant !== "object") throw new Error("update variant must be 'string' or 'object'");
                    if (typeof version !== "number" || !Number.isFinite(version)) throw new Error("update version must be a finite number");
                    const receipt = await context.api.declare(declarationFor({ ...state, variant, version }));
                    state.variant = variant;
                    state.version = version;
                    emitResult({ runId: state.runId, action: "update", receipt, provenance: provenance() });
                    return;
                }

                throw new Error(`unsupported runtime manifest action: ${String(action.action)}`);
            } catch (error) {
                emitResult({
                    runId: state.runId,
                    action: typeof action?.action === "string" ? action.action : "invalid-action",
                    rejected: true,
                    error: errorInfo(error),
                    provenance: provenance()
                });
            }
        })();
    });
}

async function initialize() {
    const state = requiredProducerConfig(this);
    const output = new PassThrough();
    producerState.set(this, { ...state, output });
    installActionHandler(this, producerState.get(this), output);

    let receipt = null;
    if (state.publish) receipt = await this.api.declare(declarationFor(state));
    this.emit("runtime-manifest-initialized", { runId: state.runId, receipt, provenance: provenance() });
}

function producer() {
    const state = producerState.get(this);
    if (!state) throw new Error("runtime manifest producer initialize state is unavailable");
    this.exitTimeout = 0;
    return state.output;
}

module.exports = { initialize, default: producer };
