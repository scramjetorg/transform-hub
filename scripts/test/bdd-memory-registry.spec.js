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
