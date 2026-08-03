import baseTest from "ava";

import * as sequenceTest from "../../src/index";

const { createAvaMemoryGuard } = require("../../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);

type AnyModule = Record<string, unknown>;

const sequenceTestApi = sequenceTest as unknown as AnyModule;
const createSequenceTest = sequenceTestApi.createSequenceTest as unknown as (...args: unknown[]) => unknown;

test("sequence-test exports the public API functions", t => {
    t.is(typeof sequenceTestApi.createSequenceTest, "function");
    t.is(typeof sequenceTestApi.runSequence, "function");
});

test("createSequenceTest returns a lifecycle harness with expected shape", async t => {
    t.true(typeof createSequenceTest === "function", "createSequenceTest should be a function");

    const maybeHarness = createSequenceTest({
        runtime: "node",
        sequencePath: "/tmp/example-sequence.js",
    } as never);

    const harness = await Promise.resolve(maybeHarness);

    const methods = ["start", "close", "waitForCompletion", "input", "output", "logs", "monitoring", "assert"];

    for (const key of methods) {
        t.true(key in (harness as Record<string, unknown>), `harness should expose ${key}`);
        t.true(
            typeof (harness as Record<string, unknown>)[key] === "function",
            `${key} should be a function`
        );
    }

    t.is((harness as { runtime: unknown }).runtime, "node");

    await Promise.resolve((harness as { close: () => unknown }).close());
    await Promise.resolve((harness as { close: () => unknown }).close());
});

test("createSequenceTest.close() clears output/log/monitoring retained data", async t => {
    t.true(typeof createSequenceTest === "function", "createSequenceTest should be a function");

    const maybeHarness = createSequenceTest({
        runtime: "node",
        sequencePath: "/tmp/example-sequence.js",
    } as never);

    const harness = await Promise.resolve(maybeHarness) as Record<string, unknown>;
    const close = harness.close as () => void;
    const output = harness.output as Record<string, unknown>;
    const logs = harness.logs as Record<string, unknown>;
    const monitoring = harness.monitoring as Record<string, unknown>;

    // Populate captures with data
    const outputWrite = output.write as (v: string | Buffer) => Promise<void>;
    const logsWrite = logs.write as (v: string | Buffer) => Promise<void>;
    const monitoringWrite = monitoring.write as (v: string | Buffer) => Promise<void>;

    await outputWrite("output-data\n");
    await logsWrite("log-data\n");
    await monitoringWrite(`${JSON.stringify([3001, { healthy: true }])}\r\n`);

    // Verify data exists before close
    const outputText = await (output.text as () => string | Promise<string>)();
    const logsText = await (logs.text as () => string | Promise<string>)();
    const monitoringFrames = await (monitoring.frames as () => unknown[][] | Promise<unknown[][]>)();

    t.is(outputText, "output-data\n", "output should have data before close");
    t.is(logsText, "log-data\n", "logs should have data before close");
    t.is(monitoringFrames.length, 1, "monitoring should have frames before close");

    // Close the harness
    close();

    // Verify data is cleared after close
    const outputTextAfter = await (output.text as () => string | Promise<string>)();
    const logsTextAfter = await (logs.text as () => string | Promise<string>)();
    const monitoringFramesAfter = await (monitoring.frames as () => unknown[][] | Promise<unknown[][]>)();

    t.is(outputTextAfter, "", "output should be empty after close");
    t.is(logsTextAfter, "", "logs should be empty after close");
    t.is(monitoringFramesAfter.length, 0, "monitoring frames should be empty after close");
});

test("createSequenceTest rejects unsupported runtimes", async t => {
    const err = await t.throwsAsync(async () => Promise.resolve(createSequenceTest({
        runtime: "deno" as never,
        sequencePath: "/tmp/example-sequence.js",
    } as never)));

    t.true(err instanceof Error);
    t.true(err.message.toLowerCase().includes("unsupported runtime"));
});
