import test from "ava";
import { PassThrough } from "stream";

import { InstanceStatus, RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";

import { LifecycleContext, LifecycleDeps, RunnerLifecycle } from "../src/lifecycle";

type Frame = [number, Record<string, unknown>];

function makeMonitor(): { stream: PassThrough; frames: () => Frame[] } {
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer) => chunks.push(chunk));

    return {
        stream,
        frames: () =>
            Buffer.concat(chunks)
                .toString("utf8")
                .split("\r\n")
                .filter(line => line.length > 0)
                .map(line => JSON.parse(line) as Frame),
    };
}

function makeContext(overrides?: Partial<LifecycleContext>): LifecycleContext {
    return {
        stopHandler: async () => { /* noop */ },
        killHandler: () => { /* noop */ },
        ...overrides,
    };
}

function makeDeps(
    context: LifecycleContext,
    monitorStream: PassThrough,
    overrides?: Partial<Omit<LifecycleDeps, "context" | "monitorStream">>
): LifecycleDeps {
    return {
        context,
        monitorStream,
        ...overrides,
    };
}

test("lifecycle parity: handleStopRequest forwards timeout and canCallKeepalive to context.stopHandler", async t => {
    const monitor = makeMonitor();
    const calls: { timeout: number; canCallKeepalive: boolean }[] = [];
    const context = makeContext({
        stopHandler: async (timeout, canCallKeepalive) => {
            calls.push({ timeout, canCallKeepalive });
        },
    });
    const lifecycle = new RunnerLifecycle(makeDeps(context, monitor.stream));

    await lifecycle.handleStopRequest({ timeout: 5000, canCallKeepalive: true });

    t.is(calls.length, 1);
    t.is(calls[0].timeout, 5000);
    t.is(calls[0].canCallKeepalive, true);

    await lifecycle.handleStopRequest({ timeout: 0, canCallKeepalive: false });

    t.is(calls.length, 2);
    t.is(calls[1].timeout, 0);
    t.is(calls[1].canCallKeepalive, false);
});

test("lifecycle parity: keepAliveIssued suppresses SEQUENCE_STOPPED when canCallKeepalive is true", async t => {
    const monitor = makeMonitor();
    const context = makeContext({
        stopHandler: async (_timeout, _canCallKeepalive) => {
            // keepAliveIssued must be called during stopHandler for suppression
        },
    });
    const lifecycle = new RunnerLifecycle(makeDeps(context, monitor.stream));

    // Simulate the sequence calling keepAlive() from within its stop handler.
    const origStopHandler = context.stopHandler.bind(context);
    context.stopHandler = async (timeout, canCallKeepalive) => {
        lifecycle.keepAliveIssued();
        await origStopHandler(timeout, canCallKeepalive);
    };

    await lifecycle.handleStopRequest({ timeout: 1000, canCallKeepalive: true });

    const frames = monitor.frames();

    t.is(frames.length, 0);
    t.true(lifecycle.isStopExpected);
});

test("lifecycle parity: SEQUENCE_STOPPED is emitted when canCallKeepalive is false even if keepAlive was issued", async t => {
    const monitor = makeMonitor();
    const context = makeContext();
    const lifecycle = new RunnerLifecycle(makeDeps(context, monitor.stream));

    lifecycle.keepAliveIssued();
    await lifecycle.handleStopRequest({ timeout: 1000, canCallKeepalive: false });

    const frames = monitor.frames();

    t.is(frames.length, 1);
    t.is(frames[0][0], RunnerMessageCode.SEQUENCE_STOPPED);
    t.is(frames[0][1].sequenceError, undefined);
    t.true(lifecycle.isStopExpected);
});

test("lifecycle parity: SEQUENCE_STOPPED is emitted when keepAlive was not requested", async t => {
    const monitor = makeMonitor();
    const context = makeContext();
    const lifecycle = new RunnerLifecycle(makeDeps(context, monitor.stream));

    await lifecycle.handleStopRequest({ timeout: 1000, canCallKeepalive: true });

    const frames = monitor.frames();

    t.is(frames.length, 1);
    t.is(frames[0][0], RunnerMessageCode.SEQUENCE_STOPPED);
    t.is(frames[0][1].sequenceError, undefined);
    t.true(lifecycle.isStopExpected);
});

test("lifecycle parity: handleStopRequest captures sequenceError and forwards it in SEQUENCE_STOPPED", async t => {
    const monitor = makeMonitor();
    const stopError = new Error("stop-failed");
    const context = makeContext({
        stopHandler: async () => {
            throw stopError;
        },
    });
    const lifecycle = new RunnerLifecycle(makeDeps(context, monitor.stream));

    await lifecycle.handleStopRequest({ timeout: 1000, canCallKeepalive: false });

    const frames = monitor.frames();

    t.is(frames.length, 1);
    t.is(frames[0][0], RunnerMessageCode.SEQUENCE_STOPPED);
    t.truthy(frames[0][1].sequenceError);
    t.true(lifecycle.isStopExpected);
});

test("lifecycle parity: handleStopRequest resets keepAliveRequested before calling stopHandler", async t => {
    const monitor = makeMonitor();
    const context = makeContext({
        stopHandler: async () => {
            // keepAliveRequested should already be false when stopHandler runs
        },
    });
    const lifecycle = new RunnerLifecycle(makeDeps(context, monitor.stream));

    lifecycle.keepAliveIssued();
    t.true(lifecycle.isKeepAliveRequested);

    await lifecycle.handleStopRequest({ timeout: 1000, canCallKeepalive: true });

    // After handleStopRequest, keepAliveRequested is reset to false.
    // Since canCallKeepalive is true and keepAliveRequested is now false,
    // SEQUENCE_STOPPED should be emitted.
    const frames = monitor.frames();

    t.is(frames.length, 1);
    t.is(frames[0][0], RunnerMessageCode.SEQUENCE_STOPPED);
});

test("lifecycle parity: unexpected KILL sets status KILLING and exits with KILLED", async t => {
    const monitor = makeMonitor();
    const context = makeContext();
    const statusChanges: InstanceStatus[] = [];
    const exits: RunnerExitCode[] = [];
    const lifecycle = new RunnerLifecycle(
        makeDeps(context, monitor.stream, {
            onStatusChange: status => statusChanges.push(status),
            onExit: code => exits.push(code),
        })
    );

    await lifecycle.handleKillRequest();

    t.deepEqual(statusChanges, [InstanceStatus.KILLING]);
    t.deepEqual(exits, [RunnerExitCode.KILLED]);
    t.false(lifecycle.isStopExpected);
});

test("lifecycle parity: expected KILL (after STOP) sets status STOPPING and exits with STOPPED", async t => {
    const monitor = makeMonitor();
    const context = makeContext();
    const statusChanges: InstanceStatus[] = [];
    const exits: RunnerExitCode[] = [];
    const lifecycle = new RunnerLifecycle(
        makeDeps(context, monitor.stream, {
            onStatusChange: status => statusChanges.push(status),
            onExit: code => exits.push(code),
        })
    );

    await lifecycle.handleStopRequest({ timeout: 1000, canCallKeepalive: false });
    await lifecycle.handleKillRequest();

    t.deepEqual(statusChanges, [InstanceStatus.STOPPING, InstanceStatus.STOPPING]);
    t.deepEqual(exits, [RunnerExitCode.STOPPED]);
    t.true(lifecycle.isStopExpected);
});

test("lifecycle parity: handleKillRequest invokes context.killHandler", async t => {
    const monitor = makeMonitor();
    let killed = false;
    const context = makeContext({
        killHandler: () => {
            killed = true;
        },
    });
    const lifecycle = new RunnerLifecycle(makeDeps(context, monitor.stream));

    await lifecycle.handleKillRequest();

    t.true(killed);
});

test("lifecycle parity: cleanup clears monitoringInterval and monitoringMessageReplyTimeout", async t => {
    const monitor = makeMonitor();
    const context = makeContext();
    const lifecycle = new RunnerLifecycle(makeDeps(context, monitor.stream));

    let intervalFired = false;
    let timeoutFired = false;

    const fakeInterval = setInterval(() => { intervalFired = true; }, 10);
    const fakeTimeout = setTimeout(() => { timeoutFired = true; }, 10);

    lifecycle.setMonitoringInterval(fakeInterval);
    lifecycle.setMonitoringMessageReplyTimeout(fakeTimeout);
    lifecycle.cleanup();

    await new Promise(res => setTimeout(res, 50));

    t.false(intervalFired);
    t.false(timeoutFired);
});

test("lifecycle parity: cleanup is safe to call when no timers are set", async t => {
    const monitor = makeMonitor();
    const context = makeContext();
    const lifecycle = new RunnerLifecycle(makeDeps(context, monitor.stream));

    t.notThrows(() => lifecycle.cleanup());
});

test("lifecycle parity: handleStopRequest sets stopExpected true even when keepAlive suppresses SEQUENCE_STOPPED", async t => {
    const monitor = makeMonitor();
    let lifecycle!: RunnerLifecycle;
    const context = makeContext({
        stopHandler: async () => { lifecycle.keepAliveIssued(); },
    });

    lifecycle = new RunnerLifecycle(makeDeps(context, monitor.stream));

    await lifecycle.handleStopRequest({ timeout: 1000, canCallKeepalive: true });

    t.true(lifecycle.isStopExpected);
    t.is(monitor.frames().length, 0);
});

test("lifecycle parity: subsequent KILL after expected stop still uses STOPPED", async t => {
    const monitor = makeMonitor();
    const context = makeContext();
    const exits: RunnerExitCode[] = [];
    const lifecycle = new RunnerLifecycle(
        makeDeps(context, monitor.stream, {
            onExit: code => exits.push(code),
        })
    );

    await lifecycle.handleStopRequest({ timeout: 1000, canCallKeepalive: false });
    await lifecycle.handleKillRequest();
    await lifecycle.handleKillRequest();

    t.deepEqual(exits, [RunnerExitCode.STOPPED, RunnerExitCode.STOPPED]);
    t.true(lifecycle.isStopExpected);
});
