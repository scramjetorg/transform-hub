"use strict";

/**
 * BDD AppContext fixture: event emission and reception.
 * Spec: registers a handler for "test.event".  When the event is
 * received via the runtime event system, it emits
 * "appcontext.response" with body "pong" via emitToSpace.
 *
 * If the runtime does not wire this.on() handlers to inbound
 * events from the host, the appcontext.response will never be
 * emitted and this scenario will time out.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function appcontextEventsSequence(_input) {
    const received = new Promise((resolve) => {
        // Register handler for inbound "test.event".
        this.on("test.event", (message) => {
            this.emitToSpace("appcontext.response", { body: "pong" });
            resolve({ event: "test.event", message });
        });
    });

    this.keepAlive(15_000);

    // Signal that the handler was registered.
    process.stdout.write(
        JSON.stringify({
            type: "appcontext-events",
            action: "handler-registered",
            timestamp: Date.now(),
        }) + "\n"
    );

    const event = await received;

    this.end();

    return { events: ["emit", "on"], handled: true, event };
};
