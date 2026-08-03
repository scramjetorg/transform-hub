"use strict";

/**
 * BDD AppContext fixture: lifecycle (keepAlive, end).
 *
 * Calls keepAlive then end on the AppContext to prove the lifecycle
 * API functions are available and produce expected monitoring frames.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function appcontextLifecycleSequence(_input) {
    this.keepAlive(250);

    process.stdout.write(
        JSON.stringify({
            type: "appcontext-lifecycle",
            action: "keepAlive-called",
            timestamp: Date.now(),
        }) + "\n"
    );

    this.end();

    process.stdout.write(
        JSON.stringify({
            type: "appcontext-lifecycle",
            action: "end-called",
            timestamp: Date.now(),
        }) + "\n"
    );

    // Lifecycle conformance is exercised by the monitoring calls above.
};
