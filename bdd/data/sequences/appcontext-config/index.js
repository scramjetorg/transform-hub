"use strict";

/**
 * BDD AppContext fixture: config and instanceId access.
 *
 * Reads this.config and this.instanceId from the AppContext and
 * writes them to stdout as NDJSON so the BDD harness can verify.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function appcontextConfigSequence(_input) {
    const config = this.config || {};
    const instanceId = this.instanceId || "unknown";

    process.stdout.write(
        JSON.stringify({
            type: "appcontext-config",
            multiplier: config.multiplier,
            instanceId,
            timestamp: Date.now(),
        }) + "\n"
    );

    return { config, instanceId, handled: true };
};
