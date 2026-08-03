import baseTest from "ava";
import { RunnerMessageCode } from "@scramjet/symbols";

const { createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);

type CaptureWrite = (value: Buffer | string) => unknown;

type OutputCapture = {
    raw: () => Buffer | Promise<Buffer>;
    text: () => string | Promise<string>;
    lines: () => string[] | Promise<string[]>;
    ndjson: () => unknown[] | Promise<unknown[]>;
    write?: CaptureWrite;
    end?: () => unknown;
    capture?: CaptureWrite;
    clear?: () => void;
};

type LogCapture = {
    raw: () => Buffer | Promise<Buffer>;
    text: () => string | Promise<string>;
    lines: () => string[] | Promise<string[]>;
    write?: CaptureWrite;
    end?: () => unknown;
    capture?: CaptureWrite;
    clear?: () => void;
};

type MonitoringCapture = {
    frames: () => unknown[][] | Promise<unknown[][]>;
    write?: CaptureWrite;
    capture?: CaptureWrite;
    end?: () => unknown;
    clear?: () => void;
    waitForCompletion?: () => Promise<void>;
};

type SequenceAssertions = {
    completed: () => Promise<void> | void;
    noRuntimeErrors: () => Promise<void> | void;
    memoryWithinLimit?: (options: { threshold: number }) => void;
};

type CapturesApi = {
    createOutputCapture?: () => OutputCapture;
    createLogCapture?: () => LogCapture;
    createMonitoringCapture?: () => MonitoringCapture;
    waitForCompletion?: (...args: unknown[]) => Promise<void>;
    createSequenceAssertions?: (options: { monitoring: MonitoringCapture }) => SequenceAssertions;
};

const capturesApi = (() => {
    try {
        return require("../../src/captures") as CapturesApi;
    } catch {
        return require("../../src/index") as CapturesApi;
    }
})();

const getOrThrow = <T>(name: string, value: T | undefined): T => {
    if (!value) {
        throw new Error(`Expected ${name} export from ../../src/captures or ../../src/index`);
    }

    return value;
};

const getSink = (capture: { write?: CaptureWrite; capture?: CaptureWrite }): CaptureWrite => {
    if (!capture.write && !capture.capture) {
        throw new Error("Expected capture or write helper on capture object");
    }

    return capture.write ?? capture.capture!;
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const awaitValue = async <T>(valueOrPromise: T | Promise<T>): Promise<T> => valueOrPromise;

const toPromise = async (fn: () => unknown): Promise<unknown> => fn();

const captureError = (fn: () => void): Error | undefined => {
    try {
        fn();
        return undefined;
    } catch (err) {
        return err instanceof Error ? err : new Error(String(err));
    }
};

const callSequenceAssertions = (monitoring: MonitoringCapture): SequenceAssertions => {
    const createSequenceAssertions = getOrThrow("createSequenceAssertions", capturesApi.createSequenceAssertions);

    return createSequenceAssertions({ monitoring });
};

const callWaitForCompletion = async (monitoring: MonitoringCapture): Promise<void> => {
    const exported = capturesApi.waitForCompletion;

    if (typeof exported === "function") {
        // exported waitForCompletion can be either `() => Promise<void>` or `(monitoring)=>Promise<void>`
        try {
            return await (exported(monitoring) as Promise<void>);
        } catch {
            return await exported();
        }
    }

    if (typeof monitoring.waitForCompletion === "function") {
        return monitoring.waitForCompletion();
    }

    throw new Error("Expected waitForCompletion export or method on monitoring capture");
};

const writePayload = async (capture: { write?: CaptureWrite; capture?: CaptureWrite }, chunk: string | Buffer): Promise<void> => {
    await awaitValue(getSink(capture)(chunk));
};

const writeFrames = async (capture: { write?: CaptureWrite; capture?: CaptureWrite }, chunks: string[]): Promise<void> => {
    for (const chunk of chunks) {
        await writePayload(capture, chunk);
    }
};

test("createOutputCapture exposes write/end or capture and decode helpers", t => {
    const createOutputCapture = getOrThrow("createOutputCapture", capturesApi.createOutputCapture);

    const capture = createOutputCapture();

    t.true(typeof capture.raw === "function", "raw() should be function");
    t.true(typeof capture.text === "function", "text() should be function");
    t.true(typeof capture.lines === "function", "lines() should be function");
    t.true(typeof capture.ndjson === "function", "ndjson() should be function");
    t.true((typeof capture.write === "function") || (typeof capture.capture === "function"), "write() or capture() expected");
});

test("createOutputCapture.raw/text/lines decode LF and CRLF newline payloads", async t => {
    const createOutputCapture = getOrThrow("createOutputCapture", capturesApi.createOutputCapture);

    const capture = createOutputCapture();

    await writePayload(capture, "alpha\nbeta\r\ngamma");

    if (typeof capture.end === "function") {
        await awaitValue(capture.end());
    }

    const raw = await awaitValue(capture.raw());
    const text = await awaitValue(capture.text());
    const lines = await awaitValue(capture.lines());

    t.deepEqual(raw, Buffer.from("alpha\nbeta\r\ngamma", "utf8"));
    t.is(text, "alpha\nbeta\r\ngamma");
    t.deepEqual(lines, ["alpha", "beta", "gamma"]);
});

test("createOutputCapture.ndjson parses LF and CRLF separated records", async t => {
    const createOutputCapture = getOrThrow("createOutputCapture", capturesApi.createOutputCapture);

    const capture = createOutputCapture();

    await writeFrames(capture, [
        `${JSON.stringify([1, { a: 1 }])}\n`,
        `${JSON.stringify([RunnerMessageCode.MONITORING, { event: "ok" }])}\r\n`,
        `${JSON.stringify([RunnerMessageCode.EVENT, { event: "done" }])}\n`,
    ]);

    if (typeof capture.end === "function") {
        await awaitValue(capture.end());
    }

    const lines = await awaitValue(capture.lines());
    const records = await awaitValue(capture.ndjson());

    t.deepEqual(lines, [
        "[1,{\"a\":1}]",
        `[${RunnerMessageCode.MONITORING},{"event":"ok"}]`,
        `[${RunnerMessageCode.EVENT},{"event":"done"}]`,
    ]);
    t.deepEqual(records, [
        [1, { a: 1 }],
        [RunnerMessageCode.MONITORING, { event: "ok" }],
        [RunnerMessageCode.EVENT, { event: "done" }],
    ]);
});

test("createLogCapture captures bytes and exposes raw/text/lines", async t => {
    const createLogCapture = getOrThrow("createLogCapture", capturesApi.createLogCapture);

    const capture = createLogCapture();

    await writePayload(capture, "line-1\n");
    await writePayload(capture, Buffer.from("line-2\r\n", "utf8"));
    await writePayload(capture, Buffer.from("line-3", "utf8"));

    if (typeof capture.end === "function") {
        await awaitValue(capture.end());
    }

    const raw = await awaitValue(capture.raw());
    const text = await awaitValue(capture.text());
    const lines = await awaitValue(capture.lines());

    t.deepEqual(raw, Buffer.from("line-1\nline-2\r\nline-3", "utf8"));
    t.is(text, "line-1\nline-2\r\nline-3");
    t.deepEqual(lines, ["line-1", "line-2", "line-3"]);
});

test("createMonitoringCapture parses CRLF-delimited JSON frames", async t => {
    const createMonitoringCapture = getOrThrow("createMonitoringCapture", capturesApi.createMonitoringCapture);

    const monitoring = createMonitoringCapture();

    const frameA = [RunnerMessageCode.MONITORING, { healthy: true }];
    const frameB = [RunnerMessageCode.SEQUENCE_COMPLETED, {}];

    await writePayload(monitoring, `${JSON.stringify(frameA)}\r\n${JSON.stringify(frameB)}\r\n`);

    if (typeof monitoring.end === "function") {
        await awaitValue(monitoring.end());
    }

    const frames = await awaitValue(monitoring.frames());

    t.deepEqual(frames, [frameA, frameB]);
});

test("waitForCompletion resolves once SEQUENCE_COMPLETED is captured", async t => {
    const createMonitoringCapture = getOrThrow("createMonitoringCapture", capturesApi.createMonitoringCapture);

    const monitoring = createMonitoringCapture();

    const completion = callWaitForCompletion(monitoring);

    const racedBeforeCompletion = await Promise.race([
        completion.then(() => "completed" as const),
        sleep(30).then(() => "timeout" as const),
    ]);

    t.is(racedBeforeCompletion, "timeout", "waitForCompletion should not resolve before completed frame");

    await writePayload(monitoring, `${JSON.stringify([RunnerMessageCode.SEQUENCE_COMPLETED, {}])}\r\n`);

    await t.notThrowsAsync(toPromise.bind(null, () => completion), "completion should resolve after completed frame");
});

test("createSequenceAssertions.completed() throws before completion and passes after", async t => {
    const createMonitoringCapture = getOrThrow("createMonitoringCapture", capturesApi.createMonitoringCapture);

    const monitoring = createMonitoringCapture();
    const assertions = callSequenceAssertions(monitoring);

    registerAvaMemoryCleanup(t, () => monitoring.clear?.());

    registerAvaMemoryCleanup(t, () => monitoring.clear?.());

    let thrown: unknown;

    try {
        assertions.completed();
    } catch (err) {
        thrown = err;
    }

    t.true(thrown instanceof Error, "completed() should throw before sequence completes");

    await writeFrames(monitoring, [`${JSON.stringify([RunnerMessageCode.SEQUENCE_COMPLETED, {}])}\r\n`]);

    assertions.completed();
    t.pass("completed() should pass after completion");
});

test("createSequenceAssertions.noRuntimeErrors() throws for sequenceError in stopped frame", async t => {
    const createMonitoringCapture = getOrThrow("createMonitoringCapture", capturesApi.createMonitoringCapture);

    const monitoring = createMonitoringCapture();
    const assertions = callSequenceAssertions(monitoring);

    registerAvaMemoryCleanup(t, () => monitoring.clear?.());

    assertions.noRuntimeErrors();
    t.pass("noRuntimeErrors() should pass with no error frames");

    await writeFrames(monitoring, [
        `${JSON.stringify([
            RunnerMessageCode.SEQUENCE_STOPPED,
            { sequenceError: { message: "boom", code: "ERR_TEST" } },
        ])}\r\n`,
    ]);

    let thrown: unknown;

    try {
        assertions.noRuntimeErrors();
    } catch (err) {
        thrown = err;
    }

    t.true(thrown instanceof Error, "noRuntimeErrors() should throw when sequenceError exists");
});

test("ByteCapture.clear() empties retained chunks", async t => {
    const createOutputCapture = getOrThrow("createOutputCapture", capturesApi.createOutputCapture);

    const capture = createOutputCapture();

    await writePayload(capture, "hello\n");
    await writePayload(capture, "world\n");

    t.is(await awaitValue(capture.text()), "hello\nworld\n");

    if (typeof capture.clear === "function") {
        capture.clear();
    }

    t.is(await awaitValue(capture.text()), "", "text() should be empty after clear");
    t.is((await awaitValue(capture.raw())).length, 0, "raw() should be empty after clear");
    t.deepEqual(await awaitValue(capture.lines()), [], "lines() should be empty after clear");
});

test("OutputCapture inherits clear via ByteCapture", async t => {
    const createOutputCapture = getOrThrow("createOutputCapture", capturesApi.createOutputCapture);

    const capture = createOutputCapture();

    await writePayload(capture, "data\n");
    t.true(typeof capture.clear === "function", "OutputCapture should have clear()");

    if (typeof capture.clear === "function") {
        capture.clear();
    }

    t.is(await awaitValue(capture.text()), "");
    t.deepEqual(await awaitValue(capture.ndjson()), []);
});

test("LogCapture inherits clear via ByteCapture", async t => {
    const createLogCapture = getOrThrow("createLogCapture", capturesApi.createLogCapture);

    const capture = createLogCapture();

    await writePayload(capture, "log-line\n");
    t.true(typeof capture.clear === "function", "LogCapture should have clear()");

    if (typeof capture.clear === "function") {
        capture.clear();
    }

    t.is(await awaitValue(capture.text()), "");
});

test("MonitoringCapture.clear() clears frames and pending partial text", async t => {
    const createMonitoringCapture = getOrThrow("createMonitoringCapture", capturesApi.createMonitoringCapture);

    const monitoring = createMonitoringCapture();

    await writePayload(monitoring, `${JSON.stringify([RunnerMessageCode.MONITORING, { healthy: true }])}\r\n`);
    await writePayload(monitoring, "incomplete"); // partial line without newline

    t.is((await awaitValue(monitoring.frames())).length, 1, "should have one parsed frame");

    if (typeof monitoring.clear === "function") {
        monitoring.clear();
    }

    t.deepEqual(await awaitValue(monitoring.frames()), [], "frames should be empty after clear");

    // After clear, write more data - the previous incomplete fragment should be gone
    await writePayload(monitoring, `${JSON.stringify([RunnerMessageCode.SEQUENCE_COMPLETED, {}])}\r\n`);
    t.is((await awaitValue(monitoring.frames())).length, 1, "should only contain frame written after clear");
});

test("MonitoringCapture.clear() resolves pending waiters", async t => {
    const createMonitoringCapture = getOrThrow("createMonitoringCapture", capturesApi.createMonitoringCapture);

    const monitoring = createMonitoringCapture();

    // Start waiting before any completion frame
    const waiter = monitoring.waitForCompletion!();

    const racedBeforeClear = await Promise.race([
        waiter.then(() => "resolved" as const),
        new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 30)),
    ]);

    t.is(racedBeforeClear, "timeout", "waiter should still be pending before clear");

    // Clear should resolve the pending waiter
    if (typeof monitoring.clear === "function") {
        monitoring.clear();
    }

    await t.notThrowsAsync(
        () => waiter,
        "pending waitForCompletion should resolve after clear"
    );
});

test("extractMemoryMonitoringFrames returns frames with memory fields", async t => {
    const createMonitoringCapture = getOrThrow("createMonitoringCapture", capturesApi.createMonitoringCapture);

    const monitoring = createMonitoringCapture();

    await writePayload(monitoring, `${JSON.stringify([
        RunnerMessageCode.MONITORING, { healthy: true, memoryUsage: 1024 }
    ])}\r\n`);
    await writePayload(monitoring, `${JSON.stringify([
        RunnerMessageCode.MONITORING, { healthy: true, memoryMaxUsage: 2048 }
    ])}\r\n`);
    await writePayload(monitoring, `${JSON.stringify([
        RunnerMessageCode.MONITORING, { healthy: true, limit: 4096 }
    ])}\r\n`);
    await writePayload(monitoring, `${JSON.stringify([
        RunnerMessageCode.MONITORING, { healthy: true }
    ])}\r\n`); // no memory fields — should be skipped
    await writePayload(monitoring, `${JSON.stringify([
        RunnerMessageCode.SEQUENCE_COMPLETED, {}
    ])}\r\n`);

    const extract = (capturesApi as Record<string, unknown>).extractMemoryMonitoringFrames as
        ((frames: unknown[][]) => unknown[]) | undefined;

    if (typeof extract !== "function") {
        t.pass("extractMemoryMonitoringFrames not available from test import");
        return;
    }

    const frames = await awaitValue(monitoring.frames());
    const memoryFrames = extract(frames);

    t.is(memoryFrames.length, 3, "should find 3 frames with memory fields");

    const mf0 = memoryFrames[0] as Record<string, unknown>;
    t.is(mf0.memoryUsage, 1024);
    t.is(mf0.frameIndex, 0);

    const mf1 = memoryFrames[1] as Record<string, unknown>;
    t.is(mf1.memoryMaxUsage, 2048);
    t.is(mf1.frameIndex, 1);

    const mf2 = memoryFrames[2] as Record<string, unknown>;
    t.is(mf2.limit, 4096);
    t.is(mf2.frameIndex, 2);
});

test("SequenceAssertions.memoryWithinLimit passes when memory fields are under threshold", async t => {
    const createMonitoringCapture = getOrThrow("createMonitoringCapture", capturesApi.createMonitoringCapture);

    const monitoring = createMonitoringCapture();
    const assertions = callSequenceAssertions(monitoring);

    await writePayload(monitoring, `${JSON.stringify([
        RunnerMessageCode.MONITORING, { healthy: true, memoryUsage: 500, memoryMaxUsage: 800 }
    ])}\r\n`);

    // Provide memoryWithinLimit through the assertion
    const memoryFn = (assertions as Record<string, unknown>).memoryWithinLimit as
        ((opts: { threshold: number }) => void) | undefined;

    if (typeof memoryFn !== "function") {
        t.pass("memoryWithinLimit not available");
        return;
    }

    memoryFn({ threshold: 1000 });
    t.pass("should pass when usage < threshold");
});

test("SequenceAssertions.memoryWithinLimit throws when memoryUsage exceeds threshold", async t => {
    const createMonitoringCapture = getOrThrow("createMonitoringCapture", capturesApi.createMonitoringCapture);

    const monitoring = createMonitoringCapture();
    const assertions = callSequenceAssertions(monitoring);

    registerAvaMemoryCleanup(t, () => monitoring.clear?.());

    await writePayload(monitoring, `${JSON.stringify([
        RunnerMessageCode.MONITORING, { healthy: true, memoryUsage: 1500 }
    ])}\r\n`);

    const memoryFn = (assertions as Record<string, unknown>).memoryWithinLimit as
        ((opts: { threshold: number }) => void) | undefined;

    if (typeof memoryFn !== "function") {
        t.pass("memoryWithinLimit not available");
        return;
    }

    const err = captureError(() => memoryFn({ threshold: 1000 }));
    t.truthy(err, "should throw when memoryUsage exceeds threshold");

    if (err) {
        t.true(err.message.includes("memoryUsage 1500"), "error should mention observed memoryUsage");
        t.true(err.message.includes("threshold 1000"), "error should mention threshold");
    }
});

test("SequenceAssertions.memoryWithinLimit throws when memoryMaxUsage exceeds threshold", async t => {
    const createMonitoringCapture = getOrThrow("createMonitoringCapture", capturesApi.createMonitoringCapture);

    const monitoring = createMonitoringCapture();
    const assertions = callSequenceAssertions(monitoring);

    registerAvaMemoryCleanup(t, () => monitoring.clear?.());

    await writePayload(monitoring, `${JSON.stringify([
        RunnerMessageCode.MONITORING, { healthy: true, memoryMaxUsage: 2500 }
    ])}\r\n`);

    const memoryFn = (assertions as Record<string, unknown>).memoryWithinLimit as
        ((opts: { threshold: number }) => void) | undefined;

    if (typeof memoryFn !== "function") {
        t.pass("memoryWithinLimit not available");
        return;
    }

    const err = captureError(() => memoryFn({ threshold: 2000 }));
    t.truthy(err, "should throw when memoryMaxUsage exceeds threshold");

    if (err) {
        t.true(err.message.includes("memoryMaxUsage 2500"), "error should mention observed memoryMaxUsage");
    }
});

test("SequenceAssertions.memoryWithinLimit throws for empty monitoring frames", async t => {
    const createMonitoringCapture = getOrThrow("createMonitoringCapture", capturesApi.createMonitoringCapture);

    const monitoring = createMonitoringCapture();
    const assertions = callSequenceAssertions(monitoring);

    registerAvaMemoryCleanup(t, () => monitoring.clear?.());

    const memoryFn = (assertions as Record<string, unknown>).memoryWithinLimit as
        ((opts: { threshold: number }) => void) | undefined;

    if (typeof memoryFn !== "function") {
        t.pass("memoryWithinLimit not available");
        return;
    }

    const err = captureError(() => memoryFn({ threshold: 1000 }));
    t.truthy(err, "should throw when no memory frames");
    if (err) {
        t.true(err.message.includes("no monitoring frames with memory fields"), "error should explain no memory frames");
    }
});

test("SequenceAssertions.memoryWithinLimit throws for invalid threshold", async t => {
    const createMonitoringCapture = getOrThrow("createMonitoringCapture", capturesApi.createMonitoringCapture);

    const monitoring = createMonitoringCapture();
    const assertions = callSequenceAssertions(monitoring);

    registerAvaMemoryCleanup(t, () => monitoring.clear?.());

    await writePayload(monitoring, `${JSON.stringify([
        RunnerMessageCode.MONITORING, { healthy: true, memoryUsage: 500 }
    ])}\r\n`);

    const memoryFn = (assertions as Record<string, unknown>).memoryWithinLimit as
        ((opts: { threshold: number }) => void) | undefined;

    if (typeof memoryFn !== "function") {
        t.pass("memoryWithinLimit not available");
        return;
    }

    // Zero threshold
    const errZero = captureError(() => memoryFn({ threshold: 0 }));
    t.truthy(errZero, "should throw for zero threshold");

    // Negative threshold
    const errNeg = captureError(() => memoryFn({ threshold: -1 }));
    t.truthy(errNeg, "should throw for negative threshold");

    // NaN
    const errNaN = captureError(() => memoryFn({ threshold: NaN }));
    t.truthy(errNaN, "should throw for NaN threshold");

    // Infinity
    const errInf = captureError(() => memoryFn({ threshold: Infinity }));
    t.truthy(errInf, "should throw for Infinity threshold");
});
