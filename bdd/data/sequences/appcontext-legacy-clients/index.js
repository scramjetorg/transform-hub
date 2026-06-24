"use strict";

/**
 * BDD AppContext fixture: legacy hub and space clients.
 *
 * Uses this.hub (legacy host client) and this.space (legacy space
 * client) to make synthetic API calls, then reports results.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function appcontextLegacyClientsSequence(input) {
    const results = [];

    try {
        const version = await this.hub.get("/api/v1/version");
        results.push({ client: "hub", method: "GET", path: "/api/v1/version", status: "ok" });
    } catch (err) {
        results.push({ client: "hub", method: "GET", path: "/api/v1/version", status: "error", error: String(err) });
    }

    try {
        const status = await this.hub.get("/api/v1/status");
        results.push({ client: "hub", method: "GET", path: "/api/v1/status", status: "ok" });
    } catch (err) {
        results.push({ client: "hub", method: "GET", path: "/api/v1/status", status: "error", error: String(err) });
    }

    try {
        await this.space.get("/v1/ping");
        results.push({ client: "space", method: "GET", path: "/v1/ping", status: "ok" });
    } catch (err) {
        results.push({ client: "space", method: "GET", path: "/v1/ping", status: "error", error: String(err) });
    }

    process.stdout.write(
        JSON.stringify({
            type: "appcontext-legacy-clients",
            results,
            timestamp: Date.now(),
        }) + "\n"
    );

    return { legacyClients: results.length, handled: true };
};
