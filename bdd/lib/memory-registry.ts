/**
 * @file bdd/lib/memory-registry.ts
 *
 * BDD child process and Docker container memory registry for Phase 6 memory
 * checks.
 *
 * Provides:
 *   - getProcessRssBytes(pid)          – safe RSS sampling via /proc/<pid>/status
 *   - getDockerContainerWorkingSetBytes(containerId) – Docker Engine stats API
 *   - MemoryRegistry singleton          – track PIDs, ChildProcesses, and
 *                                         containerIds; record baselines;
 *                                         assert deltas against thresholds
 *
 * Usage (in host-utils.ts, step definitions, and memory-hooks.ts):
 *
 *   import { memoryRegistry } from "../lib/memory-registry";
 *
 *   // Track a ChildProcess with auto-untrack on exit
 *   memoryRegistry.trackChildProcess(childProcess, "hub");
 *
 *   // Track an observable PID (short-lived, expected to exit)
 *   memoryRegistry.trackProcess(pid, "runner:process", true);
 *
 *   // Track a Docker container by ID (short-lived, expected to exit)
 *   memoryRegistry.trackContainer(containerId, "runner:docker", true);
 *
 *   // In After hook: assert all tracked resources
 *   await memoryRegistry.assertAll();
 *
 * Environment variables (from bdd-options.js):
 *   SCRAMJET_BDD_PROCESS_RSS_THRESHOLD_BYTES  (default 104857600)
 *   SCRAMJET_BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES (default 104857600)
 */

import { readFile } from "fs/promises";
import { writeFileSync } from "fs";
import type { ChildProcess } from "child_process";

const { requestDockerStats } = require("../../scripts/lib/docker-memory.js");
const { readCgroupWorkingSetBytes } = require("../../scripts/lib/cgroup-memory.js");

function parseJsonEnv<T>(name: string, fallback: T): T {
    const raw = process.env[name];
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of poll attempts when waiting for an expected-exit resource. */
const EXPECTED_EXIT_POLL_ATTEMPTS = 3;

/** Delay between poll attempts in ms. */
const EXPECTED_EXIT_POLL_DELAY_MS = 100;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrackedProcess {
    pid: number;
    label: string;
    /** Baseline RSS in bytes, set when trackProcess is called */
    baselineRss: number | null;
    /** Whether this process is expected to exit (short-lived) */
    expectExit: boolean;
    /** Peak RSS in bytes observed during tracking (initialised to baseline). */
    peakRss: number | null;
    /** Most recent live RSS sample. */
    finalRss: number | null;
    /**
     * RSS baseline captured when the process signals it is ready
     * (e.g. "Host running!" for the hub).  Set via `recordProcessReady()`.
     */
    readyBaselineRss: number | null;
    exitedAt?: string;
    exitCode?: number | null;
    exitSignal?: NodeJS.Signals | null;
}

export interface TrackedContainer {
    containerId: string;
    label: string;
    /** Baseline working set in bytes, set when trackContainer is called */
    baselineBytes: number | null;
    /** Whether this container is expected to exit (short-lived) */
    expectExit: boolean;
    peakBytes: number | null;
    finalBytes: number | null;
    sampleCount: number;
}

export interface MemoryRegistryOptions {
    processRssThresholdBytes: () => number;
    dockerWorkingSetThresholdBytes: () => number;
    buildProcessRssDiagnostics: (opts: {
        label: string;
        pid: number;
        baselineRss: number;
        finalRss: number;
        delta: number;
        threshold: number;
        /** Human-readable label for the RSS baseline source ("ready" or "spawn"). */
        baselineSource?: string;
    }) => string;
    buildDockerWorkingSetDiagnostics: (opts: {
        label: string;
        containerId: string;
        baselineBytes: number;
        finalBytes: number;
        delta: number;
        threshold: number;
    }) => string;
}

// ---------------------------------------------------------------------------
// RSS helper
// ---------------------------------------------------------------------------

/**
 * Read the RSS of a process from /proc/<pid>/status VmRSS line.
 *
 * Returns the value in bytes, or null if the process does not exist or the
 * file cannot be read.
 *
 * @param pid  Process ID.
 * @returns    RSS in bytes, or null on failure.
 */
export async function getProcessRssBytes(pid: number): Promise<number | null> {
    try {
        const statusPath = `/proc/${pid}/status`;
        const content = await readFile(statusPath, "utf8");
        const match = content.match(/^VmRSS:\s+(\d+)\s+kB$/m);

        if (match) {
            // VmRSS is in kB; convert to bytes
            return parseInt(match[1], 10) * 1024;
        }

        return null;
    } catch {
        // Process doesn't exist or /proc unavailable
        return null;
    }
}

/**
 * Synchronous version of getProcessRssBytes for use in non-async contexts.
 *
 * @param pid  Process ID.
 * @returns    RSS in bytes, or null on failure.
 */
export function getProcessRssBytesSync(pid: number): number | null {
    try {
        const statusPath = `/proc/${pid}/status`;
        const fs = require("fs");
        if (!fs.existsSync(statusPath)) {
            return null;
        }
        const content = fs.readFileSync(statusPath, "utf8");
        const match = content.match(/^VmRSS:\s+(\d+)\s+kB$/m);

        if (match) {
            return parseInt(match[1], 10) * 1024;
        }

        return null;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Docker working-set helper
// ---------------------------------------------------------------------------

/**
 * Read the working-set memory of a Docker container using the Docker Engine
 * stats API over the Unix socket.
 *
 * Working set = `memory_stats.usage - memory_stats.stats.inactive_file`
 * (or `total_inactive_file` if `inactive_file` is not present).
 * When cache fields are unavailable, raw usage is used.
 *
 * Returns bytes, or null when Docker is unavailable or the container is missing.
 *
 * @param containerId  Docker container ID or name.
 * @returns            Working-set bytes, or null on failure.
 */
export async function getDockerContainerWorkingSetBytes(
    containerId: string
): Promise<number | null> {
    if (!containerId) return null;
    return requestDockerStats(containerId);
}

// ---------------------------------------------------------------------------
// Poll helper
// ---------------------------------------------------------------------------

/**
 * Poll a probe function up to `attempts` times with `delayMs` between tries.
 *
 * Returns null as soon as the probe becomes inaccessible; otherwise returns
 * the last observable value after all attempts.
 */
async function pollUntilGone<T>(
    probe: () => Promise<T | null>,
    attempts: number,
    delayMs: number
): Promise<T | null> {
    let lastResult: T | null = null;

    for (let i = 0; i < attempts; i++) {
        const result = await probe();

        if (result === null || result === undefined) {
            return null;
        }

        lastResult = result;

        if (i < attempts - 1) {
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }

    return lastResult;
}

// ---------------------------------------------------------------------------
// Chunk-level metric types (Phase 10)
// ---------------------------------------------------------------------------

/**
 * Per-process entry in the chunk memory summary.
 * Derived from the currently tracked processes at chunk completion.
 */
export interface ChunkProcessEntry {
    label: string;
    pid: number;
    /** RSS at initial trackProcess() call. */
    baselineRss: number | null;
    /** RSS when the process signalled readiness (may be null if never set). */
    readyBaselineRss: number | null;
    /** Highest RSS observed. */
    peakRss: number | null;
    /** RSS at chunk summary time (may be null if process already exited). */
    finalRss: number | null;
    /** Delta = finalRss − baselineRss (null if either unavailable). */
    deltaFromBaseline: number | null;
    /** Delta = finalRss − readyBaselineRss (null if either unavailable). */
    deltaFromReady: number | null;
    finalGrowthBytes: number | null;
    peakGrowthBytes: number | null;
    expectExit: boolean;
    lifecycle: "running" | "exited";
    exitedAt?: string;
    exitCode?: number | null;
    exitSignal?: NodeJS.Signals | null;
}

/**
 * Structured chunk-level memory metrics.
 *
 * Printed by MemoryRegistry.printChunkSummary() at the end of a chunk run
 * (Cucumber AfterAll hook).  Does NOT drive threshold enforcement – that
 * remains the domain of assertAll().
 */
export interface ChunkMetrics {
    /** Explicit feature paths associated with this owned chunk. */
    featurePaths?: string[];
    /** Explicit component telemetry contract for scheduler admission. */
    componentExpectations?: Record<string, unknown>;
    ownership?: {
        runId: string;
        chunkId: string;
        owner: string;
    };
    parentHeap: {
        /** heapUsed + external + arrayBuffers after GC, first scenario Before. */
        baselineBytes: number | null;
        /** Highest per-scenario post-GC measurement. */
        peakBytes: number | null;
        /** Measurement taken at AfterAll (after final GC drain). */
        finalBytes: number | null;
        /** finalBytes − baselineBytes (null if either unavailable). */
        delta: number | null;
        finalGrowthBytes?: number | null;
        peakGrowthBytes?: number | null;
        /** Number of per-scenario samples taken. */
        sampleCount: number;
    };
    processes: ChunkProcessEntry[];
    containers: Array<{
        label: string;
        containerId: string;
        baselineBytes: number | null;
        peakBytes: number | null;
        finalBytes: number | null;
        finalGrowthBytes: number | null;
        peakGrowthBytes: number | null;
        sampleCount: number;
    }>;
    chunkContainer: {
        readyBytes: number | null;
        finalBytes: number | null;
        peakBytes: number | null;
        readySource: string;
        finalSource: string;
        sampleCount: number;
    };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

class MemoryRegistry {
    private processes = new Map<number, TrackedProcess>();
    private exitedProcesses = new Map<number, TrackedProcess>();
    /** Completed lifecycle telemetry retained for chunk admission reporting. */
    private completedProcesses = new Map<number, TrackedProcess>();
    private containers = new Map<string, TrackedContainer>();
    private options: MemoryRegistryOptions;

    // ---- Chunk-level metrics (Phase 10) ----

    /** First per-scenario post-GC parent-heap measurement (set by first Before hook). */
    private chunkHeapBaseline: number | null = null;

    /** Highest per-scenario post-GC parent-heap measurement. */
    private chunkHeapPeak: number | null = null;

    /** Number of per-scenario heap samples recorded. */
    private chunkHeapSampleCount: number = 0;
    private chunkReady = false;
    private chunkCgroupReadyBytes: number | null = null;
    private chunkCgroupFinalBytes: number | null = null;
    private chunkCgroupPeakBytes: number | null = null;
    private chunkCgroupReadySource = "unavailable";
    private chunkCgroupFinalSource = "unavailable";
    private chunkCgroupSampleCount = 0;

    constructor(options?: Partial<MemoryRegistryOptions>) {
        // Lazy-require bdd-options to avoid circular deps at import time.
        const opts = require("../../scripts/lib/bdd-options.js");

        this.options = {
            processRssThresholdBytes: opts.bddProcessRssThresholdBytes,
            dockerWorkingSetThresholdBytes: opts.bddDockerWorkingSetThresholdBytes,
            buildProcessRssDiagnostics: opts.buildProcessRssDiagnostics,
            buildDockerWorkingSetDiagnostics: opts.buildDockerWorkingSetDiagnostics,
            ...options,
        };
    }

    // -----------------------------------------------------------------------
    // Process tracking
    // -----------------------------------------------------------------------

    /**
     * Track a process by PID.
     *
     * Records a baseline RSS snapshot immediately.
     *
     * @param pid         Process ID.
     * @param label       Human-readable label (e.g. "hub", "runner:process").
     * @param expectExit  If true, the process is expected to exit before
     *                    assertAll() runs.  assertAll() will poll briefly and
     *                    fail if it is still alive.
     */
    trackProcess(pid: number, label: string, expectExit = false): void {
        if (this.processes.has(pid)) {
            return; // Already tracked
        }

        const baselineRss = getProcessRssBytesSync(pid);

        this.processes.set(pid, {
            pid,
            label,
            baselineRss,
            peakRss: baselineRss, // Initialised to the same value as baseline
            finalRss: null,
            readyBaselineRss: null,
            expectExit,
        });
    }

    /**
     * Track a ChildProcess with auto-untrack on exit.
     *
     * Records baseline RSS.  Listens for the "exit" event to auto-remove the
     * process from tracking (for short-lived processes expected to exit).
     *
     * @param child       Node.js ChildProcess.
     * @param label       Human-readable label (e.g. "hub", "manager").
     * @param expectExit  Whether the process is expected to exit.  Passed
     *                    through to trackProcess(); defaults to false because
     *                    many BDD ChildProcesses are suite-level resources.
     */
    trackChildProcess(child: ChildProcess, label: string, expectExit = false): void {
        if (!child.pid) {
            return;
        }

        this.trackProcess(child.pid, label, expectExit);

        child.once("exit", (code, signal) => {
            this.recordProcessExit(child.pid!, code, signal);
        });
    }

    private recordProcessExit(pid: number, code: number | null, signal: NodeJS.Signals | null): void {
        const tracked = this.processes.get(pid);
        if (!tracked) return;
        tracked.exitedAt = new Date().toISOString();
        tracked.exitCode = code;
        tracked.exitSignal = signal;
        const finalRss = getProcessRssBytesSync(pid);
        if (finalRss !== null) {
            tracked.finalRss = finalRss;
            tracked.peakRss = tracked.peakRss === null ? finalRss : Math.max(tracked.peakRss, finalRss);
        } else if (tracked.finalRss === null) {
            // The process has disappeared from /proc. Preserve the last
            // observed RSS as the lifecycle final snapshot rather than
            // discarding the only usable evidence at exit.
            tracked.finalRss = tracked.peakRss;
        }
        if (!tracked.expectExit) this.exitedProcesses.set(pid, { ...tracked });
        this.completedProcesses.set(pid, { ...tracked });
        this.processes.delete(pid);
    }

    /**
     * Remove a process from tracking.
     *
     * @param pid  Process ID to remove.
     */
    untrackProcess(pid: number): void {
        this.processes.delete(pid);
    }

    /**
     * Mark tracked processes by PID as expected to exit.
     *
     * Called **before** `cleanupWorldResources` kills world-owned
     * ChildProcesses.  When a marked process exits, `recordProcessExit`
     * removes it from tracking without retaining it in `exitedProcesses`,
     * preventing the Oracle blocker where a cleanup-killed long-lived
     * process appears as a spontaneous unexpected exit.
     *
     * PIDs that are not currently being tracked are silently ignored.
     *
     * @param pids  Process IDs to mark as expected to exit.
     */
    markProcessesAsExpectedToExit(pids: number[]): void {
        for (const pid of pids) {
            const tracked = this.processes.get(pid);
            if (tracked) {
                tracked.expectExit = true;
            }
        }
    }

    /** Mark explicitly scenario-owned containers immediately before stopping them. */
    markContainersAsExpectedToExit(containerIds: string[]): void {
        for (const containerId of containerIds) {
            const tracked = this.containers.get(containerId);
            if (tracked) tracked.expectExit = true;
        }
    }

    // -----------------------------------------------------------------------
    // Container tracking
    // -----------------------------------------------------------------------

    /**
     * Track a Docker container by ID.
     *
     * Records a baseline working-set snapshot immediately.
     *
     * @param containerId  Docker container ID.
     * @param label        Human-readable label (e.g. "runner:docker").
     * @param expectExit   If true, the container is expected to exit before
     *                     assertAll() runs.  assertAll() will poll briefly and
     *                     fail if it is still accessible.
     */
    trackContainer(containerId: string, label: string, expectExit = false): void {
        if (this.containers.has(containerId)) {
            return; // Already tracked
        }

        this.containers.set(containerId, {
            containerId,
            label,
            baselineBytes: null, // Recorded lazily on first assertAll() call
            expectExit,
            peakBytes: null,
            finalBytes: null,
            sampleCount: 0,
        });
    }

    /**
     * Remove a container from tracking.
     *
     * @param containerId  Container ID to remove.
     */
    untrackContainer(containerId: string): void {
        this.containers.delete(containerId);
    }

    // -----------------------------------------------------------------------
    // Chunk-level metrics (Phase 10)
    // -----------------------------------------------------------------------

    /**
     * Record a parent-Cucumber-process heap sample for chunk-level tracking.
     *
     * Called from memory-hooks.ts Before/After hooks on each scenario.
     * The first call establishes the baseline; subsequent calls update the
     * running peak.
     *
     * @param bytes  `heapUsed + external + arrayBuffers` after GC (units match
     *               `measureMemoryUsage()`).
     */
    recordChunkHeapSample(bytes: number): void {
        this.chunkHeapSampleCount++;

        if (this.chunkHeapBaseline === null) {
            this.chunkHeapBaseline = bytes;
        }

        if (this.chunkHeapPeak === null || bytes > this.chunkHeapPeak) {
            this.chunkHeapPeak = bytes;
        }

        // BeforeAll may start the Hub before the memory hook's first Before
        // runs. Retry readiness here so the parent baseline and process
        // readiness are both established before emitting the marker.
        if ([...this.processes.values()].some(process => !process.expectExit && process.readyBaselineRss !== null)) {
            this.markChunkReady("parent-baseline-and-process-ready");
        }
        if (!this.chunkReady) this.markChunkReady("parent-baseline");
    }

    markChunkReady(source = "long-lived-process-ready"): boolean {
        if (this.chunkHeapBaseline === null || this.chunkReady) return this.chunkReady;
        this.chunkReady = true;
        const cgroup = readCgroupWorkingSetBytes();
        this.chunkCgroupReadyBytes = cgroup.bytes;
        this.chunkCgroupPeakBytes = cgroup.bytes;
        this.chunkCgroupReadySource = cgroup.source;
        if (cgroup.bytes !== null) this.chunkCgroupSampleCount = 1;
        const reportPath = process.env.BDD_CHUNK_MEMORY_READY_FILE;
        if (reportPath) {
            const temporaryPath = `${reportPath}.${process.pid}.tmp`;
            writeFileSync(temporaryPath, JSON.stringify({
                ready: true,
                source,
                parentBaselineBytes: this.chunkHeapBaseline,
                containerReadyBytes: cgroup.bytes,
                containerReadySource: cgroup.source,
                at: new Date().toISOString(),
            }));
            require("fs").renameSync(temporaryPath, reportPath);
        }
        return true;
    }

    /**
     * Readiness-aware baseline for a tracked process.
     *
     * Call this when a tracked ChildProcess signals readiness (e.g. the hub
     * prints "Host running!").  The current RSS is captured as the "ready"
     * baseline, giving the chunk summary a more meaningful reference point
     * than the initial spawn-time baseline.
     *
     * No-op if the PID is not tracked.
     *
     * @param pid  Process ID to record readiness for.
     */
    recordProcessReady(pid: number): void {
        const tracked = this.processes.get(pid);

        if (!tracked) {
            return;
        }

        tracked.readyBaselineRss = getProcessRssBytesSync(pid);
        if (!tracked.expectExit) this.markChunkReady(`process-ready:${tracked.label}`);
    }

    /** Capture one live sample for every tracked process and container. */
    async sampleAll(): Promise<void> {
        if (this.chunkReady) {
            const cgroup = readCgroupWorkingSetBytes();
            if (cgroup.bytes !== null) {
                this.chunkCgroupFinalBytes = cgroup.bytes;
                this.chunkCgroupPeakBytes = this.chunkCgroupPeakBytes === null ? cgroup.bytes : Math.max(this.chunkCgroupPeakBytes, cgroup.bytes);
                this.chunkCgroupFinalSource = cgroup.source;
                this.chunkCgroupSampleCount++;
            }
        }
        for (const tracked of this.processes.values()) {
            const rss = await getProcessRssBytes(tracked.pid);
            if (rss !== null) {
                tracked.peakRss = tracked.peakRss === null ? rss : Math.max(tracked.peakRss, rss);
                tracked.finalRss = rss;
            }
        }

        for (const tracked of this.containers.values()) {
            const bytes = await getDockerContainerWorkingSetBytes(tracked.containerId);
            if (bytes !== null) {
                if (tracked.baselineBytes === null) tracked.baselineBytes = bytes;
                tracked.finalBytes = bytes;
                tracked.peakBytes = tracked.peakBytes === null ? bytes : Math.max(tracked.peakBytes, bytes);
                tracked.sampleCount++;
            }
        }
    }

    // -----------------------------------------------------------------------
    // Process-exit reconciliation
    // -----------------------------------------------------------------------

    /**
     * Drain pending ChildProcess exit events before the assertion phase.
     *
     * ScenarioLifecycle may kill tracked ChildProcesses.  The OS terminates
     * the child and makes its PID
     * inaccessible from `/proc/<pid>`, but the JS `exit` event (and the
     * `recordProcessExit` listener registered by `trackChildProcess`) may
     * not have fired yet when `assertAll()` runs.  Without reconciliation,
     * a long-lived process that was intentionally killed during cleanup
     * would appear to `assertAll()` as still tracked with an inaccessible
     * PID, incorrectly producing:
     *
     *   "Tracked process … is no longer accessible but was not expected
     *    to exit."
     *
     * **Protocol** (caller must follow this ordering, implemented in
     * `memory-hooks.ts`):
     *
     *   1. Call `markProcessesAsExpectedToExit()` with the PIDs of every
     *      world-owned ChildProcess that `cleanupWorldResources` will kill.
     *   2. Call the scenario lifecycle cleanup (which marks immediately
     *      before signalling).
     *   3. Call `drainExitEvents()` to let pending exit listeners fire.
     *   4. Call `assertAll()` — it will check that no non-expected entries
     *      remain in `exitedProcesses`.
     *
     * Without step 1, a cleanup-killed process would move to
     * `exitedProcesses` (because `expectExit = false` by default) and
     * then `assertAll()` would report it as a spontaneous unexpected exit.
     *
     * The drain is bounded: 5 × setImmediate rounds (~0-5 ms total).  It
     * does **not** modify any tracking state, reorder heap measurements,
     * or silence genuine unexpected-exit detection.
     */
    async drainExitEvents(): Promise<void> {
        for (let i = 0; i < 5; i++) {
            await new Promise<void>((resolve) => setImmediate(resolve));
        }
    }

    // -----------------------------------------------------------------------
    // Assertion
    // -----------------------------------------------------------------------

    /**
     * Assert all tracked processes and containers against their configured
     * thresholds.
     *
     * For resources expected to exit:
     *   - Poll briefly (3 × 100ms).  If still accessible, produce a
     *     diagnostic failure independent of RSS/working-set delta.
     *   - If no longer accessible, remove from tracking (auto-cleanup).
     *
     * For resources NOT expected to exit:
     *   - Compare current RSS/working-set delta to the configured threshold.
     *   - If the resource is no longer accessible, produce a diagnostic
     *     failure (it should still be alive).
     *
     * @returns  Array of error messages (empty if all pass).
     */
    async assertAll(): Promise<string[]> {
        const errors: string[] = [];

        // ---- Check processes ----
        for (const [pid, tracked] of this.processes) {
            if (tracked.expectExit) {
                // Expected-exit process: poll briefly, fail if still alive.
                const finalRss = await pollUntilGone(
                    () => getProcessRssBytes(pid),
                    EXPECTED_EXIT_POLL_ATTEMPTS,
                    EXPECTED_EXIT_POLL_DELAY_MS
                );

                if (finalRss !== null) {
                    // Update peak with the last observable RSS before error.
                    if (tracked.peakRss === null || finalRss > tracked.peakRss) {
                        tracked.peakRss = finalRss;
                    }

                    // Still alive — it should have exited.
                    errors.push(
                        `Tracked process "${tracked.label}" (pid ${pid}) ` +
                        `was expected to exit but is still running after ` +
                        `${EXPECTED_EXIT_POLL_ATTEMPTS} × ${EXPECTED_EXIT_POLL_DELAY_MS}ms ` +
                        `poll. Current RSS: ${finalRss} bytes.`
                    );
                    continue;
                }

                // The ChildProcess exit listener normally retained the snapshot.
                if (this.processes.has(pid)) this.recordProcessExit(pid, null, null);
                continue;
            }

            // Long-lived process: compare RSS delta.
            const finalRss = await getProcessRssBytes(pid);

            if (finalRss === null) {
                errors.push(
                    `Tracked process "${tracked.label}" (pid ${pid}) ` +
                    `is no longer accessible but was not expected to exit.`
                );
                continue;
            }

            // Update peak RSS.
            if (tracked.peakRss === null || finalRss > tracked.peakRss) {
                tracked.peakRss = finalRss;
            }

            // Pick the best available baseline for RSS comparison.
            // Prefer the readiness-aware baseline (set by recordProcessReady)
            // over the spawn-time baseline.  The spawn baseline (~176 KiB for
            // hub) is captured before the process initialises; comparing
            // against it would produce a misleadingly large delta that nearly
            // always exceeds the threshold even under normal operation.
            let effectiveBaseline: number | null;
            let baselineSource: string;

            if (tracked.readyBaselineRss !== null) {
                effectiveBaseline = tracked.readyBaselineRss;
                baselineSource = "ready";
            } else if (tracked.baselineRss !== null) {
                effectiveBaseline = tracked.baselineRss;
                baselineSource = "spawn";
            } else {
                // No baseline of any kind – record the first observable RSS
                // as the spawn baseline and defer the comparison.
                tracked.baselineRss = finalRss;
                continue;
            }

            const delta = finalRss - effectiveBaseline;
            const threshold = this.options.processRssThresholdBytes();

            if (delta > threshold) {
                errors.push(
                    this.options.buildProcessRssDiagnostics({
                        label: tracked.label,
                        pid,
                        baselineRss: effectiveBaseline,
                        finalRss,
                        delta,
                        threshold,
                        baselineSource,
                    })
                );
            }
        }

        // ---- Check exitedProcesses for spontaneous exits ----
        // A non-expected-exit process that was NOT marked via
        // markProcessesAsExpectedToExit may have exited on its own (or been
        // killed outside the marking protocol).  Such entries in
        // exitedProcesses represent spontaneous exits of long-lived
        // processes and must be reported as errors.
        for (const [pid, tracked] of this.exitedProcesses) {
            if (!tracked.expectExit) {
                errors.push(
                    `Tracked process "${tracked.label}" (pid ${pid}) ` +
                    `exited unexpectedly but was not expected to exit.`
                );
            }
        }

        // ---- Check containers ----
        for (const [containerId, tracked] of this.containers) {
            if (tracked.expectExit) {
                // Expected-exit container: poll briefly, fail if still alive.
                const finalBytes = await pollUntilGone(
                    () => getDockerContainerWorkingSetBytes(containerId),
                    EXPECTED_EXIT_POLL_ATTEMPTS,
                    EXPECTED_EXIT_POLL_DELAY_MS
                );

                if (finalBytes !== null) {
                    errors.push(
                        `Tracked container "${tracked.label}" (id ${containerId}) ` +
                        `was expected to exit but is still running after ` +
                        `${EXPECTED_EXIT_POLL_ATTEMPTS} × ${EXPECTED_EXIT_POLL_DELAY_MS}ms ` +
                        `poll. Current working set: ${finalBytes} bytes.`
                    );
                    continue;
                }

                // Successfully gone.
                this.untrackContainer(containerId);
                continue;
            }

            // Long-lived container: compare working-set delta.
            const finalBytes = await getDockerContainerWorkingSetBytes(containerId);

            if (finalBytes === null) {
                // Container no longer accessible — skip (may have been removed).
                continue;
            }

            // Record baseline if not already set.
            if (tracked.baselineBytes === null) {
                tracked.baselineBytes = finalBytes;
                continue;
            }

            const delta = finalBytes - tracked.baselineBytes;
            const threshold = this.options.dockerWorkingSetThresholdBytes();

            if (delta > threshold) {
                errors.push(
                    this.options.buildDockerWorkingSetDiagnostics({
                        label: tracked.label,
                        containerId,
                        baselineBytes: tracked.baselineBytes,
                        finalBytes,
                        delta,
                        threshold,
                    })
                );
            }
        }

        return errors;
    }

    /**
     * Clear all tracked processes and containers.
     */
    clear(): void {
        this.processes.clear();
        this.exitedProcesses.clear();
        this.completedProcesses.clear();
        this.containers.clear();
    }

    // -----------------------------------------------------------------------
    // Chunk summary (Phase 10)
    // -----------------------------------------------------------------------

    /**
     * Build a `ChunkMetrics` snapshot from the current tracking state.
     *
     * Reads the final RSS of each still-tracked process (sync) and assembles
     * the structured summary.  The caller should set `parentHeap.finalBytes`
     * afterwards from a fresh post-GC measurement.
     *
     * @returns  Populated ChunkMetrics object.
     */
    computeChunkSummary(): ChunkMetrics {
        const runId = process.env.SCRAMJET_BDD_RUN_ID;
        const chunkId = process.env.SCRAMJET_BDD_CHUNK_ID;
        const processes: ChunkProcessEntry[] = [];

        const processEntries = new Map<number, TrackedProcess>();
        for (const tracked of [...this.processes.values(), ...this.exitedProcesses.values(), ...this.completedProcesses.values()]) {
            processEntries.set(tracked.pid, tracked);
        }
        for (const tracked of processEntries.values()) {
            const finalRss = tracked.finalRss ?? getProcessRssBytesSync(tracked.pid);

            // Update peak if the final sample is higher.
            const effectivePeak = tracked.peakRss;

            if (finalRss !== null) {
                if (effectivePeak === null || finalRss > effectivePeak) {
                    tracked.peakRss = finalRss;
                }
            }

            const finalForEntry = finalRss;
            const peakForEntry = tracked.peakRss;

            const deltaFromBaseline =
                tracked.baselineRss !== null && finalForEntry !== null
                    ? finalForEntry - tracked.baselineRss
                    : null;

            const deltaFromReady =
                tracked.readyBaselineRss !== null && finalForEntry !== null
                    ? finalForEntry - tracked.readyBaselineRss
                    : null;
            const effectiveBaseline = tracked.readyBaselineRss ?? tracked.baselineRss;
            const finalGrowthBytes = effectiveBaseline !== null && finalForEntry !== null ? finalForEntry - effectiveBaseline : null;
            const peakGrowthBytes = effectiveBaseline !== null && peakForEntry !== null ? peakForEntry - effectiveBaseline : null;

            processes.push({
                label: tracked.label,
                pid: tracked.pid,
                baselineRss: tracked.baselineRss,
                readyBaselineRss: tracked.readyBaselineRss,
                peakRss: peakForEntry,
                finalRss: finalForEntry,
                deltaFromBaseline,
                deltaFromReady,
                finalGrowthBytes,
                peakGrowthBytes,
                expectExit: tracked.expectExit,
                lifecycle: tracked.exitedAt ? "exited" : "running",
                exitedAt: tracked.exitedAt,
                exitCode: tracked.exitCode,
                exitSignal: tracked.exitSignal,
            });
        }

        const containers = Array.from(this.containers.values()).map(tracked => ({
            label: tracked.label,
            containerId: tracked.containerId,
            baselineBytes: tracked.baselineBytes,
            peakBytes: tracked.peakBytes,
            finalBytes: tracked.finalBytes,
            finalGrowthBytes: tracked.baselineBytes !== null && tracked.finalBytes !== null ? tracked.finalBytes - tracked.baselineBytes : null,
            peakGrowthBytes: tracked.baselineBytes !== null && tracked.peakBytes !== null ? tracked.peakBytes - tracked.baselineBytes : null,
            sampleCount: tracked.sampleCount,
        }));

        return {
            featurePaths: parseJsonEnv<string[]>("SCRAMJET_BDD_FEATURE_PATHS", []),
            componentExpectations: parseJsonEnv<Record<string, unknown> | undefined>("SCRAMJET_BDD_EXPECTED_COMPONENTS", undefined),
            ...(runId && chunkId ? { ownership: { runId, chunkId, owner: process.env.SCRAMJET_BDD_OWNER || `${runId}/${chunkId}` } } : {}),
            parentHeap: {
                baselineBytes: this.chunkHeapBaseline,
                peakBytes: this.chunkHeapPeak,
                finalBytes: null, // caller fills this in
                delta: null,
                sampleCount: this.chunkHeapSampleCount,
            },
            processes,
            containers,
            chunkContainer: {
                readyBytes: this.chunkCgroupReadyBytes,
                finalBytes: this.chunkCgroupFinalBytes,
                peakBytes: this.chunkCgroupPeakBytes,
                readySource: this.chunkCgroupReadySource,
                finalSource: this.chunkCgroupFinalSource,
                sampleCount: this.chunkCgroupSampleCount,
            },
        };
    }

    /**
     * Print an actionable chunk-level memory summary to stderr.
     *
     * Calls `computeChunkSummary()` internally, injects the final parent-heap
     * measurement, and writes the formatted report.  This is purely
     * informational – no threshold enforcement.
     *
     * @param finalHeapBytes  Final post-GC parent-heap measurement from the
     *                        AfterAll hook (or null if unavailable).
     */
    printChunkSummary(finalHeapBytes: number | null): void {
        const metrics = this.computeChunkSummary();

        metrics.parentHeap.finalBytes = finalHeapBytes;

        if (metrics.parentHeap.baselineBytes !== null && finalHeapBytes !== null) {
            metrics.parentHeap.delta = finalHeapBytes - metrics.parentHeap.baselineBytes;
        }

        const fmt = (v: number | null | undefined): string =>
            v !== null && v !== undefined ? `${v} bytes` : "unavailable";

        const lines: string[] = [];
        if (metrics.featurePaths?.length) lines.push(`  Features:     ${metrics.featurePaths.join(", ")}`);
        if (metrics.ownership) lines.push(`  Ownership:    ${metrics.ownership.owner} (run=${metrics.ownership.runId} chunk=${metrics.ownership.chunkId})`);
        lines.push("[memory-registry] chunk memory summary:");

        // ---- Parent heap ----
        lines.push("  Parent Cucumber heap:");
        lines.push(`    Baseline:   ${fmt(metrics.parentHeap.baselineBytes)}`);
        lines.push(`    Peak:       ${fmt(metrics.parentHeap.peakBytes)}`);
        lines.push(`    Final:      ${fmt(metrics.parentHeap.finalBytes)}`);
        lines.push(`    Delta:      ${metrics.parentHeap.delta !== null ? `${metrics.parentHeap.delta >= 0 ? "+" : ""}${metrics.parentHeap.delta} bytes` : "unavailable"}`);
        lines.push(`    Samples:    ${metrics.parentHeap.sampleCount}`);

        // ---- Processes ----
        if (metrics.processes.length > 0) {
            lines.push("  Tracked processes:");

            for (const p of metrics.processes) {
                const status = p.expectExit ? "expected-exit" : "long-lived";
                lines.push(`    ${p.label} (pid ${p.pid}):`);
                lines.push(`      Status:          ${status}, ${p.lifecycle}`);
                lines.push(`      Baseline RSS:    ${fmt(p.baselineRss)}`);

                if (p.readyBaselineRss !== null) {
                    lines.push(`      Ready baseline:  ${fmt(p.readyBaselineRss)}`);
                }

                lines.push(`      Peak RSS:        ${fmt(p.peakRss)}`);
                lines.push(`      Final RSS:       ${fmt(p.finalRss)}`);

                if (p.deltaFromBaseline !== null) {
                    const sign = p.deltaFromBaseline >= 0 ? "+" : "";
                    lines.push(`      Delta (init):    ${sign}${p.deltaFromBaseline} bytes`);
                }

                if (p.deltaFromReady !== null) {
                    const sign = p.deltaFromReady >= 0 ? "+" : "";
                    lines.push(`      Delta (ready):   ${sign}${p.deltaFromReady} bytes`);
                }
            }
        } else {
            lines.push("  Tracked processes: (none)");
        }

        // Re-use stderr — the same channel as run-bdd-docker.js outer-container
        // diagnostics and the existing per-scenario guard output.
        process.stderr.write(lines.join("\n") + "\n");
    }

    /**
     * Get the number of tracked processes.
     */
    get processCount(): number {
        return this.processes.size;
    }

    /**
     * Get the number of tracked containers.
     */
    get containerCount(): number {
        return this.containers.size;
    }

    /**
     * Get a snapshot of tracked PIDs for diagnostics.
     */
    get trackedProcesses(): Map<number, TrackedProcess> {
        return new Map(this.processes);
    }

    /**
     * Get a snapshot of tracked containers for diagnostics.
     */
    get trackedContainers(): Map<string, TrackedContainer> {
        return new Map(this.containers);
    }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/**
 * Global singleton MemoryRegistry instance.
 *
 * Import this in host-utils.ts, step definitions, and memory-hooks.ts.
 */
export const memoryRegistry = new MemoryRegistry();

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export { MemoryRegistry };
