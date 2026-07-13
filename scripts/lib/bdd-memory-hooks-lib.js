/**
 * @file scripts/lib/bdd-memory-hooks-lib.js
 *
 * Shared helpers for the BDD parent-process memory guard hooks in
 * bdd/support/memory-hooks.ts.
 *
 * Extracted so that memory-guard infrastructure tests in
 * scripts/test/bdd-memory-guard.spec.js can test the production
 * helpers directly (no copied logic).
 */

"use strict";

// ---------------------------------------------------------------------------
// Scenario exception matching
// ---------------------------------------------------------------------------

/**
 * Match a running scenario against the SCENARIO_EXCEPTIONS list.
 *
 * Each exception is keyed by feature URI (matched via endsWith so that
 * absolute Docker paths like `/work/bdd/features/...` resolve), scenario
 * line (optional secondary guard), and exact scenario name (===).
 *
 * @param {Array}     exceptions   Array of ScenarioException objects.
 * @param {string}    featureUri   Cucumber pickle URI (may be absolute).
 * @param {number}    scenarioLine Scenario line number (0 if unavailable).
 * @param {string}    scenarioName Exact scenario name.
 * @returns {object|undefined}     Matching exception, or undefined.
 */
function matchScenarioException(exceptions, featureUri, scenarioLine, scenarioName) {
    for (const exc of exceptions) {
        const uriMatch = featureUri.endsWith(exc.featureUri) || featureUri === exc.featureUri;
        // Line is a secondary guard: skip enforcement when we don't have
        // a reliable line or the exception doesn't specify one.
        const lineMatch = exc.line === 0 || scenarioLine === 0 || scenarioLine === exc.line;

        if (uriMatch && lineMatch && scenarioName === exc.scenarioName) {
            return exc;
        }
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// World resource cleanup
// ---------------------------------------------------------------------------

/**
 * Release every scenario-local reference on the Cucumber world object.
 *
 * Nulls every key on `world.resources`, `world.cliResources`, and
 * `world.response` so that all userland objects become unreachable and
 * eligible for GC before the final memory measurement.  No fields are
 * skipped — even constructor-initialised maps were counted in the
 * baseline measurement, so releasing them can only reduce (or keep
 * neutral) the final delta.
 *
 * @param {object} world  Cucumber World instance (any type).
 */
function cleanupWorldResources(world) {
    const errors = [];

    const release = (value, key) => {
        if (!value || typeof value !== "object") return;
        if (typeof value.destroy === "function" && (value.readable || value.writable || value._readableState)) {
            try {
                value.destroy();
            } catch (e) {
                errors.push(new Error(`Failed to destroy resource "${key}": ${e.message}`));
            }
        }
        if (value.pid && value.exitCode === null && typeof value.kill === "function") {
            try {
                value.kill();
            } catch (_) {
                /* already exited */
            }
        }
    };

    if (world.resources) {
        for (const key of Object.keys(world.resources)) {
            release(world.resources[key], key);
            world.resources[key] = undefined;
        }
    }

    if (world.cliResources) {
        for (const key of Object.keys(world.cliResources)) {
            release(world.cliResources[key], key);
            world.cliResources[key] = undefined;
        }
    }

    world.response = undefined;

    if (errors.length > 0) {
        const aggregate = new Error(`Cleanup failed for ${errors.length} resource(s): ${errors.map((e) => e.message).join("; ")}`);
        aggregate.cleanupErrors = errors;
        throw aggregate;
    }
}

module.exports = {
    matchScenarioException,
    cleanupWorldResources
};
