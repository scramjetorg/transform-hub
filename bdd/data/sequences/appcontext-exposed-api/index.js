"use strict";

/**
 * BDD AppContext fixture: exposed API endpoint.
 *
 * Registers a /health endpoint through this.api.use() so the BDD
 * harness can verify the exposed API route is live.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function appcontextExposedApiSequence(_input) {
    this.api.use("/health", (_req, res) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "appcontext-exposed-api" }));
    });

    process.stdout.write(
        JSON.stringify({
            type: "appcontext-exposed-api",
            action: "route-registered",
            path: "/health",
            timestamp: Date.now(),
        }) + "\n"
    );

    return { apiRoute: "/health", handled: true };
};
