"use strict";

/**
 * BDD AppContext fixture: localStorage.
 *
 * Reads input for "set:<key>:<value>" commands, performs localStorage
 * operations, and writes the current state to stdout.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function appcontextStorageSequence(input) {
    const records = Array.isArray(input) ? input : [];

    for (const record of records) {
        if (typeof record === "string" && record.startsWith("set:")) {
            const parts = record.split(":");
            const key = parts[1];
            const value = parts.slice(2).join(":");

            await this.localStorage.setItem(key, value);

            process.stdout.write(
                JSON.stringify({
                    type: "appcontext-storage",
                    action: "setItem",
                    key,
                    value,
                    timestamp: Date.now(),
                }) + "\n"
            );
        }

        if (typeof record === "string" && record.startsWith("get:")) {
            const key = record.split(":")[1];
            const stored = await this.localStorage.getItem(key);

            process.stdout.write(
                JSON.stringify({
                    type: "appcontext-storage",
                    action: "getItem",
                    key,
                    value: stored,
                    timestamp: Date.now(),
                }) + "\n"
            );

            return { key, value: stored };
        }
    }

    return { storage: "handled" };
};
