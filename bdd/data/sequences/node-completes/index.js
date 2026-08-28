"use strict";

/**
 * Tiny Node sequence that completes successfully.
 *
 * Used by the runner-node artifact journey that observes completion through
 * the Host process adapter.
 *
 * It resolves with a primitive so `runSequence()` finishes naturally. The
 * journey observes the runner's bounded process lifecycle, not a retained
 * stdout response body.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function(_input) {
    return "done";
};
