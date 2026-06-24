"use strict";

/**
 * BDD AppContext fixture: event emission and reception.
 *
 * Emits a host event on startup and listens for incoming events.
 * When an event is received, it emits a response event and writes
 * a marker to stdout.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function appcontextEventsSequence(_input) {
    this.emit("appcontext.ready", { status: "initialized" });

    process.stdout.write(
        JSON.stringify({
            type: "appcontext-events",
            action: "ready-emitted",
            timestamp: Date.now(),
        }) + "\n"
    );

    // Wait briefly for potential incoming events.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Emit a response event to prove emitToSpace also works.
    this.emitToSpace("appcontext.response", { body: "pong" });

    process.stdout.write(
        JSON.stringify({
            type: "appcontext-events",
            action: "response-emitted",
            scope: "space",
            timestamp: Date.now(),
        }) + "\n"
    );

    return { events: ["emit", "emitToSpace"], handled: true };
};
