"use strict";

/**
 * Tiny Node sequence that completes successfully.
 *
 * Used by the runner-node spawn-isolation regression scenario:
 *   "Node sequence completes successfully under runner-node spawn isolation".
 *
 * It writes a marker line so BDD can verify stdout was forwarded, then
 * resolves with a primitive so `runSequence()` finishes naturally.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function(_input) {
    process.stdout.write("NODE_COMPLETES_OK\n");
    this.logger.info("node-completes sequence ran");

    // Keep the runner observable through the lifecycle contract instead of a
    // fixed sleep; BDD observes the forwarded marker and runner state.
    this.keepAlive(250);

    return "done";
};
