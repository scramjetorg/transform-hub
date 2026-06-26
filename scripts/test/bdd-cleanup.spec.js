/**
 * @file scripts/test/bdd-cleanup.spec.js
 *
 * Regression tests for BDD cleanup helpers in scripts/lib/bdd-cleanup.js.
 *
 * These tests verify KNOWN_PROCESS_PATTERNS correctness, the stopProcess
 * escalation logic (without actually killing processes), and temp/container
 * cleanup path construction.  They do NOT spawn real processes or pgrep.
 */

"use strict";

const test = require("ava");

const {
	KNOWN_PROCESS_PATTERNS,
	killProcessGroup,
	cleanupTempDirs,
	cleanupDockerContainers,
} = require("../lib/bdd-cleanup.js");

// ---------------------------------------------------------------------------
// KNOWN_PROCESS_PATTERNS
// ---------------------------------------------------------------------------

test("KNOWN_PROCESS_PATTERNS includes STH/Host patterns", (t) => {
	const patterns = KNOWN_PROCESS_PATTERNS;

	t.true(patterns.some((p) => p.includes("hub")), "should match sth/hub");
	t.true(patterns.some((p) => p.includes("runner")), "should match runner");
});

test("KNOWN_PROCESS_PATTERNS includes Manager/MultiManager patterns", (t) => {
	const patterns = KNOWN_PROCESS_PATTERNS;

	t.true(patterns.some((p) => p.includes("manager")), "should match manager");
	t.true(patterns.some((p) => p.includes("multi-manager")), "should match multi-manager");
});

test("KNOWN_PROCESS_PATTERNS includes cucumber patterns", (t) => {
	const patterns = KNOWN_PROCESS_PATTERNS;

	t.true(patterns.some((p) => p.includes("cucumber")), "should match cucumber");
});

test("KNOWN_PROCESS_PATTERNS has no overly broad patterns", (t) => {
	const patterns = KNOWN_PROCESS_PATTERNS;

	// "node" alone would be too broad — must be a more specific path.
	t.false(patterns.includes("node"), "should not match bare 'node'");
	t.false(patterns.includes("npm"), "should not match bare 'npm'");
	// Bare "runner", "manager", "cucumber" would match unrelated processes.
	t.false(patterns.some((p) => p === "runner"), "should not match bare 'runner'");
	t.false(patterns.some((p) => p === "manager"), "should not match bare 'manager'");
	t.false(patterns.some((p) => p === "cucumber"), "should not match bare 'cucumber'");
});

// ---------------------------------------------------------------------------
// killProcessGroup edge cases (without killing real processes)
// ---------------------------------------------------------------------------

test("killProcessGroup returns false when pid is null", (t) => {
	const result = killProcessGroup(null, "SIGTERM");
	t.false(result);
});

test("killProcessGroup returns false when pid is undefined", (t) => {
	const result = killProcessGroup(undefined, "SIGTERM");
	t.false(result);
});

test("killProcessGroup returns false when pid is not finite", (t) => {
	const result = killProcessGroup(NaN, "SIGTERM");
	t.false(result);
});

test("killProcessGroup handles non-existent pid gracefully", (t) => {
	// PID 1 always exists on Unix; PID 999999999 almost certainly does not.
	// The helper should return true (ESRCH is treated as "already gone").
	const result = killProcessGroup(999999999, "SIGTERM");
	t.true(result);
});

// ---------------------------------------------------------------------------
// cleanupTempDirs – path construction (should not throw)
// ---------------------------------------------------------------------------

test("cleanupTempDirs handles non-existent base dir gracefully", (t) => {
	t.notThrows(() => cleanupTempDirs("/nonexistent/bdd-test-dir"));
});

test("cleanupTempDirs with default args does not throw", (t) => {
	t.notThrows(() => cleanupTempDirs("/tmp", "bdd-runner-dont-exist-"));
});

// ---------------------------------------------------------------------------
// cleanupDockerContainers – graceful no-docker scenario
// ---------------------------------------------------------------------------

test("cleanupDockerContainers does not throw when docker unavailable", (t) => {
	// Should not throw even if docker is not on PATH or there are no
	// matching containers.
	t.notThrows(() => cleanupDockerContainers("bdd-runner-nonexistent-"));
});

// ---------------------------------------------------------------------------
// Leak detection helpers – structural check
// ---------------------------------------------------------------------------

test("findProcessesByPatterns is importable and returns an array", (t) => {
	const { findProcessesByPatterns } = require("../lib/bdd-cleanup.js");

	t.is(typeof findProcessesByPatterns, "function");
	// Use a unique pattern that won't appear in any command line.
	const result = findProcessesByPatterns(["ZZZZ_BDD_TEST_NONEXISTENT_ZZZZ"]);
	t.true(Array.isArray(result));
});

test("detectLeakedProcesses is importable and returns an array", (t) => {
	const { detectLeakedProcesses } = require("../lib/bdd-cleanup.js");

	t.is(typeof detectLeakedProcesses, "function");
	const result = detectLeakedProcesses();
	t.true(Array.isArray(result));
});

test("reportLeakedProcesses is importable", (t) => {
	const { reportLeakedProcesses } = require("../lib/bdd-cleanup.js");

	t.is(typeof reportLeakedProcesses, "function");
});

// ---------------------------------------------------------------------------
// stopProcess
// ---------------------------------------------------------------------------

test("stopProcess resolves immediately for null child", async (t) => {
	const { stopProcess } = require("../lib/bdd-cleanup.js");

	await t.notThrowsAsync(stopProcess(null));
});

test("stopProcess resolves immediately for child with no pid", async (t) => {
	const { stopProcess } = require("../lib/bdd-cleanup.js");

	const child = {};
	await t.notThrowsAsync(stopProcess(child));
});

test("stopProcess resolves eventually for child with unreachable pid", async (t) => {
	const { stopProcess } = require("../lib/bdd-cleanup.js");

	// This child's pid does not exist, so process.kill will fail.
	// stopProcess should still resolve (catch the error).
	const child = {
		pid: 999999999,
		once: () => {},
	};

	await t.notThrowsAsync(stopProcess(child, { graceMs: 100 }));
});


