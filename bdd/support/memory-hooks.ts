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
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";

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
    cleanupScenarioWorldResources,
} from "../../scripts/lib/bdd-memory-hooks-lib";
import { parseChunkMemoryPolicy, validateEnforcePrerequisites } from "../../scripts/lib/bdd-chunk-memory-policy.js";
const { createChunkTiming, summarizeTimingEvents } = require("../../scripts/lib/bdd-chunk-timing.js");
const { MANAGER_SCENARIO_EXCEPTIONS } = require("../../scripts/lib/bdd-manager-exceptions.js");

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
    /** Exact scenario line number in the feature file (ignored when scenarioName is "*"). */
    line: number;
    /**
     * Exact scenario name (matched with ===).  When set to "*", matches any
     * scenario within the feature file (feature-level scope).
     */
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
    // This allowance is user-approved for a separately tracked Verser2
    // allocation issue.  The 1 MiB covers the observed flaky parent-heap
    // regression above the strict base and is scoped to this exact feature,
    // line, and scenario name.
    // -----------------------------------------------------------------------

    {
        featureUri: "verser2/VERSER2-001-isolated-routing.feature",
        line: 7,
        scenarioName: "Broker follows a native 308 redirect to an advertised route",
        allowanceBytes: 1_048_576,
        reason: "exact 1 MiB allowance for the separately tracked Verser2 allocation issue",
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
    // E2E-001 TC-002: completed-sequence stdio (CLI-heavy scenario)
    //
    // Ten post-agent-fix strict guarded runs form two reproducible socket
    // lifecycle bands: 679911–683479 bytes and 825407–828071 bytes. The
    // higher band is the keep-alive socket retained until deterministic client
    // disposal; this allowance is not attributed to archive preparation.
    // -----------------------------------------------------------------------
    {
        featureUri: "e2e/E2E-001-samples.feature",
        line: 4,
        scenarioName: "E2E-001 TC-002 Test stdio available after the sequence is completed",
        allowanceBytes: 331_776,
        reason: "Ten post-agent-fix strict guarded Docker runs produced two stable socket-lifecycle "
            + "bands (679911–683479 and 825407–828071 bytes). The unchanged 331776-byte exact-pickle "
            + "allowance covers the higher keep-alive socket band above the 524288-byte base; the "
            + "rationale is transport lifecycle variance and does not attribute memory to archives.",
    },

    // -----------------------------------------------------------------------
    // E2E-012 TC-001: stdin flood with event responsiveness
    //
    // Five complete guarded runs observed maxima of 1377733 bytes.
    // The smallest 4KiB allowance covering this is 856064 bytes, with
    // one additional 4KiB safety boundary (210 × 4096 = 860160).
    // -----------------------------------------------------------------------
    {
        featureUri: "e2e/E2E-012-stream-flooding-test.feature",
        line: 4,
        scenarioName: "E2E-012 TC-001 Flood stdin of Instance, do not consume it and check if Instance responds to event sent.",
        allowanceBytes: 860_160,
        reason: "Five complete guarded runs observed a maximum delta of 1377733 bytes. "
            + "Allowance is the smallest 4096-byte step (856064 bytes) covering the "
            + "maximum excess over the 524288-byte base, plus one additional 4096-byte "
            + "safety boundary (210 × 4096 = 860160), scoped to this exact feature, line, "
            + "and scenario name.",
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
            +             "Allowance is the next 4096-byte boundary (77824 bytes) "
            + "providing 2232 bytes of headroom.",
    },

    // -----------------------------------------------------------------------
    // HUB feature tests (bdd/features/hub/*)
    //
    // These scenarios start a Hub (STH) process with various CLI flags,
    // sequence loading, and instance management via HTTP API.  Each scenario
    // creates a complete Hub process with its host, topology, and API server,
    // exercises one or more behaviours, then tears down.  The Hub process is
    // tracked as a child process (RSS threshold applies separately).
    //
    // The parent-heap delta (the Cucumber Node process) reflects retained
    // allocations from hub/host lifecycle — imported module state, HTTP
    // client agent connections, STH topology internals, and the STH Python
    // runner bridge (native addon structs).  Cleanup releases world-level
    // references (outStream, instance clients, hub subprocess, response
    // buffers), but V8 may not reclaim embedder allocations made by
    // node:http agent sockets, node:child_process internals, and the
    // Python runner native bindings.
    //
    // The 1 MiB allowance is user-approved as a feature-level scoped
    // exception covering all HUB scenarios.  It applies per-pickle
    // (feature-scoped wildcard "*") so that adding or reordering scenarios
    // within these feature files does not require list maintenance.
    // -----------------------------------------------------------------------

    {
        featureUri: "hub/HUB-001-host-config.feature",
        line: 0,
        scenarioName: "*",
        allowanceBytes: 1_048_576,
        reason: "Feature-level 1 MiB allowance for HUB-001 host-config scenarios — "
            + "Hub lifecycle (HTTP agent sockets, child_process internals, "
            + "Python runner native bindings) retains embedder allocations "
            + "beyond the 524288-byte base after cleanup+GC.",
    },
    {
        featureUri: "hub/HUB-002-host-iac.feature",
        line: 0,
        scenarioName: "*",
        allowanceBytes: 1_048_576,
        reason: "Feature-level 1 MiB allowance for HUB-002 host-IaC scenarios — "
            + "Hub lifecycle with sequence/instance management retains "
            + "embedder allocations beyond the 524288-byte base.",
    },
    {
        featureUri: "hub/HUB-003-instance-api-server.feature",
        line: 0,
        scenarioName: "*",
        allowanceBytes: 1_048_576,
        reason: "Feature-level 1 MiB allowance for HUB-003 API-server scenarios — "
            + "Hub lifecycle with RPC route exposure retains embedder "
            + "allocations beyond the 524288-byte base.",
    },
    {
        featureUri: "hub/HUB-004-runtime-error-logging.feature",
        line: 0,
        scenarioName: "*",
        allowanceBytes: 1_048_576,
        reason: "Feature-level 1 MiB allowance for HUB-004 runtime-error-logging "
            + "scenarios — Hub lifecycle with runtime-error verification "
            + "retains embedder allocations beyond the 524288-byte base.",
    },
    ...MANAGER_SCENARIO_EXCEPTIONS,
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
const timingEventsPath = process.env.BDD_CHUNK_TIMING_EVENTS_FILE;

function emitTimingEvent(event: any): void {
    if (!timingEventsPath) return;
    appendFileSync(timingEventsPath, `${JSON.stringify(event)}\n`, "utf8");
}

const chunkTiming = createChunkTiming(
    ["1", "true", "yes"].includes(String(process.env.SCRAMJET_BDD_CHUNK_TIMING).toLowerCase()),
    undefined,
    {
        runId: process.env.SCRAMJET_BDD_RUN_ID,
        chunkId: process.env.SCRAMJET_BDD_CHUNK_ID,
        owner: process.env.SCRAMJET_BDD_OWNER,
    },
    { retainRecords: !timingEventsPath, emit: timingEventsPath ? emitTimingEvent : undefined },
);

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

// Loaded by timing-boundary.ts, which is required after all step definitions.
// Keeping this function exported gives that hook a boundary that also works
// when Before fails or a scenario has no steps.
export function beginCleanupTiming(world: any): void {
    if (!world || world.__chunkTimingCleanup !== undefined) return;
    world.__chunkTimingCleanup = chunkTiming.startCleanup(world, "feature-after+world-cleanup");
}

// ---------------------------------------------------------------------------
// After – measure and fail if threshold exceeded
// ---------------------------------------------------------------------------

// This support hook is registered before step-definition hooks, so Cucumber's
// reverse After-hook ordering runs it after feature After hooks. It is the
// final scenario boundary: complete cleanup and scenario timing are finished
// before strict memory measurement/GC begins.
After(async function (this: any, scenario: any) {
    const cleanupErrors: Error[] = [];
    try {
        // Scenario-owned resources are always cleaned up, including skipped
        // guards and scenarios without a memory baseline.
        await cleanupScenarioWorldResources(this, this.scenarioLifecycle);
    } catch (err: any) {
        cleanupErrors.push(err);
    } finally {
        chunkTiming.finishCleanup(this.__chunkTimingCleanup);
        delete this.__chunkTimingCleanup;
        chunkTiming.finishScenario(this, {
            name: scenario?.pickle?.name,
            uri: scenario?.pickle?.uri,
            status: scenario?.result?.status,
        });
    }

    const baseline: number | undefined = this[BASELINE_KEY];

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

    if (!isBddMemoryGuardEnabled() || memorySkip.skip || baseline === undefined) {
        if (cleanupErrors.length > 0) {
            throw new Error(`BDD world cleanup failed: ${cleanupErrors.map(e => e.message).join("; ")}`);
        }
        return;
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

    const failures: Error[] = [...cleanupErrors];

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

        failures.push(new Error(diagnostics));
    }

    // ---- Reconcile pending ChildProcess exits before asserting ----
    // ScenarioLifecycle may have killed tracked ChildProcesses before
    // their JS 'exit' events had a chance to fire.  Drain the event loop
    // so that any pending exit listeners are processed; otherwise assertAll
    // may see a long-lived process that was intentionally killed as still
    // tracked but with an inaccessible PID, producing a spurious failure.
    await getMemoryRegistry().drainExitEvents();

    // ---- Assert child process / container memory (Phase 6) ----
    const registryErrors = await getMemoryRegistry().assertAll();

    if (registryErrors.length > 0) {
        failures.push(new Error(
            "BDD child process / container memory checks failed:\n" +
            registryErrors.join("\n---\n")
        ));
    }

    if (failures.length > 0) {
        throw new Error(
            `BDD scenario "${scenarioName}" collected ${failures.length} failure(s):\n` +
            failures.map((failure, index) => `--- failure ${index + 1} ---\n${failure.message}`).join("\n")
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

    // Timing records are emitted as JSONL at each completed boundary. This
    // avoids retaining record objects in the Cucumber heap across scenarios.
    let timing = chunkTiming.snapshotAndClear();
    if (timingEventsPath && existsSync(timingEventsPath)) {
        const events = readFileSync(timingEventsPath, "utf8")
            .split("\n")
            .filter(Boolean)
            .map(line => JSON.parse(line));
        timing = summarizeTimingEvents(events);
    }
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
