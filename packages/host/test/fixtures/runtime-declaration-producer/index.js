function declareRuntimeInterface(context, declaration) {
    return context.emit("runtime-declaration", declaration);
}

module.exports = {
    initialize(context) {
        const declaration = {
            runId: this.config.runId,
            name: "runtime-declaration-producer",
            description: "A short runtime interface declaration for the handoff proof.",
            output: { contentType: "application/x-ndjson" }
        };

        declareRuntimeInterface(context, declaration);
    },
    default(input) {
        this.keepAlive(60_000);
        return input;
    }
};
