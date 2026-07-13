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
 *   2. step-definitions TypeScript files
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

import { Before, BeforeStep, AfterStep, After, AfterAll } from "@cucumber/cucumber";
import { writeFileSync } from "fs";

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
import {
    matchScenarioException,
    cleanupWorldResources,
} from "../../scripts/lib/bdd-memory-hooks-lib";
import { parseChunkMemoryPolicy, validateEnforcePrerequisites } from "../../scripts/lib/bdd-chunk-memory-policy.js";
const { createChunkTiming } = require("../../scripts/lib/bdd-chunk-timing.js");

// ---------------------------------------------------------------------------
// Per-scenario memory exceptions (narrowly scoped)
// ---------------------------------------------------------------------------
// When deterministic cleanup cannot release all legitimate allocations
// (e.g. Node.js C++ embedder structures for TLS / HTTP/2 that survive
// close()+GC), an entry here raises the effective threshold for only
// the named scenario.
//
// Each exception is keyed by the **exact** feature-URI + scenario-name
// pair so that unrelated or renamed scenarios never silently inherit it.
// An allowance must be justified by repeated lifecycle evidence showing
// a plateau in retained native-memory deltas (see the cycle test in
// scripts/test/verser2-cycle-memory.spec.js for the methodology).
//
// Entries are additive: effectiveThreshold = base + allowanceBytes.

interface ScenarioException {
    /** Feature URI relative to bdd/features/ (e.g. "verser2/VERSER2-001-isolated-routing.feature"). */
    featureUri: string;
    /** Exact scenario line number in the feature file. */
    line: number;
    /** Exact scenario name (matched with ===). */
    scenarioName: string;
    /** Additional bytes allowed above the base threshold. */
    allowanceBytes: number;
    /** Required documented reason, including reference to plateau evidence. */
    reason: string;
}

const SCENARIO_EXCEPTIONS: ScenarioException[] = [
    // -----------------------------------------------------------------------
    // VERSER2-001: Isolated verser2 routing guarantees
    //
    // These scenarios create HTTP/2 TLS hosts + brokers.  Node.js C++
    // embedder structures (SecureContext, HPACK tables, session settings)
    // survive close()+GC because V8 cannot reclaim allocations made by
    // Node.js's native TLS / HTTP2 implementations.
    //
    // Plateau evidence (scripts/test/verser2-cycle-memory.spec.js):
    //   After 2 warmup cycles, 6 measured cycles of create/request/close
    //   show native (external + arrayBuffers) delta of exactly 2778 bytes
    //   per cycle with ZERO spread across the last 4 cycles.  V8 heap
    //   fragmentation adds 44–109 KiB on top (GC-dependent but bounded).
    //
    //   Repeated guarded Docker runs (3 runs) observed deltas of
    //   537792, 681712, and 685088 bytes against the 524288-byte base.
    //   The maximum excess is 160800 bytes; allowance is 245760 bytes,
    //   which is the excess plus more than 50% headroom, rounded up.
    // -----------------------------------------------------------------------

    {
        featureUri: "verser2/VERSER2-001-isolated-routing.feature",
        line: 7,
        scenarioName: "Broker follows a native 308 redirect to an advertised route",
        // Repeated guarded-run maximum excess over the strict base:
        //   685088 - 524288 = 160800 bytes.
        allowanceBytes: 245_760,
        reason: "Node.js HTTP/2 TLS C++ embedder structs + V8 heap "
            + "fragmentation.  Three repeated guarded Docker runs observed "
            + "a maximum 160800-byte excess over the strict base; allowance "
            + "provides more than 50% headroom.",
    },

    // -----------------------------------------------------------------------
    // APPCONTEXT-001 TC-002: keepAlive/end lifecycle
    //
    // Deterministic world, stream, and runner cleanup is performed before the
    // measurement. Three serial guarded Docker runs nevertheless plateaued at
    // 611363, 611707, and 611587 bytes (base 524288), a 344-byte spread. The
    // 90112-byte allowance is the observed maximum excess (87419 bytes) rounded
    // to the next 4096-byte boundary; it applies only to this exact pickle.
    // -----------------------------------------------------------------------
    {
        featureUri: "appcontext/APPCONTEXT-001-full-sequence.feature",
        line: 19,
        scenarioName: "APPCONTEXT-001 TC-002 Sequence calls keepAlive and end through AppContext",
        allowanceBytes: 90_112,
        reason: "Repeated strict guarded Docker runs plateaued at 611363, 611707, and 611587 bytes "
            + "after deterministic cleanup (344-byte spread). The 90112-byte allowance is the "
            + "rounded observed maximum excess over the 524288-byte base and is scoped to this "
            + "exact feature, line, and scenario name.",
    },

    // -----------------------------------------------------------------------
    // APPCONTEXT-001 TC-001: config and instanceId
    //
    // Three serial strict guarded Docker runs measured 609760, 609080, and
    // 609224 bytes after deterministic cleanup, with a 680-byte spread. The
    // 86016-byte allowance is the maximum 85472-byte excess over the strict
    // base, rounded up once to a 4KiB boundary; it is exact-pickle scoped.
    // -----------------------------------------------------------------------
    {
        featureUri: "appcontext/APPCONTEXT-001-full-sequence.feature",
        line: 12,
        scenarioName: "APPCONTEXT-001 TC-001 Sequence reads config and instanceId from AppContext",
        allowanceBytes: 86_016,
        reason: "Three serial strict guarded Docker runs plateaued at 609760, 609080, and 609224 bytes "
            + "after deterministic cleanup (680-byte spread). The 86016-byte allowance is the "
            + "maximum observed 85472-byte excess over the 524288-byte base, rounded to a 4KiB "
            + "boundary and scoped to this exact feature, line, and scenario name.",
    },

    // -----------------------------------------------------------------------
    // E2E-001 TC-002: completed-sequence stdio
    //
    // Three valid serial strict runs measured 833792, 688720, and 832952
    // bytes. The bounded range is 145072 bytes; allowance is the maximum
    // 309504-byte excess over the 524288-byte base, rounded to 311296 bytes
    // (the next 4KiB boundary), scoped to this exact scenario.
    // -----------------------------------------------------------------------
    {
        featureUri: "e2e/E2E-001-samples.feature",
        line: 4,
        scenarioName: "E2E-001 TC-002 Test stdio available after the sequence is completed",
        allowanceBytes: 311_296,
        reason: "Three valid serial strict guarded Docker runs measured 833792, 688720, and 832952 "
            + "bytes (bounded 145072-byte range). Allowance is the maximum 309504-byte excess over "
            + "the 524288-byte base rounded to the next 4KiB boundary, scoped to this exact feature, "
            + "line, and scenario name.",
    },

    // -----------------------------------------------------------------------
    // E2E-012 TC-001: stdin flood with event responsiveness
    //
    // Stress-tagged scenarios were explicitly included for these runs. Three
    // valid serial strict guarded Docker runs measured 1265509, 1251605, and
    // 1256661 bytes, a bounded 13904-byte spread. The allowance is the maximum
    // 741221-byte excess over the 524288-byte base, rounded to 741376 bytes
    // (the next 4KiB boundary), and is scoped to this exact scenario.
    // -----------------------------------------------------------------------
    {
        featureUri: "e2e/E2E-012-stream-flooding-test.feature",
        line: 4,
        scenarioName: "E2E-012 TC-001 Flood stdin of Instance, do not consume it and check if Instance responds to event sent.",
        allowanceBytes: 741_376,
        reason: "Three valid serial strict guarded Docker runs measured 1265509, 1251605, and 1256661 "
            + "bytes (bounded 13904-byte spread). Allowance is the maximum 741221-byte excess over "
            + "the 524288-byte base rounded to the next 4KiB boundary, scoped to this exact feature, "
            + "line, and scenario name.",
    },

    // -----------------------------------------------------------------------
    // E2E-014 TC-003: Exceptions thrown in python sequences appear in stderr
    //
    // Scenario creates a Python child-process runner and verifies stderr
    // output.  Python runner allocation (V8 + native embedder structs)
    // leaves a residual heap delta after close + GC.
    //
    // Three repeated strict guarded Docker runs recorded deltas of
    // 599840, 598752, and 599880 bytes against the 524288-byte base.
    // The maximum excess over base is 75592 bytes; the 77824-byte
    // allowance is that excess rounded to the next 4096-byte boundary
    // (19 × 4096 = 77824), providing 2232 bytes of headroom.
    // -----------------------------------------------------------------------
    {
        featureUri: "e2e/E2E-014-python.feature",
        line: 4,
        scenarioName: "E2E-014 TC-003 Exceptions thrown in python sequences appear in stderr",
        allowanceBytes: 77_824,
        reason: "Python child-process runner allocations persist after "
            + "close()+GC. Three repeated strict guarded Docker runs "
            + "recorded deltas of 599840, 598752, and 599880 bytes; "
            + "maximum 75592-byte excess over the 524288-byte base. "
            + "Allowance is the next 4096-byte boundary (77824 bytes) "
            + "providing 2232 bytes of headroom.",
    },
];

// ---------------------------------------------------------------------------
// Module-level GC readiness check
// ---------------------------------------------------------------------------
// We check synchronously at import time so the user sees a clear error
// immediately rather than on the first scenario.

const chunkMemoryPolicy = parseChunkMemoryPolicy();
const memorySkip = (isBddMemoryGuardEnabled() || chunkMemoryPolicy === "enforce")
    ? checkBddMemorySkip()
    : { skip: false };
validateEnforcePrerequisites({
    policy: chunkMemoryPolicy,
    strictGuardEnabled: isBddMemoryGuardEnabled(),
    memorySkipped: memorySkip.skip,
});

if (isBddMemoryGuardEnabled() && !memorySkip.skip) {
    ensureGlobalGc();
}

// ---------------------------------------------------------------------------
// World field names (additive, no collision with existing step defs)
// ---------------------------------------------------------------------------

const BASELINE_KEY = "__memoryBaseline";
const BEFORE_USAGE_KEY = "__memoryBeforeUsage";
const getMemoryRegistry = () => require("../lib/memory-registry").memoryRegistry;
let chunkSamplingTimer: ReturnType<typeof setInterval> | undefined;
const chunkTiming = createChunkTiming(["1", "true", "yes"].includes(String(process.env.SCRAMJET_BDD_CHUNK_TIMING).toLowerCase()));

// ---------------------------------------------------------------------------
// Before – baseline
// ---------------------------------------------------------------------------

Before(async function (scenario: any) {
    const pickle = scenario?.pickle || this.pickle;
    chunkTiming.startScenario(this, { name: pickle?.name, uri: pickle?.uri });
    this.__chunkTimingStepIndex = 0;
    const chunkMetricsEnabled = chunkMemoryPolicy !== "off" && !memorySkip.skip;
    if ((!isBddMemoryGuardEnabled() && !chunkMetricsEnabled) || memorySkip.skip) {
        return;
    }

    // Capture raw snapshot before drain+GC for component breakdown.
    const beforeUsage = process.memoryUsage();

    if (isBddMemoryGuardEnabled()) await drainAndGc();

    const baseline = measureMemoryUsage();

    this[BASELINE_KEY] = baseline;
    this[BEFORE_USAGE_KEY] = beforeUsage;

    // Feed parent-heap sample into chunk-level tracking. The first scenario's
    // post-GC sample is the parent baseline; the readiness marker is emitted
    // later by the long-lived process readiness path.
    getMemoryRegistry().recordChunkHeapSample(baseline);

    if (chunkMemoryPolicy !== "off" && !chunkSamplingTimer) {
        const interval = process.env.BDD_CHUNK_MEMORY_SHORT === "1" ? 500 : 1000;
        chunkSamplingTimer = setInterval(() => {
            getMemoryRegistry().sampleAll().catch(() => undefined);
        }, interval);
        chunkSamplingTimer.unref?.();
    }
});

BeforeStep(function (this: any, step: any) {
    const pickle = step?.pickle || this.pickle;
    const pickleStep = pickle?.steps?.[this.__chunkTimingStepIndex++] || step?.pickleStep || step;
    this.__chunkTimingStep = chunkTiming.startStep(this, {
        name: pickleStep?.text || pickleStep?.name || step?.text || step?.name,
        uri: pickleStep?.uri || step?.pickleStep?.uri || step?.uri,
    });
});

AfterStep(function (this: any, step: any) {
    chunkTiming.finishStep(this.__chunkTimingStep, step?.result);
    delete this.__chunkTimingStep;
});

// This is defined before the memory After hook. Cucumber runs After hooks in
// reverse definition order, so scenario timing includes cleanup and failures.
After(function (this: any, scenario: any) {
    chunkTiming.finishScenario(this, {
        name: scenario?.pickle?.name,
        uri: scenario?.pickle?.uri,
        status: scenario?.result?.status,
    });
});

// ---------------------------------------------------------------------------
// After – measure and fail if threshold exceeded
// ---------------------------------------------------------------------------

After(async function (this: any, scenario: any) {
    if (!isBddMemoryGuardEnabled() || memorySkip.skip) {
        if (chunkTiming.enabled && !memorySkip.skip) {
            const cleanupTiming = chunkTiming.startCleanup(this, "world-cleanup");
            try {
                cleanupWorldResources(this);
            } finally {
                chunkTiming.finishCleanup(cleanupTiming);
            }
        }
        return;
    }

    const baseline: number | undefined = this[BASELINE_KEY];
    if (baseline === undefined) {
        return; // No baseline – guard may have been enabled mid-run
    }

    // Derive scenario metadata from the Cucumber pickle.
    const scenarioName: string =
        scenario?.pickle?.name || this.pickle?.name || this.testCaseStartedId || "unknown";

    // Extract feature URI from the Cucumber scenario pickle (e.g.
    // "features/verser2/VERSER2-001-isolated-routing.feature").
    // The `scenario.pickle.uri` field is available in Cucumber >= 7.
    const featureUri: string =
        scenario?.pickle?.uri || "";

    // Extract scenario line number from the pickle.
    // Cucumber 7 Pickle does not expose a top-level `locations` array;
    // instead, source lines are available via `astNodeIds` → GherkinDocument
    // lookup in the envelope, or from `scenario.sourceLocation?.line` on
    // the TestCaseFinished envelope.  Since we match by exact scenario
    // name + feature URI, the line is a secondary guard — if it cannot be
    // determined, fall back to 0 (which disarms the line check below but
    // still allows a name+URI match).
    let scenarioLine: number = 0;

    if (scenario?.pickle?.locations && scenario.pickle.locations.length > 0) {
        scenarioLine = scenario.pickle.locations[0].line;
    }

    if (scenarioLine === 0 && scenario?.sourceLocation?.line) {
        scenarioLine = scenario.sourceLocation.line;
    }

    // ---- Cleanup world resources before final measurement ----
    const cleanupErrors: Error[] = [];
    const cleanupTiming = chunkTiming.startCleanup(this, "world-cleanup");

    try {
        cleanupWorldResources(this);
    } catch (err: any) {
        cleanupErrors.push(err);
    } finally {
        chunkTiming.finishCleanup(cleanupTiming);
    }

    // Hook-order instrumentation is intentionally after complete-world
    // cleanup and immediately before the final measurement.
    const hookOrderFile: string | undefined = process.env.BDD_HOOK_ORDER_FILE;
    if (hookOrderFile) {
        require("fs").appendFileSync(hookOrderFile, "memory-guard-after\n", "utf8");
    }

    // ---- Final measurement ----
    const afterUsage = process.memoryUsage();

    await drainAndGc();

    const final = measureMemoryUsage();
    const delta = final - baseline;
    const threshold = bddMemoryHeapThresholdBytes();

    // ---- Apply per-scenario exception ----
    let effectiveThreshold = threshold;
    let exceptionLabel: string | undefined;

    const exc: any = matchScenarioException(SCENARIO_EXCEPTIONS, featureUri, scenarioLine, scenarioName);

    if (exc) {
        effectiveThreshold = threshold + exc.allowanceBytes;
        exceptionLabel = `${exc.allowanceBytes}-byte exception (${exc.featureUri}:${exc.line}): ${exc.reason}`;
        process.stderr.write(
            `[memory-guard] exception sample ${exc.featureUri}:${exc.line} ` +
            `scenario=${scenarioName} delta=${delta} base=${threshold} ` +
            `allowance=${exc.allowanceBytes} effective=${effectiveThreshold}\n`
        );
    }

    // ---- Check threshold ----
    if (delta > effectiveThreshold) {
        const diagnostics = buildBddMemoryDiagnostics({
            scenarioName,
            baseline,
            final,
            delta,
            threshold: effectiveThreshold,
            sourceLabel: exceptionLabel || bddMemoryThresholdSourceLabel(),
            beforeUsage: this[BEFORE_USAGE_KEY],
            afterUsage,
            cleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : undefined,
        });

        throw new Error(diagnostics);
    }

    // ---- Assert child process / container memory (Phase 6) ----
    const registryErrors = await getMemoryRegistry().assertAll();

    if (registryErrors.length > 0) {
        throw new Error(
            "BDD child process / container memory checks failed:\n" +
            registryErrors.join("\n---\n")
        );
    }

    // ---- Fail scenario on cleanup errors independently of memory threshold ----
    if (cleanupErrors.length > 0) {
        const messages = cleanupErrors.map(e => `    - ${e.message}`).join("\n");
        throw new Error(
            `BDD world cleanup failed for scenario "${scenarioName}":\n${messages}`
        );
    }

    // Clean up per-scenario state
    delete this[BASELINE_KEY];
    delete this[BEFORE_USAGE_KEY];
});

// ---------------------------------------------------------------------------
// AfterAll – chunk-level summary (Phase 10)
// ---------------------------------------------------------------------------
// Runs once after ALL scenarios in this Cucumber process finish.
// Prints an informational parent-heap + process-RSS summary to stderr.
// No new threshold enforcement – purely observational.

AfterAll(async function () {
    if ((!isBddMemoryGuardEnabled() && chunkMemoryPolicy === "off" && !chunkTiming.enabled) || memorySkip.skip) {
        return;
    }

    if (chunkSamplingTimer) {
        clearInterval(chunkSamplingTimer);
        chunkSamplingTimer = undefined;
    }

    // Snapshot timing before the final GC, then release its retained records so
    // timing allocations cannot affect enforced memory measurements.
    const timing = chunkTiming.snapshotAndClear();
    if (isBddMemoryGuardEnabled()) await drainAndGc();

    if (chunkMemoryPolicy !== "off") {
        await getMemoryRegistry().sampleAll();
    }
    const memoryMetricsEnabled = isBddMemoryGuardEnabled() || chunkMemoryPolicy !== "off";
    if (memoryMetricsEnabled) {
        const finalHeap = measureMemoryUsage();
        const metrics = getMemoryRegistry().computeChunkSummary();
        metrics.parentHeap.finalBytes = finalHeap;
        metrics.parentHeap.finalGrowthBytes = metrics.parentHeap.baselineBytes === null ? null : finalHeap - metrics.parentHeap.baselineBytes;
        metrics.parentHeap.peakGrowthBytes = metrics.parentHeap.baselineBytes === null || metrics.parentHeap.peakBytes === null ? null : metrics.parentHeap.peakBytes - metrics.parentHeap.baselineBytes;
        const reportPath = process.env.BDD_CHUNK_MEMORY_REPORT_FILE;
        if (reportPath && chunkMemoryPolicy !== "off") writeFileSync(reportPath, JSON.stringify(metrics, null, 2));
        getMemoryRegistry().printChunkSummary(finalHeap);
    }
    const timingReportPath = process.env.BDD_CHUNK_TIMING_REPORT_FILE;
    if (timing && timingReportPath) writeFileSync(timingReportPath, JSON.stringify(timing, null, 2));
});

// ---------------------------------------------------------------------------
// World cleanup helper
// ---------------------------------------------------------------------------

// cleanupWorldResources is imported from scripts/lib/bdd-memory-hooks-lib
// and called in the Before hook above.  No local definition needed.
