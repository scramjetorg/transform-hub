#!/usr/bin/env node

/**
 * @file scripts/lib/ava-guard.cjs
 *
 * Preload script for the supported AVA runner bypass guard.
 *
 * When loaded via `--require` (injected into NODE_OPTIONS by avaNodeOptions()
 * when SCRAMJET_AVA_GUARD=1), this module checks whether the well-known
 * environment variable SCRAMJET_AVA_RUNNER is set to "1".  If it is absent,
 * it means the AVA process was NOT spawned by `scripts/run-ava.js` (i.e. it
 * was started directly via `npx ava` or `node node_modules/.bin/ava`), and a
 * one‑time warning is printed to stderr.
 *
 * The check is intentionally a warning, not a hard error, so that direct
 * ad‑hoc invocations remain possible but the user is clearly informed about
 * the supported workflow.
 *
 * Environment variables:
 *   SCRAMJET_AVA_RUNNER    – set to "1" by the runner to mark legitimate invocations
 *   SCRAMJET_AVA_GUARD     – set to "1" (or truthy) to enable this preload
 *   SCRAMJET_AVA_ALLOW_DIRECT – set to "1" to silence the warning even when
 *                            SCRAMJET_AVA_RUNNER is absent
 */

"use strict";

const RUNNER_ENV = "SCRAMJET_AVA_RUNNER";
const ALLOW_DIRECT_ENV = "SCRAMJET_AVA_ALLOW_DIRECT";

// Only warn once per process.
if (!process.env[RUNNER_ENV] && !process.env[ALLOW_DIRECT_ENV]) {
	const message = [
		"",
		"⚠  Direct AVA invocation detected (SCRAMJET_AVA_RUNNER is not set).",
		"   The supported test runner was bypassed.  Memory limits, JIT/WASM",
		"   profile, worker fan‑out, and timeout defaults are NOT applied.",
		"",
		"   To run through the supported runner, use:",
		"     node ../../scripts/run-ava.js [AVA-OPTIONS]",
		"   from a package directory, or set SCRAMJET_AVA_ALLOW_DIRECT=1 to",
		"   silence this warning for ad‑hoc use.",
		"",
	].join("\n");

	console.warn(message);
}
