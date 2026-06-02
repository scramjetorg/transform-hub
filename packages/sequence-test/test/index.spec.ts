import test from "ava";

import * as sequenceTest from "../src/index";

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

test("createSequenceTest rejects unsupported runtimes", async t => {
    const err = await t.throwsAsync(async () => Promise.resolve(createSequenceTest({
        runtime: "deno" as never,
        sequencePath: "/tmp/example-sequence.js",
    } as never)));

    t.true(err instanceof Error);
    t.true(err.message.toLowerCase().includes("unsupported runtime"));
});
