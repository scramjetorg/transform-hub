/**
 * @file bdd/support/memory-hooks.ts
 *
 * Cucumber Before/After hooks for the BDD parent-process memory guard.
 *
 * These hooks measure post-GC heap memory (heapUsed + external + arrayBuffers)
 * before and after each scenario.  If the delta exceeds the configured threshold,
 * the After hook fails the scenario with actionable diagnostics.
 *
 * Load order (via bdd/cucumber.js):
 *   1. support/memory-hooks.ts  ← this file (loaded FIRST)
 *   2. step-definitions/**/*.ts
 *
 * Cucumber After hooks run in reverse definition order, so this file's After
 * hook runs AFTER all step-definition cleanup hooks – exactly what we need to
 * measure memory after cleanup.
 *
 * Environment:
 *   SCRAMJET_BDD_MEMORY_GUARD – set to "1" to enable the guard
 *   SCRAMJET_MEMORY_GUARD     – common guard fallback
 *   SCRAMJET_BDD_MEMORY_THRESHOLD_BYTES – per-scenario threshold
 *   SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES – common threshold fallback
 *   SCRAMJET_MEMORY_SKIP      – set to "1" to skip (requires SKIP_REASON)
 *   SCRAMJET_MEMORY_SKIP_REASON – non-empty reason when SKIP=1
 */

import { Before, After } from "@cucumber/cucumber";

import {
    measureMemoryUsage,
    drainAndGc,
    isBddMemoryGuardEnabled,
    bddMemoryHeapThresholdBytes,
    bddMemoryThresholdSourceLabel,
    ensureGlobalGc,
    checkBddMemorySkip,
    buildBddMemoryDiagnostics,
} from "../../scripts/lib/bdd-memory-guard";

// ---------------------------------------------------------------------------
// Module-level GC readiness check
// ---------------------------------------------------------------------------
// We check synchronously at import time so the user sees a clear error
// immediately rather than on the first scenario.

const memorySkip = isBddMemoryGuardEnabled()
    ? checkBddMemorySkip()
    : { skip: false };

if (isBddMemoryGuardEnabled() && !memorySkip.skip) {
    ensureGlobalGc();
}

// ---------------------------------------------------------------------------
// World field names (additive, no collision with existing step defs)
// ---------------------------------------------------------------------------

const BASELINE_KEY = "__memoryBaseline";
const BEFORE_USAGE_KEY = "__memoryBeforeUsage";

// ---------------------------------------------------------------------------
// Before – baseline
// ---------------------------------------------------------------------------

Before(async function () {
    if (!isBddMemoryGuardEnabled() || memorySkip.skip) {
        return;
    }

    // Capture raw snapshot before drain+GC for component breakdown.
    const beforeUsage = process.memoryUsage();

    await drainAndGc();

    this[BASELINE_KEY] = measureMemoryUsage();
    this[BEFORE_USAGE_KEY] = beforeUsage;
});

// ---------------------------------------------------------------------------
// After – measure and fail if threshold exceeded
// ---------------------------------------------------------------------------

After(async function (this: any, scenario: any) {
    if (!isBddMemoryGuardEnabled() || memorySkip.skip) {
        return;
    }

    const baseline: number | undefined = this[BASELINE_KEY];
    if (baseline === undefined) {
        return; // No baseline – guard may have been enabled mid-run
    }

    // Derive scenario name from the Cucumber pickle (available on `this`)
    const scenarioName: string =
        scenario?.pickle?.name || this.pickle?.name || this.testCaseStartedId || "unknown";

    // ---- Cleanup world resources before final measurement ----
    const cleanupErrors: Error[] = [];

    try {
        cleanupWorldResources(this);
    } catch (err: any) {
        cleanupErrors.push(err);
    }

    // ---- Final measurement ----
    const afterUsage = process.memoryUsage();

    await drainAndGc();

    const final = measureMemoryUsage();
    const delta = final - baseline;
    const threshold = bddMemoryHeapThresholdBytes();

    // ---- Check threshold ----
    if (delta > threshold) {
        const diagnostics = buildBddMemoryDiagnostics({
            scenarioName,
            baseline,
            final,
            delta,
            threshold,
            sourceLabel: bddMemoryThresholdSourceLabel(),
            beforeUsage: this[BEFORE_USAGE_KEY],
            afterUsage,
            cleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : undefined,
        });

        throw new Error(diagnostics);
    }

    // Clean up per-scenario state
    delete this[BASELINE_KEY];
    delete this[BEFORE_USAGE_KEY];
});

// ---------------------------------------------------------------------------
// World cleanup helper
// ---------------------------------------------------------------------------

/**
 * Release scenario-local references that could retain memory.
 *
 * Called before the final memory measurement to reduce noise from known
 * retained objects on the world instance.
 */
function cleanupWorldResources(world: any): void {
    // Clear top-level response
    world.response = undefined;

    // Clear resources
    if (world.resources) {
        world.resources.outStream = undefined;
        world.resources.instance = undefined;
        world.resources.instance1 = undefined;
        world.resources.instance2 = undefined;
        world.resources.sequence = undefined;
        world.resources.sequence1 = undefined;
        world.resources.sequence2 = undefined;
    }

    // Clear CLI resources
    if (world.cliResources) {
        world.cliResources.collectedTopicData = undefined;
        world.cliResources.stdio = undefined;
        world.cliResources.stdio1 = undefined;
        world.cliResources.stdio2 = undefined;
        world.cliResources.commandInProgress = undefined;
    }
}
