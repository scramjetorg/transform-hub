import test from "ava";
import { EventEmitter } from "events";
import { PassThrough } from "stream";

import { RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";
import { defer } from "@scramjet/utility";

import { waitForChildClose, waitForChildCloseAndConnection } from "../../src/executor/child-close";
import {
    disconnectAfterRunnerShutdownGrace,
    isRunnerShutdownGraceEligible,
    observeShutdownControl,
    prepareRunnerShutdownGraceStartup
} from "../../src/executor/shutdown-grace";

test("launcher startup gate reports early20 without constructing a transport or child resource", t => {
    let resourceConstructions = 0;
    let reportedSetting: string | undefined;
    const exitSentinel = Object.assign(new Error("early exit"), { exitCode: RunnerExitCode.INVALID_ENV_VARS });

    const thrown = t.throws(() => prepareRunnerShutdownGraceStartup(
        "invalid-private-value",
        () => {
            reportedSetting = "SCRAMJET_RUNNER_SHUTDOWN_GRACE_MS:invalid";
            throw exitSentinel;
        },
        graceMs => {
            resourceConstructions++;
            return graceMs;
        }
    ), { message: "early exit" });

    t.is(thrown, exitSentinel);
    t.is(exitSentinel.exitCode, 20);
    t.is(reportedSetting, "SCRAMJET_RUNNER_SHUTDOWN_GRACE_MS:invalid");
    t.is(resourceConstructions, 0);

    const valid = prepareRunnerShutdownGraceStartup("0100", () => { throw new Error("unexpected invalid"); }, graceMs => {
        resourceConstructions++;
        return graceMs;
    });
    t.is(valid.durationMs, 100);
    t.is(valid.resource, 100);
    t.is(resourceConstructions, 1);
});

test("fulfilled connection and natural child close wait once before original disconnect", async t => {
    const child = new EventEmitter();
    const childClose = waitForChildClose(child as unknown as Parameters<typeof waitForChildClose>[0]);
    let resolveConnection!: () => void;
    const connection = new Promise<void>(resolve => { resolveConnection = resolve; });
    const source = new PassThrough();
    const target = new PassThrough();
    target.resume();
    source.pipe(target);
    const control = observeShutdownControl(source, target);
    const events: string[] = [];
    let releaseGrace!: () => void;
    let disconnectCalls = 0;
    const delay = ((ms: number, _value: undefined, _options?: { signal?: AbortSignal }) => {
        events.push(`grace-start:${ms}`);
        return new Promise<void>(resolve => { releaseGrace = resolve; });
    }) as unknown as typeof defer;

    const finalization = waitForChildCloseAndConnection(childClose, connection).then(({ close, connection: outcome }) => {
        events.push("coordinated");
        const candidate = isRunnerShutdownGraceEligible({
            runtimeKind: "node",
            connectionFulfilled: outcome.status === "fulfilled",
            rawChildCode: close.code,
            signal: close.signal,
            translatedExitCode: RunnerExitCode.SUCCESS,
            hardTeardown: false,
            lifecycle: { ready: true, completed: true, stopped: false, valid: true },
            stderrEnded: true,
            stderrErrored: false
        });
        return disconnectAfterRunnerShutdownGrace(
            100,
            candidate,
            control,
            () => { disconnectCalls++; events.push("original-disconnect"); return Promise.resolve(); },
            result => events.push(`disposed:${result.status}`),
            delay
        );
    });

    source.unpipe(target);
    target.destroy();
    child.emit("close", 0, null);
    resolveConnection();
    await new Promise<void>(resolve => setImmediate(resolve));

    t.deepEqual(events, ["coordinated", "grace-start:100"]);
    t.is(disconnectCalls, 0);

    releaseGrace();
    await finalization;
    t.deepEqual(events, ["coordinated", "grace-start:100", "disposed:elapsed", "original-disconnect"]);
    t.is(disconnectCalls, 1);
    source.destroy();
});

test("ineligible child terminal outcomes skip the timer but preserve one original disconnect", async t => {
    const child = new EventEmitter();
    const childClose = waitForChildClose(child as unknown as Parameters<typeof waitForChildClose>[0]);
    const connection = Promise.resolve();
    const control = {
        signal: new AbortController().signal,
        reason: undefined,
        takeOverAfterChildClose: () => { t.fail("ineligible path must not take over fd4"); return false; },
        finishGraceWindow: () => undefined,
        dispose: () => undefined
    };
    let delayCalls = 0;
    let disconnectCalls = 0;
    const delay = (() => { delayCalls++; return Promise.resolve(); }) as unknown as typeof defer;

    const finalization = waitForChildCloseAndConnection(childClose, connection).then(({ close, connection: outcome }) => {
        const eligible = isRunnerShutdownGraceEligible({
            runtimeKind: "python3",
            connectionFulfilled: outcome.status === "fulfilled",
            rawChildCode: close.code,
            signal: close.signal,
            translatedExitCode: RunnerExitCode.STOPPED,
            hardTeardown: true,
            lifecycle: { ready: true, completed: false, stopped: true, valid: true },
            stderrEnded: true,
            stderrErrored: false
        });
        return disconnectAfterRunnerShutdownGrace(
            100,
            eligible,
            control,
            () => { disconnectCalls++; return Promise.resolve(); },
            result => t.deepEqual(result, { status: "skipped", reason: "ineligible" }),
            delay
        );
    });

    child.emit("close", null, "SIGTERM");
    await finalization;
    t.is(delayCalls, 0);
    t.is(disconnectCalls, 1);
});

test("unexpected grace timer rejection still reaches the original disconnect once", async t => {
    const controller = new AbortController();
    const control = {
        signal: controller.signal,
        reason: undefined,
        takeOverAfterChildClose: () => true,
        finishGraceWindow: () => undefined,
        dispose: () => undefined
    };
    let disconnectCalls = 0;
    const delay = (() => Promise.reject(new Error("sensitive timer detail"))) as unknown as typeof defer;
    let resultStatus: string | undefined;
    await disconnectAfterRunnerShutdownGrace(
        100,
        true,
        control,
        () => { disconnectCalls++; return Promise.resolve(); },
        result => { resultStatus = result.status; t.deepEqual(result, { status: "skipped", reason: "observation-invalid" }); },
        delay
    );

    t.is(resultStatus, "skipped");
    t.is(disconnectCalls, 1);
    t.is(controller.signal.aborted, false);
});

test("late fd4 KILL cancellation returns to the original disconnect exactly once", async t => {
    const child = new EventEmitter();
    const childClose = waitForChildClose(child as unknown as Parameters<typeof waitForChildClose>[0]);
    let resolveConnection!: () => void;
    const connection = new Promise<void>(resolve => { resolveConnection = resolve; });
    const source = new PassThrough();
    const target = new PassThrough();
    target.resume();
    source.pipe(target);
    const control = observeShutdownControl(source, target);
    let disconnectCalls = 0;
    const delay = ((_ms: number, _value: undefined, options?: { signal?: AbortSignal }) => new Promise<void>((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    })) as unknown as typeof defer;

    const finalization = waitForChildCloseAndConnection(childClose, connection).then(({ close, connection: outcome }) => {
        const candidate = isRunnerShutdownGraceEligible({
            runtimeKind: "python3",
            connectionFulfilled: outcome.status === "fulfilled",
            rawChildCode: close.code,
            signal: close.signal,
            translatedExitCode: RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION,
            hardTeardown: false,
            lifecycle: { ready: true, completed: false, stopped: false, valid: true },
            stderrEnded: true,
            stderrErrored: false
        });
        return disconnectAfterRunnerShutdownGrace(
            100,
            candidate,
            control,
            () => { disconnectCalls++; return Promise.resolve(); },
            result => t.deepEqual(result, { status: "cancelled", reason: "kill" }),
            delay
        );
    });

    source.unpipe(target);
    target.destroy();
    child.emit("close", 1, null);
    resolveConnection();
    await new Promise<void>(resolve => setImmediate(resolve));
    source.write(`[${RunnerMessageCode.KILL},`);
    source.write("{}]\r\n");

    await finalization;
    t.is(disconnectCalls, 1);
    source.destroy();
});
