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

// ---------------------------------------------------------------------------
// Scenario exception matching
// ---------------------------------------------------------------------------

/**
 * Match a running scenario against the SCENARIO_EXCEPTIONS list.
 *
 * Each exception is keyed by feature URI. URIs are normalized to the exact
 * relative path below `features/`; the normalizer also accepts absolute
 * Docker paths containing `/bdd/features/`. Scenario line is an optional
 * secondary guard, and scenario name is the final match criterion.
 *
 * When `exc.scenarioName === "*"`, the exception matches **any** scenario
 * within the matching feature file (feature-level scope).  When it is an
 * exact string, it matches only that exact scenario name (===).
 *
 * @param {Array}     exceptions   Array of ScenarioException objects.
 * @param {string}    featureUri   Cucumber pickle URI (may be absolute).
 * @param {number}    scenarioLine Scenario line number (0 if unavailable).
 * @param {string}    scenarioName Exact scenario name.
 * @returns {object|undefined}     Matching exception, or undefined.
 */
function normalizeFeatureUri(featureUri) {
    if (typeof featureUri !== "string" || featureUri.length === 0) return undefined;

    const uri = featureUri.replaceAll("\\", "/");
    const dockerFeaturesPrefix = "/bdd/features/";
    const dockerPrefixIndex = uri.indexOf(dockerFeaturesPrefix);

    if (dockerPrefixIndex >= 0) {
        return uri.slice(dockerPrefixIndex + dockerFeaturesPrefix.length);
    }
    if (uri.startsWith("features/")) return uri.slice("features/".length);
    if (uri.startsWith("/")) return undefined;

    return uri;
}

function matchScenarioException(exceptions, featureUri, scenarioLine, scenarioName) {
    const normalizedFeatureUri = normalizeFeatureUri(featureUri);

    for (const exc of exceptions) {
        const uriMatch = normalizedFeatureUri !== undefined && normalizedFeatureUri === normalizeFeatureUri(exc.featureUri);

        if (!uriMatch) continue;

        // When scenarioName is "*", the exception is feature-scoped and
        // matches any scenario in the feature (no line/name check).
        if (exc.scenarioName === "*") {
            return exc;
        }

        // Exact per-scenario matching:
        // Line-specific matching fails closed when line extraction is
        // unavailable. Only an explicitly line-agnostic exception (line 0)
        // may match without a scenario line.
        const lineMatch = exc.line === 0 || (scenarioLine > 0 && scenarioLine === exc.line);

        if (lineMatch && scenarioName === exc.scenarioName) {
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
        try {
            value.dispose?.();
            value.client?.dispose?.();
        } catch (e) {
            errors.push(new Error(`Failed to dispose resource "${key}": ${e.message}`));
        }
        if (typeof value.destroy === "function" && (value.readable || value.writable || value._readableState)) {
            try {
                value.destroy();
            } catch (e) {
                errors.push(new Error(`Failed to destroy resource "${key}": ${e.message}`));
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
    world.responseChunks = undefined;
    world.responseText = undefined;

    if (errors.length > 0) {
        const aggregate = new Error(`Cleanup failed for ${errors.length} resource(s): ${errors.map((e) => e.message).join("; ")}`);
        aggregate.cleanupErrors = errors;
        throw aggregate;
    }
}

async function cleanupScenarioWorldResources(world, lifecycle) {
    const errors = [];
    try {
        await lifecycle.cleanup();
    } catch (e) {
        errors.push(...(e.cleanupErrors || [e]));
    }
    try {
        cleanupWorldResources(world);
    } catch (e) {
        errors.push(...(e.cleanupErrors || [e]));
    }
    if (errors.length > 0) {
        const aggregate = new Error(`Cleanup failed for ${errors.length} resource(s): ${errors.map((e) => e.message).join("; ")}`);
        aggregate.cleanupErrors = errors;
        throw aggregate;
    }
}

module.exports = {
    normalizeFeatureUri,
    matchScenarioException,
    cleanupWorldResources,
    cleanupScenarioWorldResources
};
