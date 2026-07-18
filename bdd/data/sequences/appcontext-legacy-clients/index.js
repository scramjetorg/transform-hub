"use strict";

/**
 * BDD AppContext fixture: legacy hub and space clients.
 *
 * Uses this.hub (legacy host client) and this.space (legacy space
 * client) to make synthetic API calls.  Any unexpected call failure
 * is reported in stdout and causes the fixture to throw.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function appcontextLegacyClientsSequence(input) {
    const results = [];

    // hub.get("/api/v1/version")
    try {
        const versionResp = await this.hub.get("/api/v1/version");
        results.push({ client: "hub", method: "GET", path: "/api/v1/version", status: "ok", data: JSON.stringify(versionResp).slice(0, 100) });
    } catch (err) {
        results.push({ client: "hub", method: "GET", path: "/api/v1/version", status: "error", error: String(err).slice(0, 200) });
    }

    // hub.get("/api/v1/status")
    try {
        const statusResp = await this.hub.get("/api/v1/status");
        results.push({ client: "hub", method: "GET", path: "/api/v1/status", status: "ok", data: JSON.stringify(statusResp).slice(0, 100) });
    } catch (err) {
        results.push({ client: "hub", method: "GET", path: "/api/v1/status", status: "error", error: String(err).slice(0, 200) });
    }

    // space.get("/v1/ping")
    try {
        const spaceResp = await this.space.get("/v1/ping");
        results.push({ client: "space", method: "GET", path: "/v1/ping", status: "ok", data: JSON.stringify(spaceResp).slice(0, 100) });
    } catch (err) {
        results.push({ client: "space", method: "GET", path: "/v1/ping", status: "error", error: String(err).slice(0, 200) });
    }

    process.stdout.write(
        JSON.stringify({
            type: "appcontext-legacy-clients",
            results,
            timestamp: Date.now(),
        }) + "\n"
    );

    // If any call failed, fail the fixture to make BDD aware.
    const failures = results.filter(r => r.status !== "ok");
    if (failures.length > 0) {
        throw new Error(
            "Legacy client calls failed: " + failures.map(f => `${f.client} ${f.method} ${f.path}: ${f.error || "unknown"}`).join("; ")
        );
    }

    // Client conformance is exercised by the successful calls and marker.
};
