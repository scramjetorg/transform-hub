import test from "ava";
import { PassThrough } from "stream";

import { CPMMessageCode, RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";

import {
    disconnectAfterRunnerShutdownGrace,
    isRunnerShutdownGraceEligible,
    observeShutdownControl,
    parseRunnerShutdownGraceMs,
    waitForRunnerShutdownGrace
} from "../../src/executor/shutdown-grace";
import type { ShutdownControlObserver } from "../../src/executor/shutdown-grace";
import type { ChildLifecycleSnapshot } from "../../src/executor/lifecycle-observer";
import { defer } from "@scramjet/utility";

const readyLifecycle: ChildLifecycleSnapshot = {
    ready: true,
    completed: false,
    stopped: false,
    valid: true
};

function makeCandidate(overrides: Partial<Parameters<typeof isRunnerShutdownGraceEligible>[0]> = {}) {
    return {
        runtimeKind: "python3",
        connectionFulfilled: true,
        rawChildCode: 1,
        signal: null,
        translatedExitCode: RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION,
        hardTeardown: false,
        lifecycle: readyLifecycle,
        stderrEnded: true,
        stderrErrored: false,
        ...overrides
    };
}

function controlPair() {
    const source = new PassThrough();
    const target = new PassThrough();
    const forwarded: Buffer[] = [];
    target.on("data", chunk => forwarded.push(Buffer.from(chunk)));
    source.pipe(target);
    const observer = observeShutdownControl(source, target);
    return { source, target, observer, forwarded };
}

test("shutdown grace parser defaults, accepts decimal milliseconds and the native timer limit", t => {
    t.is(parseRunnerShutdownGraceMs(undefined), 100);
    t.is(parseRunnerShutdownGraceMs("0"), 0);
    t.is(parseRunnerShutdownGraceMs(" 0005 "), 5);
    t.is(parseRunnerShutdownGraceMs("20"), 20);
    t.is(parseRunnerShutdownGraceMs("2147483647"), 2147483647);
});

test("shutdown grace parser rejects blank, non-decimal and out-of-range values", t => {
    for (const value of ["", " ", "-0", "-1", "+1", "1.5", "1e2", "0x10", "NaN", "Infinity", "2147483648"]) {
        t.throws(() => parseRunnerShutdownGraceMs(value), { message: "Invalid SCRAMJET_RUNNER_SHUTDOWN_GRACE_MS" });
    }
    t.throws(() => parseRunnerShutdownGraceMs(100 as unknown as string), { message: "Invalid SCRAMJET_RUNNER_SHUTDOWN_GRACE_MS" });
    const invalid = t.throws(() => parseRunnerShutdownGraceMs("private-raw-value"));
    t.is(invalid?.message, "Invalid SCRAMJET_RUNNER_SHUTDOWN_GRACE_MS");
    t.false(invalid?.message.includes("private-raw-value"));
});

test("eligibility allows clean completion with or without its terminal completion frame", t => {
    t.true(isRunnerShutdownGraceEligible(makeCandidate({
        runtimeKind: "node",
        rawChildCode: 0,
        translatedExitCode: RunnerExitCode.SUCCESS,
        lifecycle: { ...readyLifecycle, completed: true }
    })));
    t.true(isRunnerShutdownGraceEligible(makeCandidate({
        runtimeKind: "bun",
        rawChildCode: 0,
        translatedExitCode: RunnerExitCode.SUCCESS
    })));
    t.true(isRunnerShutdownGraceEligible(makeCandidate({
        runtimeKind: "python3",
        rawChildCode: 0,
        translatedExitCode: RunnerExitCode.SUCCESS,
        lifecycle: { ...readyLifecycle, completed: true }
    })));
});

test("eligibility permits only ready unframed raw1/canonical23 execution failures", t => {
    t.true(isRunnerShutdownGraceEligible(makeCandidate()));
    t.true(isRunnerShutdownGraceEligible(makeCandidate({ rawChildCode: RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION })));
    t.false(isRunnerShutdownGraceEligible(makeCandidate({ lifecycle: { ...readyLifecycle, completed: true } })));
    t.false(isRunnerShutdownGraceEligible(makeCandidate({ lifecycle: { ...readyLifecycle, stopped: true } })));
});

test("eligibility skips signals, STOPPED, startup/control failures, hard teardown and unsupported exits", t => {
    for (const candidate of [
        makeCandidate({ signal: "SIGPIPE" as NodeJS.Signals }),
        makeCandidate({ signal: "SIGTERM" }),
        makeCandidate({ signal: "SIGKILL" }),
        makeCandidate({ rawChildCode: 13 }),
        makeCandidate({ rawChildCode: RunnerExitCode.KILLED }),
        makeCandidate({ rawChildCode: RunnerExitCode.STOPPED }),
        makeCandidate({ rawChildCode: RunnerExitCode.DISCONNECTED }),
        makeCandidate({ rawChildCode: RunnerExitCode.SEQUENCE_FAILED_ON_START }),
        makeCandidate({ hardTeardown: true }),
        makeCandidate({ connectionFulfilled: false }),
        makeCandidate({ runtimeKind: "unknown" }),
        makeCandidate({ lifecycle: { ...readyLifecycle, ready: false } }),
        makeCandidate({ lifecycle: { ...readyLifecycle, valid: false } }),
        makeCandidate({ stderrEnded: false }),
        makeCandidate({ stderrErrored: true })
    ]) {
        t.false(isRunnerShutdownGraceEligible(candidate));
    }
});

test("control observer preserves original pipe bytes and ignores known nonterminal controls", t => {
    const { source, target, observer, forwarded } = controlPair();
    const original = `[${RunnerMessageCode.MONITORING_RATE},{"rate":1}]\r\n[${CPMMessageCode.LOAD},{}]\r\n`;
    source.write(original.slice(0, 9));
    source.write(original.slice(9));
    const unicodeFrame = Buffer.from(`[${RunnerMessageCode.EVENT},{"text":"é"}]\r\n`);
    const splitAt = unicodeFrame.indexOf(Buffer.from("é")) + 1;
    source.write(unicodeFrame.subarray(0, splitAt));
    source.write(unicodeFrame.subarray(splitAt));

    t.is(Buffer.concat(forwarded).toString(), original + unicodeFrame.toString());
    t.is(observer.reason, undefined);

    observer.dispose();
    source.destroy();
    target.destroy();
});

test("split STOP/KILL frames abort the signal once without changing the forwarded bytes", t => {
    for (const [code, reason] of [[RunnerMessageCode.STOP, "stop"], [RunnerMessageCode.KILL, "kill"]] as const) {
        const { source, target, observer, forwarded } = controlPair();
        const first = `[${code},{"timeout":`;
        const second = "1}]\r\n";
        source.write(first);
        source.write(second);

        t.is(observer.reason, reason);
        t.true(observer.signal.aborted);
        t.is(Buffer.concat(forwarded).toString(), first + second);

        observer.dispose();
        source.destroy();
        target.destroy();
    }
});

test("control observer rejects malformed, unknown, oversized and truncated frames", async t => {
    const scenarios: Array<{ name: string; write(source: PassThrough): Promise<void> | void; reason: string }> = [
        { name: "malformed json", write: source => { source.write("[4001,broken]\r\n"); }, reason: "observation-invalid" },
        { name: "invalid utf8", write: source => { source.write(Buffer.from([0xff, 0x0d, 0x0a])); }, reason: "observation-invalid" },
        { name: "unknown code", write: source => { source.write("[9999,{}]\r\n"); }, reason: "observation-invalid" },
        { name: "oversized frame", write: source => { source.write(`[${RunnerMessageCode.EVENT},{"data":"${"x".repeat(65540)}"}]\r\n`); }, reason: "observation-invalid" },
        { name: "truncated frame", write: async source => { source.write(`[${RunnerMessageCode.EVENT},{}`); source.end(); await new Promise<void>(resolve => source.once("end", resolve)); }, reason: "observation-invalid" },
        { name: "clean control eof", write: async source => { source.end(); await new Promise<void>(resolve => source.once("end", resolve)); }, reason: "control-ended" },
        { name: "control close", write: source => new Promise<void>(resolve => { source.once("close", resolve); source.destroy(); }), reason: "control-ended" }
    ];

    for (const scenario of scenarios) {
        const { source, target, observer } = controlPair();
        await scenario.write(source);
        t.is(observer.reason, scenario.reason, scenario.name);
        t.true(observer.signal.aborted, scenario.name);
        observer.dispose();
        source.destroy();
        target.destroy();
    }
});

test("takeover requires the original source-unpipe event and a retired child destination", t => {
    const { source, target, observer } = controlPair();
    source.unpipe(target);
    t.false(observer.takeOverAfterChildClose());
    t.is(observer.reason, "observation-invalid");
    observer.dispose();
    source.destroy();
    target.destroy();
});

test("takeover ignores an unpipe event from a different source", t => {
    const source = new PassThrough();
    const target = new PassThrough();
    const observer = observeShutdownControl(source, target);
    target.destroy();
    target.emit("unpipe", new PassThrough());

    t.false(observer.takeOverAfterChildClose());
    t.is(observer.reason, "observation-invalid");
    observer.dispose();
    source.destroy();
});

test("post-child takeover resumes once and consumes a buffered late STOP", async t => {
    for (const [code, reason] of [[RunnerMessageCode.STOP, "stop"], [RunnerMessageCode.KILL, "kill"]] as const) {
        const { source, target, observer } = controlPair();
        const originalResume = source.resume.bind(source);
        let resumeCalls = 0;
        let abortCalls = 0;
        source.resume = function () { resumeCalls++; return originalResume(); };
        observer.signal.addEventListener("abort", () => { abortCalls++; });

        source.unpipe(target);
        source.write(`[${code},{"timeout":0}]\r\n`);
        target.destroy();

        t.true(observer.takeOverAfterChildClose());
        t.is(resumeCalls, 1);
        await new Promise<void>(resolve => setImmediate(resolve));
        t.is(observer.reason, reason);
        t.is(abortCalls, 1);
        t.false(observer.takeOverAfterChildClose());

        observer.dispose();
        t.is(source.listenerCount("data"), 0);
        t.is(target.listenerCount("unpipe"), 0);
        source.destroy();
        target.destroy();
    }
});

test("grace helper bypasses delay and control takeover for zero or ineligible outcomes", async t => {
    let calls = 0;
    let takeovers = 0;
    const controller = new AbortController();
    const control: ShutdownControlObserver = {
        signal: controller.signal,
        reason: undefined,
        takeOverAfterChildClose: () => { takeovers++; return true; },
        finishGraceWindow: () => undefined,
        dispose: () => undefined
    };
    const delay = (() => { calls++; return Promise.resolve(); }) as unknown as typeof defer;

    t.deepEqual(await waitForRunnerShutdownGrace(0, true, control, delay), { status: "skipped", reason: "disabled" });
    t.deepEqual(await waitForRunnerShutdownGrace(100, false, control, delay), { status: "skipped", reason: "ineligible" });
    t.is(calls, 0);
    t.is(takeovers, 0);
});

test("actual disconnect boundary runs synchronously when grace is disabled or ineligible", async t => {
    let takeovers = 0;
    let delayCalls = 0;
    let disposals = 0;
    let disconnectCalls = 0;
    const controller = new AbortController();
    const control: ShutdownControlObserver = {
        signal: controller.signal,
        reason: undefined,
        takeOverAfterChildClose: () => { takeovers++; return true; },
        finishGraceWindow: () => undefined,
        dispose: () => { disposals++; }
    };
    const delay = (() => { delayCalls++; return Promise.resolve(); }) as unknown as typeof defer;
    const disconnected = disconnectAfterRunnerShutdownGrace(0, true, control, () => {
        disconnectCalls++;
        return Promise.resolve();
    }, () => undefined, delay);

    t.is(disconnectCalls, 1);
    t.is(takeovers, 0);
    t.is(delayCalls, 0);
    t.is(disposals, 1);
    await disconnected;

    const ineligible = disconnectAfterRunnerShutdownGrace(100, false, control, () => {
        disconnectCalls++;
        return Promise.resolve();
    }, () => undefined, delay);
    t.is(disconnectCalls, 2);
    t.is(takeovers, 0);
    t.is(delayCalls, 0);
    t.is(disposals, 2);
    await ineligible;
});

test("grace helper waits the configured duration and observes late aborts", async t => {
    const { source, target, observer } = controlPair();
    source.unpipe(target);
    target.destroy();
    let requestedMs = 0;
    const delay = ((ms: number, _value: undefined, options?: { signal?: AbortSignal }) => {
        requestedMs = ms;
        return new Promise<void>((_resolve, reject) => {
            options?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        });
    }) as unknown as typeof defer;

    const waiting = waitForRunnerShutdownGrace(100, true, observer, delay);
    t.is(requestedMs, 100);
    source.write(`[${RunnerMessageCode.KILL},{}]\r\n`);
    await new Promise<void>(resolve => setImmediate(resolve));
    t.deepEqual(await waiting, { status: "cancelled", reason: "kill" });

    observer.dispose();
    source.destroy();
    target.destroy();
});

test("fragmented late STOP and KILL frames cancel a pending grace exactly once", async t => {
    for (const [code, reason] of [[RunnerMessageCode.STOP, "stop"], [RunnerMessageCode.KILL, "kill"]] as const) {
        const { source, target, observer } = controlPair();
        source.unpipe(target);
        target.destroy();
        let abortCalls = 0;
        observer.signal.addEventListener("abort", () => { abortCalls++; });
        const delay = ((_ms: number, _value: undefined, options?: { signal?: AbortSignal }) => new Promise<void>((_resolve, reject) => {
            options?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        })) as unknown as typeof defer;

        const waiting = waitForRunnerShutdownGrace(100, true, observer, delay);
        source.write(`[${code},`);
        source.write("{}]\r");
        source.write("\n");
        await new Promise<void>(resolve => setImmediate(resolve));

        t.deepEqual(await waiting, { status: "cancelled", reason });
        t.is(abortCalls, 1);
        observer.dispose();
        source.destroy();
        target.destroy();
    }
});

test("control source error cancels grace without propagating diagnostic text", async t => {
    const { source, target, observer } = controlPair();
    source.destroy(Object.assign(new Error("private control payload"), { code: "EPIPE" }));
    await new Promise<void>(resolve => source.once("close", resolve));

    t.is(observer.reason, "control-error");
    t.true(observer.signal.aborted);
    observer.dispose();
    target.destroy();
});

test("unexpected timer rejection is skipped rather than treated as elapsed", async t => {
    const { source, target, observer } = controlPair();
    source.unpipe(target);
    target.destroy();
    const delay = (() => Promise.reject(new Error("private timer detail"))) as unknown as typeof defer;

    t.deepEqual(await waitForRunnerShutdownGrace(100, true, observer, delay), { status: "skipped", reason: "observation-invalid" });
    observer.dispose();
    source.destroy();
    target.destroy();
});

test("an incomplete control frame at grace expiry makes the outcome incomplete", async t => {
    const { source, target, observer } = controlPair();
    source.unpipe(target);
    target.destroy();
    let resolveTimer!: () => void;
    const delay = ((_ms: number, _value: undefined, _options?: { signal?: AbortSignal }) => new Promise<void>(resolve => {
        resolveTimer = resolve;
    })) as unknown as typeof defer;

    const waiting = waitForRunnerShutdownGrace(100, true, observer, delay);
    source.write(`[${RunnerMessageCode.KILL},`);
    await new Promise<void>(resolve => setImmediate(resolve));
    resolveTimer();

    t.deepEqual(await waiting, { status: "skipped", reason: "observation-invalid" });
    observer.dispose();
    source.destroy();
    target.destroy();
});
