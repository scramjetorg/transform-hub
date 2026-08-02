#! /usr/bin/env node

/**
 * @file scripts/lib/bdd-memory-guard.js
 *
 * Reusable BDD memory guard helper for Cucumber parent-process heap measurement.
 *
 * Reuses measureMemoryUsage() and drainAndGc() from the AVA memory guard
 * module for consistency; both helpers are stateless and safe to share.
 *
 * Provides enable/skip/threshold checks for the BDD memory guard and a
 * diagnostics builder for per-scenario memory failures.
 *
 * Usage (in Cucumber support hooks):
 *
 *   import { Before, After } from "@cucumber/cucumber";
 *   import {
 *       measureMemoryUsage, drainAndGc,
 *       isBddMemoryGuardEnabled, bddMemoryHeapThresholdBytes,
 *       ensureGlobalGc, buildBddMemoryDiagnostics,
 *   } from "../../scripts/lib/bdd-memory-guard";
 *
 *   if (isBddMemoryGuardEnabled()) ensureGlobalGc();
 *
 *   Before(async function () {
 *       await drainAndGc();
 *       this.__memoryBaseline = measureMemoryUsage();
 *   });
 *
 *   After(async function () {
 *       await drainAndGc();
 *       const final = measureMemoryUsage();
 *       if (final - this.__memoryBaseline > bddMemoryHeapThresholdBytes()) {
 *           throw new Error(buildBddMemoryDiagnostics({ ... }));
 *       }
 *   });
 *
 * Environment variables:
 *
 *   SCRAMJET_MEMORY_GUARD                 – "1" to enable common guard
 *   SCRAMJET_BDD_MEMORY_GUARD             – "1"/"0"/etc to enable/disable
 *   SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES  – common threshold default 524288
 *   SCRAMJET_BDD_MEMORY_THRESHOLD_BYTES   – BDD-specific override
 *   SCRAMJET_MEMORY_SKIP                  – "1" to skip all measurement
 *   SCRAMJET_MEMORY_SKIP_REASON           – required non-empty reason when SKIP=1
 */

const {
    isBddMemoryGuardEnabled,
    bddMemoryHeapThresholdBytes,
    bddMemoryThresholdSourceLabel,
    bddMemorySkipCheck,
    ENV
} = require("./bdd-options.js");

const { measureMemoryUsage, drainAndGc } = require("./ava-memory-guard.js");

// ---------------------------------------------------------------------------
// GC readiness check
// ---------------------------------------------------------------------------

/**
 * Verify that global.gc is available when the memory guard is enabled.
 *
 * @returns {void}
 * @throws {Error}  If global.gc is not a function.
 */
function ensureGlobalGc() {
    if (typeof global.gc !== "function") {
        throw new Error(
            "BDD memory guard is enabled (SCRAMJET_BDD_MEMORY_GUARD or " +
                "SCRAMJET_MEMORY_GUARD) but global.gc is not available.\n" +
                "Ensure the Cucumber Node process is started with --expose-gc.\n" +
                "The supported runner paths (run-bdd.js direct mode and " +
                "run-bdd-docker.js Docker mode) inject --expose-gc via " +
                "NODE_OPTIONS when the memory guard is enabled."
        );
    }
}

// ---------------------------------------------------------------------------
// Skip check
// ---------------------------------------------------------------------------

/**
 * Validate and check BDD memory skip.
 *
 * When SCRAMJET_MEMORY_SKIP=1, SCRAMJET_MEMORY_SKIP_REASON must be non-empty.
 * If skip is active, logs a warning and returns { skip: true, reason }.
 *
 * @returns {{ skip: boolean, reason?: string }}
 * @throws {Error}  If SKIP=1 without SKIP_REASON, or if guard enabled but gc missing.
 */
function checkBddMemorySkip() {
    const skipResult = bddMemorySkipCheck();

    if (skipResult.skip) {
        console.warn(`[bdd-memory-guard] Memory guard skipped: ${skipResult.reason}. ` + `Set ${ENV.MEMORY_SKIP}=0 to re-enable.`);
    }

    return skipResult;
}

// ---------------------------------------------------------------------------
// Diagnostics builder
// ---------------------------------------------------------------------------

/**
 * Format a component breakdown string from before/after process.memoryUsage()
 * snapshots, focusing on heapUsed, external, and arrayBuffers.
 *
 * @param {object} before  process.memoryUsage() before the scenario.
 * @param {object} after   process.memoryUsage() after the scenario (pre-GC).
 * @returns {string}  Multi-line breakdown.
 */
function formatComponentBreakdown(before, after) {
    const lines = [];

    for (const key of ["heapUsed", "external", "arrayBuffers"]) {
        const b = before[key] || 0;
        const a = after[key] || 0;
        const d = a - b;

        lines.push(`  ${key}: ${b} -> ${a} (\u0394 ${d >= 0 ? "+" : ""}${d})`);
    }

    return lines.join("\n");
}

/**
 * Build an actionable BDD memory guard diagnostics string.
 *
 * @param {object} opts
 * @param {string}  opts.scenarioName   Cucumber scenario name.
 * @param {number}  opts.baseline       Pre-scenario post-GC total.
 * @param {number}  opts.final          Post-scenario post-GC total.
 * @param {number}  opts.delta          final - baseline.
 * @param {number}  opts.threshold      Effective threshold in bytes.
 * @param {string}  opts.sourceLabel    Threshold source description.
 * @param {object}  [opts.beforeUsage]  Raw before snapshot for breakdown.
 * @param {object}  [opts.afterUsage]   Raw after snapshot for breakdown.
 * @param {string}  [opts.skipContext]  Skip/exception context description.
 * @param {Array<Error>} [opts.cleanupErrors] Errors from cleanup callbacks.
 * @returns {string}  Multi-line diagnostics string.
 */
function buildBddMemoryDiagnostics({ scenarioName, baseline, final, delta, threshold, sourceLabel, beforeUsage, afterUsage, skipContext, cleanupErrors }) {
    const lines = [];

    lines.push(`BDD memory guard: scenario "${scenarioName}" ` + `used ${delta} bytes ` + `(threshold: ${threshold} bytes, source: ${sourceLabel}).`);

    lines.push(`  before (total): ${baseline}  after (total): ${final}`);

    if (beforeUsage && afterUsage) {
        lines.push(formatComponentBreakdown(beforeUsage, afterUsage));
    }

    if (skipContext) {
        lines.push(`  skip context: ${skipContext}`);
    }

    if (cleanupErrors && cleanupErrors.length > 0) {
        lines.push(`  cleanup errors: ${cleanupErrors.length}`);
        for (const err of cleanupErrors) {
            lines.push(`    - ${err.message}`);
        }
    }

    lines.push(
        "Review the scenario for unreleased references, global state, " +
            "or large fixture data.  Clear world fields (response, outStream, " +
            "collectedTopicData, stdio references) before the guard measures."
    );

    return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Measurement wrapper
// ---------------------------------------------------------------------------

/**
 * Measure the current post-GC memory and return the total + raw snapshot.
 *
 * Convenience helper that captures the raw snapshot, drains + GCs, then
 * returns the post-GC total and the raw snapshot.
 *
 * @returns {{ total: number, raw: object }}
 */
async function measureWithGc() {
    const raw = process.memoryUsage();

    await drainAndGc();

    return { total: measureMemoryUsage(), raw };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    // Re-exported from ava-memory-guard
    measureMemoryUsage,
    drainAndGc,

    // Re-exported from bdd-options
    isBddMemoryGuardEnabled,
    bddMemoryHeapThresholdBytes,
    bddMemoryThresholdSourceLabel,
    ENV,

    // Own helpers
    ensureGlobalGc,
    checkBddMemorySkip,
    formatComponentBreakdown,
    buildBddMemoryDiagnostics,
    measureWithGc
};
