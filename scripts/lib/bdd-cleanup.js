#!/usr/bin/env node

/**
 * @file scripts/lib/bdd-cleanup.js
 *
 * Centralised process‑group tracking, TERM‑to‑KILL escalation, and leak‑
 * detection helpers for the supported BDD runner and BDD test fixtures.
 *
 * These helpers are designed for repository‑owned child processes only.
 * They MUST NOT broad‑kill host processes.
 *
 * Environment variables (all optional):
 *   SCRAMJET_TEST_LOG     – set to "1" to enable debug logging
 */


const { execSync, spawnSync } = require("node:child_process");
const { existsSync, rmSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const { isDisabled } = require("./ava-options.js");

// ---------------------------------------------------------------------------
// Known repository‑owned process patterns
// ---------------------------------------------------------------------------

/**
 * Patterns that identify repository‑owned child processes.
 * Each entry is a substring matched against the process command line
 * (via `pgrep -f`).  These are conservative: no broad patterns.
 */
const KNOWN_PROCESS_PATTERNS = [
	// STH / Host — anchored to our repo paths
	"packages/sth/src/bin/hub",
	"dist/sth/bin/hub",
	// Runner — anchored to our package paths or command flags
	"packages/runner/src/bin",
	"dist/runner/bin",
	// Manager — anchored to our package paths
	"packages/manager/src",
	"dist/manager",
	// MultiManager — anchored to our package paths
	"packages/multi-manager/src",
	"dist/multi-manager",
	// Cucumber — matched via node_modules path, not bare command
	"node_modules/@cucumber/cucumber",
	"node_modules/.bin/cucumber-js",
];

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function isLogActive() {
	return !isDisabled(process.env.SCRAMJET_TEST_LOG);
}

function log(...args) {
	if (isLogActive()) {
		console.error("[bdd-cleanup]", ...args);
	}
}

// ---------------------------------------------------------------------------
// Process‑group helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to send a signal to a process group.  Falls back to killing the
 * single process when the process group kill fails.
 *
 * Signal states:
 *   - Group kill succeeds         -> true  (sent to group)
 *   - Group kill ESRCH, PID kill succeeds -> true  (sent to individual PID)
 *   - Group kill ESRCH, PID kill ESRCH   -> true  (confirmed absent)
 *   - Group kill other error, PID succeeds -> true (sent to individual PID)
 *   - Any other combination       -> false (signalling failed)
 *
 * Confirmed-absent is only declared when BOTH the group and the individual
 * PID return ESRCH.  A non-ESRCH group error followed by PID ESRCH means
 * the caller could not signal what it needed to and absence is not reliably
 * established.
 *
 * @param {number} pid        Process ID.
 * @param {string} signal     Signal name (e.g. "SIGTERM", "SIGKILL").
 * @returns {boolean}         True if the process was signalled or
 *                            confirmed absent.
 */
function killProcessGroup(pid, signal) {
	if (!pid || !Number.isFinite(pid)) {
		return false;
	}

	let groupErrorCode = null;

	try {
		process.kill(-pid, signal);
		return true;
	} catch (groupError) {
		groupErrorCode = groupError?.code;
		// Group kill failed — try the individual PID.
	}

	try {
		process.kill(pid, signal);
		return true;
	} catch (fallbackError) {
		// Confirmed absent only when BOTH group and PID return ESRCH.
		if (groupErrorCode === "ESRCH" && fallbackError?.code === "ESRCH") return true;
		return false;
	}
}

/**
 * Graceful process stop with TERM‑to‑KILL escalation.
 *
 * 1. Sends SIGTERM to the process group.
 * 2. Waits up to `graceMs` for the process to exit.
 * 3. If still alive, sends SIGKILL.
 *
 * @param {object} child          ChildProcess-like object with a `pid` and
 *                                optionally `once` / `killed`.
 * @param {object} [options]
 * @param {number} [options.graceMs=10000]
 * @returns {Promise<boolean>}    True if the process exited or was killed.
 */
function stopProcess(child, options = {}) {
	const grace = options.graceMs ?? 10000;
	const pid = child?.pid;

	if (pid === undefined || pid === null) {
		log("stopProcess: no pid, skipping");
		return Promise.resolve(true);
	}

	return new Promise((resolve, reject) => {
		let settled = false;

		const finish = (result) => {
			if (settled) return;
			settled = true;
			if (result instanceof Error) reject(result);
			else resolve(result);
		};

		// If the child has an event emitter, listen for exit and error.
		if (typeof child.once === "function") {
			child.once("exit", () => {
				clearTimeout(timer);
				log(`process ${pid} exited gracefully`);
				finish(true);
			});
			child.once("error", () => {
				log(`process ${pid} errored`);
				finish(true);
			});
		}

		// 1. Send SIGTERM to the process group.
		log(`sending SIGTERM to process group -${pid}`);
		if (!killProcessGroup(pid, "SIGTERM")) {
			finish(new Error(`Failed to signal process group ${pid} with SIGTERM`));
			return;
		}

		// Confirm absence immediately after a successful signal-state result.
		try {
			process.kill(pid, 0);
		} catch (probeError) {
			if (probeError?.code === "ESRCH") {
				finish(true);
				return;
			}
		}

		// 2. Wait for the grace period.
		const timer = setTimeout(() => {
			if (settled) return;

			// 3. Process still alive → escalate to SIGKILL.
			log(`process ${pid} did not exit within ${grace}ms, sending SIGKILL`);
			if (!killProcessGroup(pid, "SIGKILL")) {
				finish(new Error(`Failed to signal process group ${pid} with SIGKILL`));
				return;
			}

			try {
				process.kill(pid, 0);
			} catch (probeError) {
				if (probeError?.code === "ESRCH") {
					finish(true);
					return;
				}
			}

			// Give the kill a moment to take effect, then resolve.
			setTimeout(() => {
				finish(true);
			}, 500);
		}, grace);
	});
}

// ---------------------------------------------------------------------------
// Leak detection
// ---------------------------------------------------------------------------

/**
 * Find processes whose command line matches any of the given patterns.
 *
 * Uses `pgrep -f <pattern>` to match against the full command line.
 * Returns only numerical PIDs.
 *
 * @param {string[]} [patterns=KNOWN_PROCESS_PATTERNS]
 * @returns {number[]}  Array of PIDs (may be empty).
 */
function findProcessesByPatterns(patterns = KNOWN_PROCESS_PATTERNS) {
	const found = new Set();

	for (const pattern of patterns) {
		try {
			const stdout = execSync(`pgrep -f "${pattern.replace(/"/g, '\\"')}"`, {
				encoding: "utf8",
				stdio: ["ignore", "pipe", "ignore"],
				timeout: 5000,
			});

			for (const line of stdout.split("\n").filter(Boolean)) {
				const pid = Number(line.trim());

				if (Number.isFinite(pid) && pid > 0) {
					found.add(pid);
				}
			}
		} catch {
			// pgrep exits non-zero when no match; that's expected.
		}
	}

	return [...found].sort((a, b) => a - b);
}

/**
 * Detect leaked repository‑owned test processes.
 *
 * Checks for known patterns (STH, Host, runner, Manager, MultiManager,
 * cucumber) that may have been left behind after a test run.
 *
 * @returns {{ pid: number, command: string }[]}
 */
function detectLeakedProcesses() {
	const results = [];

	for (const pid of findProcessesByPatterns()) {
		try {
			const cmd = execSync(`ps -p ${pid} -o command= 2>/dev/null`, {
				encoding: "utf8",
				timeout: 3000,
			}).trim();

			if (cmd) {
				results.push({ pid, command: cmd });
			}
		} catch {
			// process vanished between pgrep and ps — skip.
		}
	}

	return results;
}

/**
 * Report leaked processes to stderr.  Returns true when leaks are found.
 *
 * @returns {boolean}
 */
function reportLeakedProcesses() {
	const leaked = detectLeakedProcesses();

	if (leaked.length === 0) {
		log("no leaked repository processes detected");
		return false;
	}

	console.error("[bdd-cleanup] ⚠  Leaked repository processes detected:");
	for (const { pid, command } of leaked) {
		console.error(`  PID ${pid}: ${command}`);
	}

	return true;
}

// ---------------------------------------------------------------------------
// Temp directory cleanup
// ---------------------------------------------------------------------------

/**
 * Remove temp directories matching a pattern under a base directory.
 *
 * @param {string} baseDir    Base directory (e.g. /tmp).
 * @param {string} prefix     Directory name prefix (e.g. "bdd-runner.").
 */
function cleanupTempDirs(baseDir = "/tmp", prefix = "bdd-runner.", ownership) {
	if (ownership) {
		const { encodePart } = require("../../bdd/lib/ownership.js");
		const ownerDir = join(baseDir, "scramjet-bdd-runs", encodePart(String(ownership.runId)), "chunks", encodePart(String(ownership.chunkId)));
		try {
			if (existsSync(ownerDir)) {
				rmSync(ownerDir, { recursive: true, force: true });
				log(`removed ownership temp dir ${ownerDir}`);
			}
			// These parents are owned exclusively by this run. Prune them on a
			// best-effort basis; empty parents must not block lock release.
			for (const parent of [join(ownerDir, ".."), join(ownerDir, "..", "..")]) {
				try { require("node:fs").rmdirSync(parent); } catch { /* non-empty or already gone */ }
			}
		} catch (error) {
			console.error(`[bdd-cleanup] failed to remove ${ownerDir}: ${error.message}`);
		}
		return;
	}

	if (!existsSync(baseDir)) {
		return;
	}

	let entries;

	try {
		entries = readdirSync(baseDir);
	} catch {
		return;
	}

	for (const entry of entries) {
		if (!entry.startsWith(prefix)) {
			continue;
		}

		const fullPath = join(baseDir, entry);

		try {
			rmSync(fullPath, { recursive: true, force: true });
			log(`removed temp dir ${fullPath}`);
		} catch (error) {
			console.error(`[bdd-cleanup] failed to remove ${fullPath}: ${error.message}`);
		}
	}
}

// ---------------------------------------------------------------------------
// Docker container cleanup
// ---------------------------------------------------------------------------

/**
 * Remove Docker containers with a matching name prefix.
 *
 * @param {string} prefix   Container name prefix (e.g. "bdd-runner-").
 */
function cleanupDockerContainers(prefixOrOptions = "bdd-runner-") {
	const options = typeof prefixOrOptions === "string" ? { prefix: prefixOrOptions } : prefixOrOptions || {};
	const prefix = options.prefix || "bdd-runner-";

	// Build a docker ps command with optional ownership-label filters.
	let dockerCmd = `docker ps -a --filter "name=${prefix}"`;
	if (options.runId) dockerCmd += ` --filter "label=scramjet.bdd.run-id=${options.runId}"`;
	if (options.chunkId) dockerCmd += ` --filter "label=scramjet.bdd.chunk-id=${options.chunkId}"`;
	dockerCmd += ' --format "{{.ID}}"';

	try {
		const stdout = execSync(dockerCmd, { encoding: "utf8", timeout: 10000, stdio: ["ignore", "pipe", "ignore"] });

		for (const id of stdout.split("\n").filter(Boolean)) {
			try {
				spawnSync("docker", ["rm", "-f", id.trim()], { stdio: "ignore" });
				log(`removed docker container ${id.trim()}`);
			} catch {
				// best effort
			}
		}
	} catch {
		// docker not available or no matching containers
	}
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
	KNOWN_PROCESS_PATTERNS,
	killProcessGroup,
	stopProcess,
	findProcessesByPatterns,
	detectLeakedProcesses,
	reportLeakedProcesses,
	cleanupTempDirs,
	cleanupDockerContainers,
};
