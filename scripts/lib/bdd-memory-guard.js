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
    bddMemoryComponentThresholds,
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
 * Compute the guarded metric total from a raw process.memoryUsage() snapshot.
 *
 * Returns the independent parent components that participate in enforcement.
 * External memory is deliberately diagnostic-only.
 *
 * @param {object} [raw]  Raw process.memoryUsage() snapshot.
 * @returns {number}  heapUsed + arrayBuffers bytes.
 */
function memoryUsageTotal(raw) {
    return (raw?.heapUsed || 0) + (raw?.arrayBuffers || 0);
}

function evaluateBddMemoryComponents(baselineUsage, finalUsage, { heapUsedBytes, arrayBuffersBytes }, { heapUsedAllowanceBytes = 0, arrayBuffersAllowanceBytes = 0 } = {}) {
    const heapUsedDelta = (finalUsage?.heapUsed || 0) - (baselineUsage?.heapUsed || 0);
    const arrayBuffersDelta = (finalUsage?.arrayBuffers || 0) - (baselineUsage?.arrayBuffers || 0);
    const externalDelta = (finalUsage?.external || 0) - (baselineUsage?.external || 0);
    const heapUsedThreshold = heapUsedBytes + heapUsedAllowanceBytes;
    const arrayBuffersThreshold = arrayBuffersBytes + arrayBuffersAllowanceBytes;
    const componentFailures = [];
    if (heapUsedDelta > heapUsedThreshold) componentFailures.push(`heapUsed delta ${heapUsedDelta} exceeds ${heapUsedThreshold}`);
    if (arrayBuffersDelta > arrayBuffersThreshold) componentFailures.push(`arrayBuffers delta ${arrayBuffersDelta} exceeds ${arrayBuffersThreshold}`);
    return { heapUsedDelta, arrayBuffersDelta, externalDelta, heapUsedThreshold, arrayBuffersThreshold, componentFailures };
}

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
 * Format a single raw process.memoryUsage() snapshot's guarded components
 * (heapUsed, external, arrayBuffers), one line per component.
 *
 * @param {object} usage  Raw process.memoryUsage() snapshot.
 * @returns {string}  Multi-line component listing.
 */
function formatComponentSnapshot(usage) {
    return ["heapUsed", "external", "arrayBuffers"]
        .map((key) => `  ${key}: ${usage?.[key] || 0}`)
        .join("\n");
}

/**
 * Build an actionable BDD memory guard diagnostics string.
 *
 * The enforced metric is always the post-GC delta (final - baseline).  When
 * post-GC component snapshots are provided (baselineUsage / postGcUsage),
 * the diagnostics additionally distinguish: baseline post-GC components,
 * pre-final-GC components, bytes reclaimed by the final GC, and post-GC
 * heapUsed/external/arrayBuffers components.  RSS, when provided, is
 * diagnostic only and never participates in enforcement.
 *
 * @param {object} opts
 * @param {string}  opts.scenarioName      Cucumber scenario name.
 * @param {number}  opts.baseline          Pre-scenario post-GC total.
 * @param {number}  opts.final             Post-scenario post-GC total.
 * @param {number}  opts.delta             final - baseline (enforced).
 * @param {number}  opts.threshold         Effective threshold in bytes.
 * @param {string}  opts.sourceLabel       Threshold source description.
 * @param {object}  [opts.beforeUsage]     Raw pre-scenario snapshot (legacy breakdown).
 * @param {object}  [opts.afterUsage]      Raw pre-final-GC snapshot.
 * @param {object}  [opts.baselineUsage]   Post-GC baseline component snapshot.
 * @param {object}  [opts.postGcUsage]     Post-final-GC component snapshot.
 * @param {number}  [opts.reclaimedBytes]  Bytes reclaimed by the final GC (diagnostic).
 * @param {number}  [opts.rssBaseline]     Baseline RSS (diagnostic only).
 * @param {number}  [opts.rssFinal]        Final RSS (diagnostic only).
 * @param {number}  [opts.heapUsedDelta]   Post-GC heapUsed delta.
 * @param {number}  [opts.arrayBuffersDelta] Post-GC arrayBuffers delta.
 * @param {number}  [opts.externalDelta]   Post-GC external delta (diagnostic only).
 * @param {number}  [opts.heapUsedThreshold] HeapUsed threshold.
 * @param {number}  [opts.arrayBuffersThreshold] ArrayBuffers threshold.
 * @param {string[]} [opts.componentFailures] Independent component failures.
 * @param {string}  [opts.skipContext]     Skip/exception context description.
 * @param {Array<Error>} [opts.cleanupErrors] Errors from cleanup callbacks.
 * @returns {string}  Multi-line diagnostics string.
 */
function buildBddMemoryDiagnostics(opts) {
    const {
        scenarioName, baseline, final, delta, threshold, sourceLabel,
        beforeUsage, afterUsage, baselineUsage, postGcUsage, reclaimedBytes,
        rssBaseline, rssFinal, skipContext, cleanupErrors,
        heapUsedDelta, arrayBuffersDelta, externalDelta,
        heapUsedThreshold, arrayBuffersThreshold, componentFailures,
    } = opts || {};

    const lines = [];

    lines.push(`BDD memory guard: scenario "${scenarioName}" ` + `used ${delta} bytes ` + `(threshold: ${threshold} bytes, source: ${sourceLabel}).`);

    lines.push(`  before (total): ${baseline}  after (total): ${final}`);

    if (componentFailures) {
        lines.push(`  component thresholds: heapUsed=${heapUsedThreshold} arrayBuffers=${arrayBuffersThreshold}`);
        lines.push(`  post-GC deltas: heapUsed=${heapUsedDelta} arrayBuffers=${arrayBuffersDelta} external=${externalDelta} (external diagnostic only)`);
        for (const failure of componentFailures) lines.push(`  component failure: ${failure}`);
    }

    const hasPostGcSnapshots = baselineUsage || postGcUsage;

    if (hasPostGcSnapshots) {
        // Post-GC component snapshots at the enforcement point: report the
        // baseline post-GC state, the pre-final-GC state, what the final GC
        // reclaimed, and the enforced post-GC state — all diagnostic.
        if (baselineUsage) {
            lines.push(`  baseline post-GC components:\n${formatComponentSnapshot(baselineUsage)}`);
        }
        if (afterUsage) {
            lines.push(`  pre-final-GC components:\n${formatComponentSnapshot(afterUsage)}`);
        }
        if (typeof reclaimedBytes === "number") {
            lines.push(`  final GC reclaimed: ${reclaimedBytes} bytes`);
        }
        if (postGcUsage) {
            lines.push(`  post-GC enforced components:\n${formatComponentSnapshot(postGcUsage)}`);
        }
    } else if (beforeUsage && afterUsage) {
        // Legacy fallback: pre-GC baseline -> pre-final-GC delta breakdown.
        lines.push(formatComponentBreakdown(beforeUsage, afterUsage));
    }

    if (rssBaseline !== undefined && rssFinal !== undefined) {
        lines.push(`  rss (diagnostic): ${rssBaseline} -> ${rssFinal}`);
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
    bddMemoryComponentThresholds,
    bddMemoryThresholdSourceLabel,
    ENV,

    // Own helpers
    ensureGlobalGc,
    checkBddMemorySkip,
    memoryUsageTotal,
    evaluateBddMemoryComponents,
    formatComponentBreakdown,
    formatComponentSnapshot,
    buildBddMemoryDiagnostics,
    measureWithGc
};
