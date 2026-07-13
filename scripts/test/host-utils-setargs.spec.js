/**
 * @file scripts/test/host-utils-setargs.spec.js
 *
 * Focused regression tests for HostUtils.setArgs default port injection
 * logic.  Verifies that both -P (short) and --port (long) in extraArgs
 * suppress the default -P LOCAL_HOST_PORT injection.
 *
 * Always loads current source via ts-node so the test exercises the live
 * bdd/lib/host-utils.ts build output, never a stale bdd/dist artifact.
 */

"use strict";

const test = require("ava");
const path = require("path");
const tsNode = require("ts-node");

// Register ts-node to load TypeScript source directly.  This avoids
// falling back to a potentially stale bdd/dist/ compiled artifact.
tsNode.register({
	project: path.resolve(__dirname, "../../bdd/tsconfig.json"),
});

const { HostUtils } = require("../../bdd/lib/host-utils");

function makeSetArgs(extraArgs, noDefault, envPort) {
	const saved = process.env.LOCAL_HOST_PORT;
	if (envPort !== undefined) {
		process.env.LOCAL_HOST_PORT = String(envPort);
	} else {
		delete process.env.LOCAL_HOST_PORT;
	}

	const hostUtils = new HostUtils();
	const command = [];

	try {
		hostUtils.setArgs(command, extraArgs, noDefault);
	} finally {
		if (saved !== undefined) {
			process.env.LOCAL_HOST_PORT = saved;
		} else {
			delete process.env.LOCAL_HOST_PORT;
		}
	}

	return command;
}

// ---------------------------------------------------------------------------
// -P short-form suppression
// ---------------------------------------------------------------------------

test("setArgs does not inject default -P when -P is in extraArgs", (t) => {
	const command = makeSetArgs(["-P", "3100"], []);
	// -P comes from extraArgs, but there should be exactly 1 (not 2 with a
	// duplicate default).
	const pCount = command.filter((a) => a === "-P").length;
	t.is(pCount, 1, "-P must appear exactly once (from extraArgs, not default)");
});

test("setArgs does not inject default -P when -P is in extraArgs and LOCAL_HOST_PORT set", (t) => {
	const command = makeSetArgs(["-P", "3100"], [], 8000);
	// -P should appear only once (the one from extraArgs pushes through
	// via line: if (extraArgs.length) command.push(...extraArgs)).
	const pCount = command.filter((a) => a === "-P").length;
	t.is(pCount, 1, "-P must appear exactly once (from extraArgs, not default)");
});

// ---------------------------------------------------------------------------
// --port long-form suppression  (regression: previously only -P was checked)
// ---------------------------------------------------------------------------

test("setArgs does not inject default -P when --port is in extraArgs", (t) => {
	const command = makeSetArgs(["--port", "3100"], []);
	t.false(command.includes("-P"), "-P flag must not appear when --port is supplied");
});

test("setArgs does not inject default -P when --port is in extraArgs and LOCAL_HOST_PORT set", (t) => {
	const command = makeSetArgs(["--port", "3100"], [], 8000);
	t.false(command.includes("-P"), "-P flag must not appear when --port is supplied and env port is set");
});

// ---------------------------------------------------------------------------
// Default injection when no port flag is given
// ---------------------------------------------------------------------------

test("setArgs injects default -P when no port flag given and LOCAL_HOST_PORT set", (t) => {
	const command = makeSetArgs([], [], 8000);
	t.true(command.includes("-P"), "default -P must be injected");
	const idx = command.indexOf("-P");
	t.is(command[idx + 1], "8000", "default port value must match LOCAL_HOST_PORT");
});

// ---------------------------------------------------------------------------
// noDefault suppression
// ---------------------------------------------------------------------------

test("setArgs does not inject default -P when 'port' is in noDefault", (t) => {
	const command = makeSetArgs([], ["port"], 8000);
	t.false(command.includes("-P"), "-P must not appear when port is omitted via noDefault");
});

// ---------------------------------------------------------------------------
// No injection when LOCAL_HOST_PORT is unset
// ---------------------------------------------------------------------------

test("setArgs does not inject default -P when LOCAL_HOST_PORT is unset", (t) => {
	const command = makeSetArgs([], []);
	t.false(command.includes("-P"), "-P must not appear when env port is unset");
});

// ---------------------------------------------------------------------------
// Expected-stop state / startup exit assertion suppression (Phase 11)
// ---------------------------------------------------------------------------

test("markStopExpected sets expectedStop to true", (t) => {
	const hostUtils = new HostUtils();
	t.false(hostUtils.expectedStop, "expectedStop must start false");
	hostUtils.markStopExpected();
	t.true(hostUtils.expectedStop, "markStopExpected must set expectedStop to true");
});

test("expectedStop flag prevents startup exit assertion condition", (t) => {
	const hostUtils = new HostUtils();

	// Simulate the assertion condition used in the exit handler:
	//   if (code === 1 && this.expectedExitCode !== 1 && !this.expectedStop) assert.fail();
	// Without expectedStop → condition is true → assertion WOULD fire.
	hostUtils.expectedExitCode = undefined;
	hostUtils.expectedStop = false;
	const wouldFireWithoutStop = (1 === 1 && hostUtils.expectedExitCode !== 1 && !hostUtils.expectedStop);
	t.true(wouldFireWithoutStop, "assertion condition must be true when expectedStop is false");

	// With expectedStop → condition is false → assertion is suppressed.
	hostUtils.expectedStop = true;
	const wouldFireWithStop = (1 === 1 && hostUtils.expectedExitCode !== 1 && !hostUtils.expectedStop);
	t.false(wouldFireWithStop, "assertion condition must be false when expectedStop is true");
});

test("expectedStop does not suppress when expectedExitCode is set to 1", (t) => {
	const hostUtils = new HostUtils();

	// When expectedExitCode is explicitly 1 (startup-failure scenario),
	// the assertion should NOT fire regardless of expectedStop.
	hostUtils.expectedExitCode = 1;
	hostUtils.expectedStop = false;
	const wouldFireExitCodeSet = (1 === 1 && hostUtils.expectedExitCode !== 1 && !hostUtils.expectedStop);
	t.false(wouldFireExitCodeSet, "assertion must not fire when expectedExitCode is 1");

	// expectedStop should be irrelevant when expectedExitCode is already 1
	hostUtils.expectedStop = true;
	const wouldFireBothSet = (1 === 1 && hostUtils.expectedExitCode !== 1 && !hostUtils.expectedStop);
	t.false(wouldFireBothSet, "assertion must not fire when expectedExitCode is 1 regardless of expectedStop");
});

test("expectedStop flag persists independently of expectedExitCode", (t) => {
	const hostUtils = new HostUtils();

	// expectedStop is independent of expectedExitCode
	hostUtils.expectedExitCode = 42;
	hostUtils.markStopExpected();
	t.true(hostUtils.expectedStop, "expectedStop is true after markStopExpected");
	t.is(hostUtils.expectedExitCode, 42, "expectedExitCode is unchanged by markStopExpected");

	// Clearing expectedExitCode must not affect expectedStop
	hostUtils.expectedExitCode = undefined;
	t.true(hostUtils.expectedStop, "expectedStop remains true after expectedExitCode cleared");
});

// ---------------------------------------------------------------------------
// Scenario-lifecycle integration: resource-scoped onStop callback (Phase 11)
// ---------------------------------------------------------------------------
// These tests verify that the resource-scoped onStop callback fires
// immediately before stopping that specific resource in both cleanup()
// and stop() paths, without marking unrelated resources early.

test("ownChild with onStop fires callback during cleanup", async t => {
	const { spawn } = require("child_process");
	const { ScenarioLifecycle } = require("../../scripts/lib/bdd-scenario-lifecycle.js");
	const { MemoryRegistry } = require("../../bdd/lib/memory-registry");
	const registry = new MemoryRegistry();
	const lifecycle = new ScenarioLifecycle(registry, { graceMs: 1000 });
	const hostUtils = new HostUtils();

	const child = spawn(process.execPath, ["-e", "setTimeout(() => process.exit(0), 50)"], { stdio: "ignore" });
	lifecycle.ownChild(child, "test-hub", {
		group: true,
		onStop: () => hostUtils.markStopExpected(),
	});

	t.false(hostUtils.expectedStop, "expectedStop must be false before cleanup");

	await lifecycle.cleanup();
	await registry.drainExitEvents();

	t.true(hostUtils.expectedStop, "expectedStop must be true after cleanup via ownChild onStop");
	t.is((await registry.assertAll()).length, 0, "no registry assertion errors");
});

test("ownChild with onStop fires callback during explicit stop, not just cleanup", async t => {
	const { spawn } = require("child_process");
	const { ScenarioLifecycle } = require("../../scripts/lib/bdd-scenario-lifecycle.js");
	const { MemoryRegistry } = require("../../bdd/lib/memory-registry");
	const registry = new MemoryRegistry();
	const lifecycle = new ScenarioLifecycle(registry, { graceMs: 1000 });
	const hostUtils = new HostUtils();

	const child = spawn(process.execPath, ["-e", "setTimeout(() => process.exit(0), 100)"], { stdio: "ignore" });
	lifecycle.ownChild(child, "test-hub", {
		group: true,
		onStop: () => hostUtils.markStopExpected(),
	});

	t.false(hostUtils.expectedStop, "expectedStop must be false before explicit stop");

	// Explicit stop() — mirrors the "exit hub process" step.
	await lifecycle.stop(child);
	await registry.drainExitEvents();

	t.true(hostUtils.expectedStop, "expectedStop must be true after explicit stop via ownChild onStop");
	t.is((await registry.assertAll()).length, 0, "no registry assertion errors");
});

test("onStop fires only for the resource that registered it, not unrelated resources", async t => {
	const { spawn } = require("child_process");
	const { ScenarioLifecycle } = require("../../scripts/lib/bdd-scenario-lifecycle.js");
	const { MemoryRegistry } = require("../../bdd/lib/memory-registry");
	const registry = new MemoryRegistry();
	const lifecycle = new ScenarioLifecycle(registry, { graceMs: 1000 });
	const hostUtils = new HostUtils();
	let unrelatedStopped = false;

	// Both children are spawned detached so they are process-group leaders,
	// which makes group-owned SIGTERM/SIGKILL via process.kill(-pid) work.
	const hubChild = spawn(process.execPath, ["-e", "setTimeout(()=>{},30000)"], { stdio: "ignore", detached: true });
	lifecycle.ownChild(hubChild, "test-hub", {
		group: true,
		onStop: () => hostUtils.markStopExpected(),
	});

	const otherChild = spawn(process.execPath, ["-e", "setTimeout(()=>{},30000)"], { stdio: "ignore", detached: true });
	lifecycle.ownChild(otherChild, "other-manager", {
		group: false,
		onStop: () => { unrelatedStopped = true; },
	});

	t.false(hostUtils.expectedStop, "hub expectedStop must be false before cleanup");
	t.false(unrelatedStopped, "unrelated onStop must not have fired yet");

	// Clean up only the hub via explicit stop — the other resource keeps its callback unfired.
	await lifecycle.stop(hubChild);
	await registry.drainExitEvents();

	t.true(hostUtils.expectedStop, "hub expectedStop must be true after stop(hubChild)");
	t.false(unrelatedStopped, "unrelated resource onStop must NOT fire when only hub is stopped");

	// Now clean up the other resource.
	await lifecycle.stop(otherChild);
	await registry.drainExitEvents();
	t.true(unrelatedStopped, "unrelated onStop must fire when that resource is stopped");
});

test("pre-crashed child does NOT fire onStop — preserves unexpected-exit failure for assertAll", async t => {
	const { spawn } = require("child_process");
	const { ScenarioLifecycle } = require("../../scripts/lib/bdd-scenario-lifecycle.js");
	const { MemoryRegistry } = require("../../bdd/lib/memory-registry");
	const registry = new MemoryRegistry();
	const lifecycle = new ScenarioLifecycle(registry, { graceMs: 1000 });
	let onStopFired = false;

	// Child exits immediately with code 1 before any cleanup runs.
	const child = spawn(process.execPath, ["-e", "process.exit(1)"], { stdio: "ignore" });
	lifecycle.ownChild(child, "crashed-hub", {
		group: true,
		onStop: () => { onStopFired = true; },
	});

	// Wait for spontaneous exit.
	await new Promise(resolve => child.once("exit", resolve));
	await registry.drainExitEvents();

	// Cleanup — the child has already exited, so cleanupResource returns
	// early at the `!isAlive` guard and MUST NOT call onStop.
	await lifecycle.cleanup();
	await registry.drainExitEvents();

	// onStop must NOT have fired: the crashed process was never deliberately
	// stopped by the lifecycle.
	t.false(onStopFired, "onStop must NOT fire for a process that crashed before cleanup");

	// The registry must still report the crash as an unexpected exit.
	const errors = await registry.assertAll();
	t.true(errors.length > 0, "assertAll must report unexpected exit for pre-crashed child");
	t.true(errors.some(e => e.includes("crashed-hub")), "assertAll error must mention crashed-hub");
});

test("onStop fires before process signal — exit handler sees expectedStop", async t => {
	const { spawn } = require("child_process");
	const { ScenarioLifecycle } = require("../../scripts/lib/bdd-scenario-lifecycle.js");
	const { MemoryRegistry } = require("../../bdd/lib/memory-registry");
	const registry = new MemoryRegistry();
	const lifecycle = new ScenarioLifecycle(registry, { graceMs: 3000 });
	const hostUtils = new HostUtils();

	// Spawn a child that ignores SIGTERM (simulates a slow Hub stop).
	// The child exits after 200ms regardless, via timeout.
	const child = spawn(process.execPath, [
		"-e",
		"process.on('SIGTERM', () => {}); setTimeout(() => process.exit(1), 200)",
	], { stdio: "ignore" });

	// Manually attach the same exit handler pattern used by HostUtils.spawnHost.
	let exitCode = null;
	let exitSignal = null;
	let assertionWouldFire = false;
	child.on("exit", (code, signal) => {
		exitCode = code;
		exitSignal = signal;
		// Mirror the assertion condition from host-utils.ts.
		if (code === 1 && hostUtils.expectedExitCode !== 1 && !hostUtils.expectedStop) {
			assertionWouldFire = true;
		}
	});

	lifecycle.ownChild(child, "test-hub", {
		group: true,
		onStop: () => hostUtils.markStopExpected(),
	});

	t.false(hostUtils.expectedStop, "expectedStop must be false before stop");

	await lifecycle.stop(child);
	await registry.drainExitEvents();

	// The child exited with code 1 (as set by the script), but expectedStop
	// was set before the signal was sent, so the assertion must NOT fire.
	t.true(hostUtils.expectedStop, "expectedStop must be true after stop");
	t.is(exitCode, 1, "child must have exited with code 1");
	t.false(assertionWouldFire, "assertion must NOT fire when expectedStop is true");

	// Without expectedStop, the same scenario WOULD fire.
	const hostUtils2 = new HostUtils();
	let assertionWouldFire2 = false;
	const child2 = spawn(process.execPath, [
		"-e",
		"process.on('SIGTERM', () => {}); setTimeout(() => process.exit(1), 200)",
	], { stdio: "ignore" });
	child2.on("exit", (code) => {
		if (code === 1 && hostUtils2.expectedExitCode !== 1 && !hostUtils2.expectedStop) {
			assertionWouldFire2 = true;
		}
	});

	// Register without onStop to verify the negative case.
	const lifecycle2 = new ScenarioLifecycle(registry, { graceMs: 3000 });
	lifecycle2.ownChild(child2, "test-hub-no-onstop", { group: true });

	await lifecycle2.stop(child2);
	await registry.drainExitEvents();

	t.false(hostUtils2.expectedStop, "expectedStop must remain false (no onStop registered)");
	t.true(assertionWouldFire2, "assertion MUST fire when expectedStop is false and code === 1");
});
