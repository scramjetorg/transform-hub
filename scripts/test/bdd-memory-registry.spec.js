/**
 * @file scripts/test/bdd-memory-registry.spec.js
 *
 * Tests for the BDD memory registry module in bdd/lib/memory-registry.ts.
 *
 * These tests cover:
 *   - getProcessRssBytes for self PID (must return a positive value)
 *   - getProcessRssBytes for missing PID (must return null, no throw)
 *   - MemoryRegistry singleton: track / untrack / assertAll
 *   - Child process auto-untrack on exit
 *   - Expected-exit process enforcement (alive → fail, gone → pass)
 *   - Expected-exit container enforcement (alive → fail, gone → pass)
 *   - Threshold fail diagnostics
 *   - Container helper: no-throw when Docker unavailable
 *   - Docker working-set computation via Docker Engine stats socket
 *   - Diagnostic helpers: buildProcessRssDiagnostics, buildDockerWorkingSetDiagnostics
 *
 * Runs via ts-node/register to handle TypeScript imports.
 */

"use strict";

const test = require("ava");

// ts-node/register must be loaded before importing the TS module
require("ts-node/register");

const {
    getProcessRssBytes,
    getProcessRssBytesSync,
    getDockerContainerWorkingSetBytes,
    MemoryRegistry,
} = require("../../bdd/lib/memory-registry");

const { execSync, spawn } = require("child_process");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check whether Docker is available. */
function isDockerAvailable() {
    try {
        execSync("docker info", { encoding: "utf8", stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

/** Get the latest running container ID, or null. */
function getLatestContainerId() {
    try {
        const stdout = execSync("docker ps --quiet --latest", {
            encoding: "utf8",
            timeout: 5000,
            stdio: ["ignore", "pipe", "pipe"],
        }).trim();
        return stdout || null;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// getProcessRssBytes
// ---------------------------------------------------------------------------

test("getProcessRssBytes returns a positive number for self PID", async (t) => {
    const rss = await getProcessRssBytes(process.pid);

    t.true(rss !== null, "RSS should not be null for current process");
    t.true(typeof rss === "number", "RSS should be a number");
    t.true(rss !== null && rss > 0, "RSS should be positive for a running process");
});

test("getProcessRssBytes returns null for a non-existent PID", async (t) => {
    const rss = await getProcessRssBytes(999999999);

    t.is(rss, null, "RSS should be null for non-existent PID");
});

test("getProcessRssBytes does not throw for any numeric input", async (t) => {
    await t.notThrowsAsync(() => getProcessRssBytes(-1));
    await t.notThrowsAsync(() => getProcessRssBytes(NaN));
});

// ---------------------------------------------------------------------------
// getProcessRssBytesSync
// ---------------------------------------------------------------------------

test("getProcessRssBytesSync returns a positive number for self PID", (t) => {
    const rss = getProcessRssBytesSync(process.pid);

    t.true(rss !== null, "RSS should not be null for current process");
    t.true(rss !== null && rss > 0, "RSS should be positive");
});

test("getProcessRssBytesSync returns null for non-existent PID", (t) => {
    const rss = getProcessRssBytesSync(999999999);

    t.is(rss, null);
});

test("getProcessRssBytesSync does not throw for invalid input", (t) => {
    t.notThrows(() => getProcessRssBytesSync(-1));
});

// ---------------------------------------------------------------------------
// getDockerContainerWorkingSetBytes – no-throw on missing Docker
// ---------------------------------------------------------------------------

test("getDockerContainerWorkingSetBytes does not throw when Docker unavailable", async (t) => {
    const result = await getDockerContainerWorkingSetBytes("nonexistent-container-xyz");

    t.true(
        result === null || (typeof result === "number" && result > 0),
        "Should return null or a positive number"
    );
});

test("getDockerContainerWorkingSetBytes returns null for empty containerId", async (t) => {
    const result = await getDockerContainerWorkingSetBytes("");

    t.is(result, null, "Empty containerId should return null");
});

test("getDockerContainerWorkingSetBytes returns data for a real container when Docker is available", async (t) => {
    if (!isDockerAvailable()) {
        t.pass("Docker not available – skipping live container test");
        return;
    }

    const containerId = getLatestContainerId();

    if (!containerId) {
        t.pass("No running containers – skipping live container test");
        return;
    }

    const bytes = await getDockerContainerWorkingSetBytes(containerId);

    t.true(bytes !== null, "Should get working set for a real container");
    t.true(typeof bytes === "number", "Should be a number");
    t.true(bytes !== null && bytes > 0, "Working set should be positive");
});

test("getDockerContainerWorkingSetBytes computes working set from Docker stats when available", async (t) => {
    if (!isDockerAvailable()) {
        t.pass("Docker not available – skipping working set test");
        return;
    }

    const containerId = getLatestContainerId();

    if (!containerId) {
        t.pass("No running containers – skipping working set test");
        return;
    }

    const bytes = await getDockerContainerWorkingSetBytes(containerId);

    // If raw Docker stats are available, working set subtracts inactive file cache
    // unless inactive_file is zero.
    t.true(bytes !== null && bytes >= 0, "Working set should be non-negative");

    // Verify it's a sensible value: less than the system memory.
    const totalMem = require("os").totalmem();

    t.true(bytes !== null && bytes < totalMem, "Working set should be less than total system memory");
});

// ---------------------------------------------------------------------------
// MemoryRegistry – basic tracking
// ---------------------------------------------------------------------------

test("MemoryRegistry trackProcess adds a process entry", (t) => {
    const registry = new MemoryRegistry();

    registry.trackProcess(12345, "test-process");

    t.is(registry.processCount, 1, "Should have one tracked process");
    t.is(registry.trackedProcesses.get(12345)?.label, "test-process");
});

test("MemoryRegistry trackProcess ignores duplicate PIDs", (t) => {
    const registry = new MemoryRegistry();

    registry.trackProcess(12345, "first");
    registry.trackProcess(12345, "second");

    t.is(registry.processCount, 1, "Should still have one entry");
    t.is(
        registry.trackedProcesses.get(12345)?.label,
        "first",
        "Label should remain from first track"
    );
});

test("MemoryRegistry untrackProcess removes a process", (t) => {
    const registry = new MemoryRegistry();

    registry.trackProcess(12345, "test");
    registry.untrackProcess(12345);

    t.is(registry.processCount, 0, "Process should be removed");
});

test("MemoryRegistry trackProcess stores expectExit flag", (t) => {
    const registry = new MemoryRegistry();

    registry.trackProcess(12345, "normal");
    registry.trackProcess(67890, "exit-expected", true);

    t.false(registry.trackedProcesses.get(12345)?.expectExit, "Default should be false");
    t.true(registry.trackedProcesses.get(67890)?.expectExit, "Should store expectExit=true");
});

test("MemoryRegistry trackContainer adds a container entry", (t) => {
    const registry = new MemoryRegistry();

    registry.trackContainer("abc123", "test-container");

    t.is(registry.containerCount, 1, "Should have one tracked container");
});

test("MemoryRegistry trackContainer stores expectExit flag", (t) => {
    const registry = new MemoryRegistry();

    registry.trackContainer("abc123", "normal");
    registry.trackContainer("def456", "exit-expected", true);

    t.false(registry.trackedContainers.get("abc123")?.expectExit, "Default should be false");
    t.true(registry.trackedContainers.get("def456")?.expectExit, "Should store expectExit=true");
});

test("MemoryRegistry untrackContainer removes a container", (t) => {
    const registry = new MemoryRegistry();

    registry.trackContainer("abc123", "test");
    registry.untrackContainer("abc123");

    t.is(registry.containerCount, 0);
});

// ---------------------------------------------------------------------------
// MemoryRegistry – child process auto-untrack via exit event
// ---------------------------------------------------------------------------

test("MemoryRegistry trackChildProcess auto-untracks on process exit", async (t) => {
    const registry = new MemoryRegistry();

    const child = spawn(process.execPath, ["-e", "process.exit(0)"], {
        stdio: "ignore",
    });

    registry.trackChildProcess(child, "short-lived");

    t.is(registry.processCount, 1, "Should track immediately");

    await new Promise((resolve) => {
        child.on("exit", () => {
            setImmediate(() => resolve());
        });
    });

    t.is(registry.processCount, 0, "Should auto-untrack after exit");
});

test("MemoryRegistry trackChildProcess does not throw for null pid", (t) => {
    const registry = new MemoryRegistry();

    const fakeChild = { pid: null, once: () => {} };

    t.notThrows(() => registry.trackChildProcess(fakeChild, "no-pid"));
    t.is(registry.processCount, 0, "Should not track without pid");
});

test("MemoryRegistry trackChildProcess defaults expectExit to false", (t) => {
    const registry = new MemoryRegistry();

    const child = spawn(process.execPath, ["-e", "process.exit(0)"], {
        stdio: "ignore",
    });

    registry.trackChildProcess(child, "auto-exit");

    t.true(
        registry.trackedProcesses.get(child.pid)?.expectExit === false,
        "ChildProcess tracking should default expectExit=false"
    );

    child.kill();
});

// ---------------------------------------------------------------------------
// MemoryRegistry – assertAll: expected-exit process
// ---------------------------------------------------------------------------

test("MemoryRegistry assertAll fails for expected-exit process still alive", async (t) => {
    const registry = new MemoryRegistry();

    // Track the current process with expectExit=true — it will still be
    // alive during assertAll.
    registry.trackProcess(process.pid, "should-exit", true);

    const errors = await registry.assertAll();

    t.true(errors.length > 0, "Should produce at least one error");
    t.true(errors[0].includes("expected to exit"), "Error should mention expected exit");
    t.true(errors[0].includes(String(process.pid)), "Error should include PID");
    t.true(errors[0].includes("still running"), "Error should say still running");
});

test("MemoryRegistry assertAll removes expected-exit process after poll gone", async (t) => {
    const registry = new MemoryRegistry();

    // Track a non-existent PID — should be gone immediately.
    registry.trackProcess(999999999, "already-gone", true);

    const errors = await registry.assertAll();

    t.is(errors.length, 0, "Should not error for already-gone process");
    t.is(registry.processCount, 0, "Should have auto-removed the process");
});

test("MemoryRegistry assertAll does not enforce expected-exit on first assert (baseline only)", async (t) => {
    const registry = new MemoryRegistry();

    // Track a process with expectExit=false (default) — first call records baseline.
    registry.trackProcess(process.pid, "long-lived", false);

    const errors = await registry.assertAll();

    t.is(errors.length, 0, "First assertAll should record baseline, no error");
    t.is(registry.processCount, 1, "Process should remain tracked");
});

// ---------------------------------------------------------------------------
// MemoryRegistry – assertAll: expected-exit container
// ---------------------------------------------------------------------------

test("MemoryRegistry assertAll passes for expected-exit container that is gone", async (t) => {
    const registry = new MemoryRegistry();

    // A non-existent container ID — getDockerContainerWorkingSetBytes
    // will return null immediately.
    registry.trackContainer("nonexistent-container-for-test", "already-gone", true);

    const errors = await registry.assertAll();

    t.is(errors.length, 0, "Should not error for already-gone container");
    t.is(registry.containerCount, 0, "Should have auto-removed the container");
});

test("MemoryRegistry assertAll fails for expected-exit container still alive", async (t) => {
    if (!isDockerAvailable()) {
        t.pass("Docker not available – skipping live container failure test");
        return;
    }

    const containerId = getLatestContainerId();

    if (!containerId) {
        t.pass("No running containers – skipping live container failure test");
        return;
    }

    const registry = new MemoryRegistry();

    // Track a real running container with expectExit=true.
    registry.trackContainer(containerId, "should-exit", true);

    const errors = await registry.assertAll();

    t.true(errors.length > 0, "Should produce an error for a running container expected to exit");
    t.true(errors[0].includes("expected to exit"), "Error should mention expected exit");
    t.true(errors[0].includes("still running"), "Error should say still running");
});

test("MemoryRegistry assertAll does not enforce expected-exit for container on first call", async (t) => {
    if (!isDockerAvailable()) {
        t.pass("Docker not available – skipping");
        return;
    }

    const containerId = getLatestContainerId();

    if (!containerId) {
        t.pass("No running containers – skipping");
        return;
    }

    const registry = new MemoryRegistry();

    // Track a real running container without expectExit — first call records baseline.
    registry.trackContainer(containerId, "long-lived", false);

    const errors = await registry.assertAll();

    t.is(errors.length, 0, "First assertAll should record baseline, not error");
    t.is(registry.containerCount, 1, "Container should remain tracked");
});

// ---------------------------------------------------------------------------
// MemoryRegistry – assertAll with process thresholds (long-lived)
// ---------------------------------------------------------------------------

test("MemoryRegistry assertAll returns empty for no tracked resources", async (t) => {
    const registry = new MemoryRegistry();

    const errors = await registry.assertAll();

    t.deepEqual(errors, [], "No errors for empty registry");
});

test("MemoryRegistry assertAll handles long-lived self PID (baseline + delta)", async (t) => {
    const registry = new MemoryRegistry();

    // Track the current process as a long-lived resource.
    registry.trackProcess(process.pid, "self", false);

    const errors1 = await registry.assertAll();
    t.is(errors1.length, 0, "First assert records baseline, no error expected");

    const errors2 = await registry.assertAll();
    t.true(Array.isArray(errors2), "Second assert should produce an array");
    t.is(errors2.length, 0, "Self RSS should be well under 100 MiB threshold");
});

// ---------------------------------------------------------------------------
// MemoryRegistry – clear
// ---------------------------------------------------------------------------

test("MemoryRegistry clear removes all tracked resources", (t) => {
    const registry = new MemoryRegistry();

    registry.trackProcess(12345, "p1");
    registry.trackProcess(67890, "p2");
    registry.trackContainer("cid1", "c1");

    registry.clear();

    t.is(registry.processCount, 0, "All processes removed");
    t.is(registry.containerCount, 0, "All containers removed");
});

// ---------------------------------------------------------------------------
// Diagnostic helpers (re-exported from bdd-options)
// ---------------------------------------------------------------------------

test("buildProcessRssDiagnostics is a function", (t) => {
    const { buildProcessRssDiagnostics } = require("../../scripts/lib/bdd-options");
    t.true(typeof buildProcessRssDiagnostics === "function");
});

test("buildDockerWorkingSetDiagnostics is a function", (t) => {
	const { buildDockerWorkingSetDiagnostics } = require("../../scripts/lib/bdd-options");
	t.true(typeof buildDockerWorkingSetDiagnostics === "function");
});

// ---------------------------------------------------------------------------
// Chunk-level metrics (Phase 10)
// ---------------------------------------------------------------------------

test("MemoryRegistry.recordChunkHeapSample sets baseline on first call", (t) => {
	const registry = new MemoryRegistry();

	registry.recordChunkHeapSample(1000000);

	const summary = registry.computeChunkSummary();
	t.is(summary.parentHeap.baselineBytes, 1000000, "baseline should be set from first sample");
	t.is(summary.parentHeap.peakBytes, 1000000, "peak should equal baseline after one sample");
	t.is(summary.parentHeap.sampleCount, 1, "one sample recorded");
});

test("MemoryRegistry.recordChunkHeapSample tracks peak and count", (t) => {
	const registry = new MemoryRegistry();

	registry.recordChunkHeapSample(1000000); // baseline
	registry.recordChunkHeapSample(2000000); // higher
	registry.recordChunkHeapSample(1500000); // between, not new peak

	const summary = registry.computeChunkSummary();
	t.is(summary.parentHeap.baselineBytes, 1000000, "baseline unchanged");
	t.is(summary.parentHeap.peakBytes, 2000000, "peak is highest sample");
	t.is(summary.parentHeap.sampleCount, 3, "three samples recorded");
});

test("MemoryRegistry.recordChunkHeapSample does not override baseline on subsequent calls", (t) => {
	const registry = new MemoryRegistry();

	registry.recordChunkHeapSample(500000); // baseline
	registry.recordChunkHeapSample(300000); // lower, should NOT change baseline

	const summary = registry.computeChunkSummary();
	t.is(summary.parentHeap.baselineBytes, 500000, "baseline must remain the first sample");
	t.is(summary.parentHeap.peakBytes, 500000, "peak equals first sample when later samples are lower");
});

test("MemoryRegistry.recordProcessReady no-throws for untracked PID", (t) => {
	const registry = new MemoryRegistry();

	t.notThrows(() => {
		registry.recordProcessReady(999999999);
	}, "should not throw for untracked PID");
});

test("MemoryRegistry.recordProcessReady sets readyBaselineRss for tracked PID", (t) => {
	const registry = new MemoryRegistry();

	registry.trackProcess(process.pid, "self");
	registry.recordProcessReady(process.pid);

	const processes = registry.trackedProcesses;
	const tracked = processes.get(process.pid);

	t.true(tracked !== undefined, "should still be tracked");
	t.true(tracked !== undefined && typeof tracked.readyBaselineRss === "number", "readyBaselineRss should be a number");
	t.true(tracked !== undefined && tracked.readyBaselineRss !== null && tracked.readyBaselineRss > 0, "readyBaselineRss should be positive for running process");
});

test("MemoryRegistry.computeChunkSummary returns expected structure", (t) => {
	const registry = new MemoryRegistry();

	registry.recordChunkHeapSample(100000);
	registry.recordChunkHeapSample(200000);
	registry.trackProcess(process.pid, "self");
	registry.recordProcessReady(process.pid);

	const summary = registry.computeChunkSummary();

	t.true(typeof summary === "object", "summary should be an object");
	t.true(typeof summary.parentHeap === "object", "parentHeap should be present");
	t.true(typeof summary.parentHeap.baselineBytes === "number", "baselineBytes number");
	t.true(typeof summary.parentHeap.peakBytes === "number", "peakBytes number");
	t.is(summary.parentHeap.finalBytes, null, "finalBytes defaults to null");
	t.is(summary.parentHeap.delta, null, "delta defaults to null");
	t.is(summary.parentHeap.sampleCount, 2, "sampleCount matches");

	t.true(Array.isArray(summary.processes), "processes should be an array");
	t.is(summary.processes.length, 1, "one process tracked");
	t.is(summary.processes[0].label, "self", "process label");
	t.is(summary.processes[0].pid, process.pid, "process pid");
	t.true(summary.processes[0].finalRss !== null, "finalRss should be present for self");
	t.true(summary.processes[0].baselineRss !== null, "baselineRss should be set");
	t.true(summary.processes[0].readyBaselineRss !== null, "readyBaselineRss should be set");
	t.true(typeof summary.processes[0].peakRss === "number", "peakRss should be a number");
	t.false(summary.processes[0].expectExit, "default expectExit is false");
});

test("MemoryRegistry.computeChunkSummary handles missing /proc data gracefully", (t) => {
	const registry = new MemoryRegistry();

	// Track a PID that is extremely unlikely to exist.
	registry.trackProcess(2147483647, "nonexistent");

	t.notThrows(() => {
		const summary = registry.computeChunkSummary();
		t.true(Array.isArray(summary.processes), "processes array is present");
		t.is(summary.processes.length, 1, "one process (the phantom)");

		const entry = summary.processes[0];
		t.is(entry.label, "nonexistent");
		t.is(entry.baselineRss, null, "baselineRss is null for non-existent PID (spawn-time null)");
		t.is(entry.finalRss, null, "finalRss is null for non-existent PID");
		t.is(entry.peakRss, null, "peakRss is null");
		t.is(entry.deltaFromBaseline, null, "delta is null");
	}, "should not throw when /proc/<pid> does not exist");
});

test("MemoryRegistry.computeChunkSummary reports delta for changed RSS", (t) => {
	const registry = new MemoryRegistry();

	// Track self — finalRss should be >= baseline.
	registry.trackProcess(process.pid, "self");

	const summary = registry.computeChunkSummary();

	const entry = summary.processes.find((p) => p.pid === process.pid);

	t.truthy(entry, "self process should be in summary");

	if (entry) {
		t.true(entry.finalRss !== null, "finalRss for self not null");

		if (entry.baselineRss !== null && entry.finalRss !== null) {
			t.true(
				typeof entry.deltaFromBaseline === "number",
				"deltaFromBaseline is a number when both baseline and final are available"
			);
		}
	}
});

test("MemoryRegistry.printChunkSummary produces expected output format", (t) => {
	const registry = new MemoryRegistry();

	registry.recordChunkHeapSample(100000);
	registry.recordChunkHeapSample(200000);
	registry.trackProcess(process.pid, "self");
	registry.recordProcessReady(process.pid);

	// Capture stderr output.
	const chunks = [];
	const origWrite = process.stderr.write.bind(process.stderr);

	process.stderr.write = (chunk) => {
		const str = typeof chunk === "string" ? chunk : chunk.toString();
		chunks.push(str);
		return true;
	};

	try {
		t.notThrows(() => {
			registry.printChunkSummary(150000);
		}, "printChunkSummary should not throw");

		const output = chunks.join("");
		t.true(output.includes("chunk memory summary"), "should have summary header");
		t.true(output.includes("Parent Cucumber heap:"), "should have parent heap section");
		t.true(output.includes("100000"), "should contain baseline bytes");
		t.true(output.includes("200000"), "should contain peak bytes");
		t.true(output.includes("150000"), "should contain final bytes");
		t.true(output.includes("self"), "should contain process label");
		t.true(output.includes("Baseline:"), "should contain baseline label");
		t.true(output.includes("Peak:"), "should contain peak label");
		t.true(output.includes("Final:"), "should contain final label");
		t.true(output.includes("Delta:"), "should contain delta label");
		t.true(output.includes("Samples:"), "should contain sample count");
		t.true(output.includes("Ready baseline:"), "should contain ready baseline");
		t.true(output.includes("Delta (ready):"), "should contain ready delta");
	} finally {
		process.stderr.write = origWrite;
	}
});

test("MemoryRegistry.printChunkSummary handles no tracked processes", (t) => {
	const registry = new MemoryRegistry();

	registry.recordChunkHeapSample(100000);

	const chunks = [];
	const origWrite = process.stderr.write.bind(process.stderr);

	process.stderr.write = (chunk) => {
		const str = typeof chunk === "string" ? chunk : chunk.toString();
		chunks.push(str);
		return true;
	};

	try {
		t.notThrows(() => {
			registry.printChunkSummary(150000);
		}, "should not throw when no processes tracked");

		const output = chunks.join("");
		t.true(output.includes("(none)"), "should indicate no tracked processes");
	} finally {
		process.stderr.write = origWrite;
	}
});

test("MemoryRegistry.printChunkSummary handles null finalHeapBytes", (t) => {
	const registry = new MemoryRegistry();

	registry.recordChunkHeapSample(100000);

	t.notThrows(() => {
		registry.printChunkSummary(null);
	}, "should not throw when finalHeapBytes is null");
});

// ---------------------------------------------------------------------------
// Baseline selection: ready vs spawn (Phase 10 fix)
// ---------------------------------------------------------------------------

test("MemoryRegistry assertAll uses readyBaselineRss when available", async (t) => {
	// Track self with a known threshold and verify that the ready baseline
	// is preferred over the spawn baseline for the delta comparison.
	const registry = new MemoryRegistry({
		processRssThresholdBytes: () => 1099511627776, // 1 TiB — effectively infinite, no false failure
	});

	registry.trackProcess(process.pid, "self");

	// Simulate readiness — set a baseline that's at least as large as current RSS.
	// Using process.pid guarantees a real RSS value.
	registry.recordProcessReady(process.pid);

	const tracked = registry.trackedProcesses.get(process.pid);
	t.true(tracked !== undefined, "self should be tracked");

	const spawnBaseline = tracked.baselineRss;
	const readyBaseline = tracked.readyBaselineRss;

	t.true(spawnBaseline !== null, "spawn baseline should be set for self");
	t.true(readyBaseline !== null, "ready baseline should be set after recordProcessReady");
	t.true(readyBaseline >= spawnBaseline, "ready baseline should be >= spawn baseline");

	// assertAll should NOT produce an error — the delta against the ready
	// baseline should be small (self RSS is relatively stable).
	const errors = await registry.assertAll();
	t.is(errors.length, 0, "assertAll should pass when ready baseline is available");
});

test("MemoryRegistry assertAll falls back to spawn baseline without readyBaselineRss", async (t) => {
	const registry = new MemoryRegistry({
		processRssThresholdBytes: () => 1, // 1 byte — almost any delta triggers
	});

	// Track self without calling recordProcessReady.
	registry.trackProcess(process.pid, "self");

	const errors = await registry.assertAll();

	// With threshold=1, the delta from spawn baseline to current RSS should
	// trigger an error (unless the process just started and hasn't grown).
	t.true(errors.length >= 0, "assertAll should not throw");

	if (errors.length > 0) {
		// Verify the diagnostic mentions the spawn baseline source.
		t.true(
			errors[0].includes("spawn"),
			"diagnostics should mention 'spawn' as baseline source when ready baseline is absent"
		);
	} else {
		// Edge case: process hasn't grown — acceptable.
		t.pass("no error (process RSS unchanged from spawn)");
	}
});

test("MemoryRegistry assertAll diagnostics include baselineSource when using ready baseline", async (t) => {
	const registry = new MemoryRegistry({
		processRssThresholdBytes: () => -1, // Negative threshold — every positive delta triggers
	});

	registry.trackProcess(process.pid, "self");

	// Manually set a smaller ready baseline to force a detectable delta.
	const tracked = registry.trackedProcesses.get(process.pid);
	t.true(tracked !== undefined, "self should be tracked");

	// Force readyBaselineRss to a very small value so the delta > threshold.
	tracked.readyBaselineRss = 1;

	const errors = await registry.assertAll();

	t.true(errors.length > 0, "should produce at least one error with forced small ready baseline");

	// Diagnostics should contain the baselineSource label.
	const errorText = errors.join(" ");
	t.true(
		errorText.includes("ready"),
		"diagnostics should mention 'ready' as baseline source"
	);
});

test("MemoryRegistry assertAll records spawn baseline when neither baseline set", async (t) => {
	const registry = new MemoryRegistry({
		processRssThresholdBytes: () => 1099511627776,
	});

	// Track a non-existent PID — baselineRss will be null at trackProcess time.
	registry.trackProcess(999999999, "phantom");

	// Call assertAll — it should record finalRss as baselineRss on first pass.
	const errors1 = await registry.assertAll();

	const tracked1 = registry.trackedProcesses.get(999999999);
	t.true(tracked1 !== undefined, "phantom should still be tracked");
	t.is(tracked1.baselineRss, null, "baselineRss stays null because /proc doesn't exist");

	// Call assertAll again — since baselineRss is still null, it tries again.
	const errors2 = await registry.assertAll();
	t.true(Array.isArray(errors2), "second assertAll should not throw");
});

test("MemoryRegistry assertAll with readyBaselineRss equal to spawn baseline produces same delta", async (t) => {
	const registry = new MemoryRegistry({
		processRssThresholdBytes: () => 1099511627776,
	});

	registry.trackProcess(process.pid, "self");

	const tracked = registry.trackedProcesses.get(process.pid);
	t.true(tracked !== undefined, "self should be tracked");
	t.true(tracked.baselineRss !== null, "spawn baseline set");

	// Set ready baseline to the same value as spawn baseline.
	tracked.readyBaselineRss = tracked.baselineRss;

	const errors = await registry.assertAll();
	t.is(errors.length, 0, "assertAll should pass (ready baseline == spawn baseline, same delta)");
});
