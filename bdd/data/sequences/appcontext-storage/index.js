"use strict";

/**
 * BDD AppContext fixture: localStorage.
 * Spec: real setItem("alpha", "valueA") then getItem("alpha") must return "valueA".
 *
 * This test fails if the storage-host monitoring channel roundtrip is not
 * fully wired between the runner and host in source/process mode.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function appcontextStorageSequence(_input) {
    await this.localStorage.setItem("alpha", "valueA");

    const stored = await this.localStorage.getItem("alpha");

    if (stored !== "valueA") {
        throw new Error(
            `localStorage mismatch: expected "valueA", got "${String(stored)}"`
        );
    }

    process.stdout.write(
        JSON.stringify({
            type: "appcontext-storage",
            action: "set-get",
            key: "alpha",
            value: stored,
            match: true,
            timestamp: Date.now(),
        }) + "\n"
    );

    // Storage conformance is exercised by the set/get round trip above.
};
