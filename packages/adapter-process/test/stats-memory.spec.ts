import test from "ava";
import { defaultConfig } from "@scramjet/config";
import { ProcessInstanceAdapter } from "../src/process-instance-adapter";

/**
 * Helper: create a bare ProcessInstanceAdapter with minimal config.
 */
function createAdapter(): ProcessInstanceAdapter {
    return new ProcessInstanceAdapter({
        ...defaultConfig,
        runnerEnvs: {},
        debug: false,
        verser2: { ...defaultConfig.verser2 },
    } as any);
}

test("stats returns processId and RSS memory fields when runnerProcess pid is set", async (t) => {
    const adapter = createAdapter();

    // Simulate a running child process by pointing runnerProcess at ourselves.
    // /proc/self/status is always readable in any Linux environment.
    (adapter as any).runnerProcess = { pid: process.pid };

    const result = await adapter.stats({ healthy: true });

    t.is(result.processId, process.pid, "processId should match runnerProcess.pid");
    t.is(typeof result.memoryUsage, "number", "memoryUsage should be a number");
    t.is(typeof result.memoryMaxUsage, "number", "memoryMaxUsage should be a number");
    t.true(result.memoryUsage! > 0, "memoryUsage should be positive");
    t.true(result.memoryMaxUsage! > 0, "memoryMaxUsage should be positive");
    t.true(result.healthy === true, "should pass through the healthy flag from input msg");
});

test("stats returns processId from processPID when runnerProcess is absent", async (t) => {
    const adapter = createAdapter();

    // Set a non-existent PID — processId should be returned but memory
    // fields should be absent since /proc/<pid> cannot be read.
    adapter.processPID = 2_147_483_647;

    const result = await adapter.stats({ healthy: true });

    t.is(result.processId, 2_147_483_647, "processId should equal processPID");
    // The /proc read for this non-existent PID will fail silently.
    t.true(result.healthy === true, "should pass through the healthy flag");
});

test("stats does not throw when unobservable (no runnerProcess, processPID === -1)", async (t) => {
    const adapter = createAdapter();

    // Defaults: runnerProcess is undefined, processPID is -1.
    const result = await adapter.stats({ healthy: true });

    t.is(result.processId, -1, "processId should be -1 (default processPID)");
    t.is(result.memoryUsage, undefined, "memoryUsage should be absent without a process");
    t.is(result.memoryMaxUsage, undefined, "memoryMaxUsage should be absent without a process");
    t.true(result.healthy === true, "should pass through the healthy flag");
});

test("stats does not throw when /proc read fails for a non-existent PID", async (t) => {
    const adapter = createAdapter();

    // Point runnerProcess at a very large PID that cannot exist.
    (adapter as any).runnerProcess = { pid: 2_147_483_647 };

    const result = await adapter.stats({ healthy: true });

    t.is(result.processId, 2_147_483_647, "processId should be set");
    // /proc read fails → memory fields are absent; no throw.
    t.is(result.memoryUsage, undefined, "memoryUsage should be absent on read failure");
    t.is(result.memoryMaxUsage, undefined, "memoryMaxUsage should be absent on read failure");
    t.true(result.healthy === true, "should pass through the healthy flag");
});
