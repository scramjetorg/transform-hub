import test from "ava";
import { RunnerMessageCode } from "@scramjet/symbols";

type CaptureWrite = (value: Buffer | string) => unknown;

type OutputCapture = {
    raw: () => Buffer | Promise<Buffer>;
    text: () => string | Promise<string>;
    lines: () => string[] | Promise<string[]>;
    ndjson: () => unknown[] | Promise<unknown[]>;
    write?: CaptureWrite;
    end?: () => unknown;
    capture?: CaptureWrite;
};

type LogCapture = {
    raw: () => Buffer | Promise<Buffer>;
    text: () => string | Promise<string>;
    lines: () => string[] | Promise<string[]>;
    write?: CaptureWrite;
    end?: () => unknown;
    capture?: CaptureWrite;
};

type MonitoringCapture = {
    frames: () => unknown[][] | Promise<unknown[][]>;
    write?: CaptureWrite;
    capture?: CaptureWrite;
    end?: () => unknown;
    waitForCompletion?: () => Promise<void>;
};

type SequenceAssertions = {
    completed: () => Promise<void> | void;
    noRuntimeErrors: () => Promise<void> | void;
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

    await t.throwsAsync(
        () => toPromise(() => assertions.completed()),
        {
            instanceOf: Error,
        },
        "completed() should throw before sequence completes"
    );

    await writeFrames(monitoring, [`${JSON.stringify([RunnerMessageCode.SEQUENCE_COMPLETED, {}])}\r\n`]);

    await t.notThrowsAsync(toPromise.bind(null, () => assertions.completed()), "completed() should pass after completion");
});

test("createSequenceAssertions.noRuntimeErrors() throws for sequenceError in stopped frame", async t => {
    const createMonitoringCapture = getOrThrow("createMonitoringCapture", capturesApi.createMonitoringCapture);

    const monitoring = createMonitoringCapture();
    const assertions = callSequenceAssertions(monitoring);

    await t.notThrowsAsync(toPromise.bind(null, () => assertions.noRuntimeErrors()), "noRuntimeErrors() should pass with no error frames");

    await writeFrames(monitoring, [
        `${JSON.stringify([
            RunnerMessageCode.SEQUENCE_STOPPED,
            { sequenceError: { message: "boom", code: "ERR_TEST" } },
        ])}\r\n`,
    ]);

    await t.throwsAsync(
        () => toPromise(() => assertions.noRuntimeErrors()),
        {
            instanceOf: Error,
        },
        "noRuntimeErrors() should throw when sequenceError exists"
    );
});
