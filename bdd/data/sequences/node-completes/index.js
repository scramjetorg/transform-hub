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
 * @this {import("@scramjet/types").AppContext}
 */
module.exports = async function(_input) {
    process.stdout.write("NODE_COMPLETES_OK\n");
    this.logger.info("node-completes sequence ran");

    // Small delay so the BDD harness has time to bind the instance client
    // and resolve the runner PID before the sequence terminates.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return "done";
};
