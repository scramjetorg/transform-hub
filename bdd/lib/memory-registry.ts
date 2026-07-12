/**
 * @file bdd/lib/memory-registry.ts
 *
 * BDD child process and Docker container memory registry for Phase 6 memory
 * checks.
 *
 * Provides:
 *   - getProcessRssBytes(pid)          – safe RSS sampling via /proc/<pid>/status
 *   - getDockerContainerWorkingSetBytes(containerId) – Dockerode or docker stats
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
import { execSync } from "child_process";
import * as http from "http";
import type { ChildProcess } from "child_process";

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
    /**
     * RSS baseline captured when the process signals it is ready
     * (e.g. "Host running!" for the hub).  Set via `recordProcessReady()`.
     */
    readyBaselineRss: number | null;
}

export interface TrackedContainer {
    containerId: string;
    label: string;
    /** Baseline working set in bytes, set when trackContainer is called */
    baselineBytes: number | null;
    /** Whether this container is expected to exit (short-lived) */
    expectExit: boolean;
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
 * socket (preferred) or falling back to `docker stats --no-stream`.
 *
 * Working set = `memory_stats.usage - memory_stats.stats.inactive_file`
 * (or `total_inactive_file` if `inactive_file` is not present).
 * When cache fields are unavailable, falls back to raw usage with a note.
 *
 * Returns bytes, or null when Docker is unavailable or the container is missing.
 *
 * @param containerId  Docker container ID or name.
 * @returns            Working-set bytes, or null on failure.
 */
export async function getDockerContainerWorkingSetBytes(
    containerId: string
): Promise<number | null> {
    if (!containerId) {
        return null;
    }

    const rawStats = await getDockerContainerStatsViaSocket(containerId);

    if (rawStats?.memory_stats) {
        const workingSet = dockerWorkingSetFromStats(rawStats.memory_stats);

        if (workingSet !== null) {
            return workingSet;
        }
    }

    // Fallback: use docker stats CLI.
    return getDockerContainerWorkingSetBytesSyncCli(containerId);
}

function getDockerContainerStatsViaSocket(containerId: string): Promise<Record<string, any> | null> {
    return new Promise(resolve => {
        const req = http.request({
            socketPath: "/var/run/docker.sock",
            path: `/containers/${encodeURIComponent(containerId)}/stats?stream=false`,
            method: "GET",
            timeout: 10000
        }, res => {
            let body = "";

            res.setEncoding("utf8");
            res.on("data", chunk => {
                body += chunk;
            });
            res.on("end", () => {
                if ((res.statusCode ?? 500) >= 400 || !body) {
                    resolve(null);
                    return;
                }

                try {
                    resolve(JSON.parse(body));
                } catch {
                    resolve(null);
                }
            });
        });

        req.on("timeout", () => {
            req.destroy();
            resolve(null);
        });
        req.on("error", () => resolve(null));
        req.end();
    });
}

function dockerWorkingSetFromStats(memoryStats: Record<string, any>): number | null {
    const usage = memoryStats.usage;

    if (typeof usage !== "number") {
        return null;
    }

    const statsBlock = memoryStats.stats as Record<string, unknown> | undefined;
    const inactiveFile = statsBlock
        ? (typeof statsBlock.inactive_file === "number" ? statsBlock.inactive_file : 0)
            || (typeof statsBlock.total_inactive_file === "number" ? statsBlock.total_inactive_file : 0)
        : 0;

    return Math.max(0, usage - inactiveFile);
}

/**
 * Fallback working-set helper using `docker stats --no-stream --format json`.
 *
 * Returns the raw memory usage (not working set) because the default CLI stats
 * format does not expose cache/inactive_file breakdown.  The caller should
 * consider raising the threshold to account for page cache.
 *
 * @param containerId  Docker container ID or name.
 * @returns            Raw memory usage in bytes, or null on failure.
 */
function getDockerContainerWorkingSetBytesSyncCli(containerId: string): number | null {
    try {
        const stdout = execSync(
            `docker stats --no-stream --format json "${containerId}"`,
            { encoding: "utf8", timeout: 10000, stdio: ["ignore", "pipe", "pipe"] }
        ).trim();

        if (!stdout) {
            return null;
        }

        const stats = JSON.parse(stdout) as Record<string, unknown>;

        // --format json gives human-readable fields; try to extract raw bytes.
        let usageBytes: number | null = null;

        // Try numeric usage field (when formatted via custom Go template).
        if (typeof stats.usage === "number") {
            usageBytes = stats.usage as number;
        } else if (typeof stats.usage === "string") {
            usageBytes = parseDockerMemoryString(stats.usage as string);
        }

        // Fall back to MemUsage field ("11.55MiB / 1GiB").
        if (usageBytes === null && typeof stats.MemUsage === "string") {
            const memParts = (stats.MemUsage as string).split("/");
            if (memParts.length >= 1) {
                usageBytes = parseDockerMemoryString(memParts[0].trim());
            }
        }

        // Fall back to MemTotal / MemPerc calculation.
        if (usageBytes === null && typeof stats.MemTotal === "number") {
            const memTotal = stats.MemTotal as number;
            const memPercStr = stats.MemPerc as string | undefined;

            if (memPercStr && memTotal > 0) {
                const memPerc = parseFloat(memPercStr.replace("%", ""));
                if (Number.isFinite(memPerc)) {
                    usageBytes = Math.round((memPerc / 100) * memTotal);
                }
            }
        }

        // NOTE: This is RAW USAGE, not working set, because the Docker CLI
        // stats JSON does not expose inactive_file/total_inactive_file.
        // The threshold (SCRAMJET_BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES)
        // should be adjusted if this fallback path is taken.
        return usageBytes;
    } catch {
        return null;
    }
}

/**
 * Parse a Docker memory string like "11.55MiB" or "1.234GiB" to bytes.
 *
 * @param str  Memory string (e.g. "11.55MiB", "1GiB", "123.4KiB").
 * @returns    Bytes, or null if unparseable.
 */
function parseDockerMemoryString(str: string): number | null {
    const trimmed = str.trim().replace(/\s/g, "");
    const match = trimmed.match(/^([\d.]+)([kKMGT]i?B?|B)?$/);

    if (!match) {
        return null;
    }

    const value = parseFloat(match[1]);

    if (!Number.isFinite(value)) {
        return null;
    }

    const suffix = (match[2] || "B").toUpperCase();

    switch (suffix) {
        case "B":
            return value;
        case "KIB":
        case "KB":
        case "K":
            return value * 1024;
        case "MIB":
        case "MB":
        case "M":
            return value * 1024 * 1024;
        case "GIB":
        case "GB":
        case "G":
            return value * 1024 * 1024 * 1024;
        case "TIB":
        case "TB":
        case "T":
            return value * 1024 * 1024 * 1024 * 1024;
        default:
            return value;
    }
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
    expectExit: boolean;
}

/**
 * Structured chunk-level memory metrics.
 *
 * Printed by MemoryRegistry.printChunkSummary() at the end of a chunk run
 * (Cucumber AfterAll hook).  Does NOT drive threshold enforcement – that
 * remains the domain of assertAll().
 */
export interface ChunkMetrics {
    parentHeap: {
        /** heapUsed + external + arrayBuffers after GC, first scenario Before. */
        baselineBytes: number | null;
        /** Highest per-scenario post-GC measurement. */
        peakBytes: number | null;
        /** Measurement taken at AfterAll (after final GC drain). */
        finalBytes: number | null;
        /** finalBytes − baselineBytes (null if either unavailable). */
        delta: number | null;
        /** Number of per-scenario samples taken. */
        sampleCount: number;
    };
    processes: ChunkProcessEntry[];
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

class MemoryRegistry {
    private processes = new Map<number, TrackedProcess>();
    private containers = new Map<string, TrackedContainer>();
    private options: MemoryRegistryOptions;

    // ---- Chunk-level metrics (Phase 10) ----

    /** First per-scenario post-GC parent-heap measurement (set by first Before hook). */
    private chunkHeapBaseline: number | null = null;

    /** Highest per-scenario post-GC parent-heap measurement. */
    private chunkHeapPeak: number | null = null;

    /** Number of per-scenario heap samples recorded. */
    private chunkHeapSampleCount: number = 0;

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

        child.once("exit", () => {
            this.untrackProcess(child.pid!);
        });
    }

    /**
     * Remove a process from tracking.
     *
     * @param pid  Process ID to remove.
     */
    untrackProcess(pid: number): void {
        this.processes.delete(pid);
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

                // Successfully gone — remove from tracking.
                this.untrackProcess(pid);
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
        const processes: ChunkProcessEntry[] = [];

        for (const [, tracked] of this.processes) {
            const finalRss = getProcessRssBytesSync(tracked.pid);

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

            processes.push({
                label: tracked.label,
                pid: tracked.pid,
                baselineRss: tracked.baselineRss,
                readyBaselineRss: tracked.readyBaselineRss,
                peakRss: peakForEntry,
                finalRss: finalForEntry,
                deltaFromBaseline,
                deltaFromReady,
                expectExit: tracked.expectExit,
            });
        }

        return {
            parentHeap: {
                baselineBytes: this.chunkHeapBaseline,
                peakBytes: this.chunkHeapPeak,
                finalBytes: null, // caller fills this in
                delta: null,
                sampleCount: this.chunkHeapSampleCount,
            },
            processes,
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
                lines.push(`      Status:          ${status}`);
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
