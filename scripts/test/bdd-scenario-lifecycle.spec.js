"use strict";

const test = require("ava").default;
const { spawn } = require("child_process");
require("ts-node/register");
const { ScenarioLifecycle, stopProcess, isAlive } = require("../../scripts/lib/bdd-scenario-lifecycle.js");
const { MemoryRegistry } = require("../../bdd/lib/memory-registry");
const { cleanupScenarioWorldResources } = require("../../scripts/lib/bdd-memory-hooks-lib.js");

test("scenario lifecycle marks immediately before TERM and cleans a child", async t => {
    const registry = new MemoryRegistry();
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 10000)"], { stdio: "ignore" });
    const lifecycle = new ScenarioLifecycle(registry, { graceMs: 1000 });
    lifecycle.ownChild(child, "scenario-hub");

    await lifecycle.cleanup();
    await registry.drainExitEvents();

    t.is(registry.processCount, 0);
    t.is((await registry.assertAll()).length, 0);
});

test("pre-cleanup spontaneous exit remains visible to the registry", async t => {
    const registry = new MemoryRegistry();
    const child = spawn(process.execPath, ["-e", "process.exit(7)"], { stdio: "ignore" });
    const lifecycle = new ScenarioLifecycle(registry);
    lifecycle.ownChild(child, "scenario-manager");

    await new Promise(resolve => child.once("exit", resolve));
    await lifecycle.cleanup();
    const errors = await registry.assertAll();

    t.true(errors.some(error => error.includes("scenario-manager")));
});

test("expected natural exit is marked before the wait and is not reported", async t => {
    const registry = new MemoryRegistry();
    const child = spawn(process.execPath, ["-e", "process.exit(0)"], { stdio: "ignore" });
    const lifecycle = new ScenarioLifecycle(registry);
    lifecycle.ownChild(child, "startup-failure-hub");
    lifecycle.expect(child);

    await new Promise(resolve => child.once("exit", resolve));
    await lifecycle.cleanup();

    t.deepEqual(await registry.assertAll(), []);
});

test("scenario lifecycle escalates TERM to KILL after the grace period", async t => {
    const registry = new MemoryRegistry();
    const child = spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"], { stdio: "ignore" });
    const lifecycle = new ScenarioLifecycle(registry, { graceMs: 20 });
    lifecycle.ownChild(child, "stubborn-manager");

    await lifecycle.cleanup();
    await registry.drainExitEvents();

    t.is(registry.processCount, 0);
    t.is((await registry.assertAll()).length, 0);
});

test("scenario container ownership marks registry visibility immediately before stop", async t => {
    const registry = new MemoryRegistry();
    const lifecycle = new ScenarioLifecycle(registry);
    let stopped = false;
    lifecycle.ownContainer("scenario-container", "runner:docker", async () => { stopped = true; });

    await lifecycle.cleanup();

    t.true(stopped);
    t.true(registry.trackedContainers.get("scenario-container").expectExit);
});

test("scenario cleanup helper invokes ownership cleanup even without memory guard state", async t => {
    let cleaned = false;
    const world = { resources: { value: "released" }, cliResources: {} };
    await cleanupScenarioWorldResources(world, { cleanup: async () => { cleaned = true; } });

    t.true(cleaned);
    t.is(world.resources.value, undefined);
});

test("stopProcess rejects when TERM cannot signal a still-live target", async t => {
    const originalKill = process.kill;
    Object.defineProperty(process, "kill", { configurable: true, writable: true, value: (pid, signal) => {
        if (signal === 0) return true;
        throw Object.assign(new Error("permission denied"), { code: "EPERM" });
    } });

    try {
        await t.throwsAsync(
            stopProcess({ pid: 123456, label: "unreachable-owner" }, 5),
            { message: /could not be signalled with SIGTERM/ }
        );
    } finally {
        Object.defineProperty(process, "kill", { configurable: true, writable: true, value: originalKill });
    }
});

test("scenario lifecycle aggregates teardown errors and still attempts every owner", async t => {
    const registry = new MemoryRegistry();
    const lifecycle = new ScenarioLifecycle(registry);
    let secondStopped = false;
    lifecycle.ownContainer("container-one", "first", async () => { throw new Error("first stop failed"); });
    lifecycle.ownContainer("container-two", "second", async () => { secondStopped = true; });

    const error = await t.throwsAsync(lifecycle.cleanup());

    t.true(secondStopped);
    t.is(error.cleanupErrors.length, 1);
    t.true(error.cleanupErrors[0].message.includes("first stop failed"));
});

test("failed explicit teardown retains ownership for retry", async t => {
    const registry = new MemoryRegistry();
    const lifecycle = new ScenarioLifecycle(registry);
    let attempts = 0;
    lifecycle.ownContainer("retry-container", "retry-owner", async () => {
        attempts++;
        if (attempts === 1) throw new Error("temporary stop failure");
    });

    await t.throwsAsync(lifecycle.stop("retry-container"), { message: /temporary stop failure/ });
    await lifecycle.stop("retry-container");

    t.is(attempts, 2);
    t.true(registry.trackedContainers.get("retry-container").expectExit);
});

test("group-owned explicit stop terminates a MultiManager-like descendant", async t => {
    const registry = new MemoryRegistry();
    const owner = spawn(process.execPath, [
        "-e",
        "const {spawn}=require('child_process'); const child=spawn(process.execPath,['-e','setInterval(()=>{},10000)'],{stdio:'ignore'}); console.log(child.pid); setInterval(()=>{},10000);",
    ], { detached: true, stdio: ["ignore", "pipe", "ignore"] });
    const descendantPid = Number(await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("descendant PID not reported")), 2000);
        owner.stdout.once("data", data => { clearTimeout(timer); resolve(data.toString().trim()); });
    }));
    const lifecycle = new ScenarioLifecycle(registry, { graceMs: 1000 });
    lifecycle.ownChild(owner, "multi-manager", { group: true });

    await lifecycle.stop(owner);
    await registry.drainExitEvents();
    await new Promise(resolve => setTimeout(resolve, 100));

    t.false(isAlive(descendantPid), "descendant should be terminated with the process group");
    t.is(registry.processCount, 0);
});

// -- PID-only ownership (ownProcess) lifecycle-residual tests --

test("ownProcess PID marked expected after confirmed exit is not reported", async t => {
    // Simulates the "runner has ended execution" step: after confirming the
    // process has exited, the step explicitly marks the PID expected.
    const registry = new MemoryRegistry();
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 1000)"], { stdio: "ignore" });
    const lifecycle = new ScenarioLifecycle(registry);

    lifecycle.ownProcess(child.pid, "runner-pid");
    child.kill();
    await new Promise(resolve => child.once("exit", resolve));

    // Simulate step calling lifecycle.expect() after confirming exit.
    lifecycle.expect(child.pid);
    await lifecycle.cleanup();
    await registry.drainExitEvents();

    t.is((await registry.assertAll()).length, 0);
});

test("unconfirmed dead ownProcess PID remains an assertAll error", async t => {
    // Oracle blocker: an ownProcess PID whose exit is NOT explicitly
    // confirmed before cleanup must remain visible as an unexpected exit.
    // Only the "runner has ended execution" step may mark it expected.
    const registry = new MemoryRegistry();
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 1000)"], { stdio: "ignore" });
    const lifecycle = new ScenarioLifecycle(registry);

    lifecycle.ownProcess(child.pid, "runner-pid");
    child.kill();
    await new Promise(resolve => child.once("exit", resolve));

    // No explicit expect() call — cleanup must NOT mark it.
    await lifecycle.cleanup();
    await registry.drainExitEvents();

    const errors = await registry.assertAll();
    t.true(errors.some(error => error.includes("runner-pid")), "unconfirmed dead ownProcess PID must be reported as unexpected");
});
