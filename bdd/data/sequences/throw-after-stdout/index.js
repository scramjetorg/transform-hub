"use strict";

/**
 * BDD fixture: writes a stdout marker, then synchronously throws.
 *
 * Used by the runner-node spawn-isolation regression scenario:
 *   "Sequence stdout bytes arrive before SEQUENCE_STOPPED".
 *
 * The sequence must produce stdout BEFORE the runtime emits the terminal
 * SEQUENCE_STOPPED lifecycle frame. The BDD harness collects stdout via the
 * instance client, waits for the runner to end, and asserts that the stdout
 * marker is present in the captured stream (i.e. it was forwarded prior to
 * the terminal frame closing the stream).
 *
 * @this {import("@scramjet/types").AppContext}
 */
module.exports = async function(_input) {
    process.stdout.write("STDOUT_BEFORE_THROW\n");
    // Allow the stdout chunk to be flushed before we throw.
    await new Promise((resolve) => setImmediate(resolve));
    throw new Error("intentional throw after stdout");
};
