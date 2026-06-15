import test from "ava";
import { mapRunnerExitCode } from "../src/lib/utils";
import { RunnerExitCode, InstanceStatus } from "@scramjet/symbols";
import { SequenceInfo } from "@scramjet/types";

const mockSequence = (overrides: Partial<SequenceInfo> = {}): SequenceInfo => ({
    id: "seq-1",
    name: "test-seq",
    config: {
        type: "process",
        engines: { node: "14" },
        id: "seq-1",
        entrypointPath: "/index.js",
        name: "test-seq",
        version: "1.0.0",
        sequenceDir: "/tmp/seq",
        language: "javascript"
    },
    location: "/tmp/seq-pkg",
    instances: [],
    ...overrides
});

// Helper to assert rejection shape
const assertRejected = async (t: any, fn: () => Promise<any>, expectedMessage: string, expectedExitcode: number) => {
    try {
        await fn();
        t.fail("Expected rejection");
    } catch (err: any) {
        t.is(err.message, expectedMessage);
        t.is(err.exitcode, expectedExitcode);
        t.is(err.status, InstanceStatus.ERRORED);
    }
};

// ── Resolve cases ───────────────────────────────────────────────

test("mapRunnerExitCode: STOPPED (138) resolves with completed status", async t => {
    const seq = mockSequence();
    const result = await mapRunnerExitCode(RunnerExitCode.STOPPED, seq);

    t.deepEqual(result, {
        message: "Instance stopped",
        exitcode: RunnerExitCode.STOPPED,
        status: InstanceStatus.COMPLETED
    });
});

test("mapRunnerExitCode: exit code 0 resolves with completed status", async t => {
    const seq = mockSequence();
    const result = await mapRunnerExitCode(0, seq);

    t.deepEqual(result, {
        message: "Instance completed",
        exitcode: 0,
        status: InstanceStatus.COMPLETED
    });
});

// ── Reject cases ─────────────────────────────────────────────────

test("mapRunnerExitCode: INVALID_ENV_VARS (20) rejects with error", async t => {
    const seq = mockSequence();
    await assertRejected(t,
        () => mapRunnerExitCode(RunnerExitCode.INVALID_ENV_VARS, seq),
        "Runner was started with invalid configuration. This is probably a bug in STH.",
        RunnerExitCode.INVALID_ENV_VARS
    );
});

test("mapRunnerExitCode: PODS_LIMIT_REACHED (24) rejects with limit message", async t => {
    const seq = mockSequence();
    await assertRejected(t,
        () => mapRunnerExitCode(RunnerExitCode.PODS_LIMIT_REACHED, seq),
        "Instance limit reached",
        RunnerExitCode.PODS_LIMIT_REACHED
    );
});

test("mapRunnerExitCode: INVALID_SEQUENCE_PATH (21) includes entrypointPath in message", async t => {
    const seqWithPath = mockSequence({
        config: { ...mockSequence().config, entrypointPath: "./dist/index.js" }
    });

    try {
        await mapRunnerExitCode(RunnerExitCode.INVALID_SEQUENCE_PATH, seqWithPath);
        t.fail("Expected rejection");
    } catch (err: any) {
        t.is(
            err.message,
            "Sequence entrypoint path ./dist/index.js is invalid. " +
            "Check `main` field in Sequence package.json"
        );
        t.is(err.exitcode, RunnerExitCode.INVALID_SEQUENCE_PATH);
        t.is(err.status, InstanceStatus.ERRORED);
    }
});

test("mapRunnerExitCode: SEQUENCE_FAILED_ON_START (22) rejects", async t => {
    const seq = mockSequence();
    await assertRejected(t,
        () => mapRunnerExitCode(RunnerExitCode.SEQUENCE_FAILED_ON_START, seq),
        "Sequence failed on start",
        RunnerExitCode.SEQUENCE_FAILED_ON_START
    );
});

test("mapRunnerExitCode: SEQUENCE_FAILED_DURING_EXECUTION (23) rejects", async t => {
    const seq = mockSequence();
    await assertRejected(t,
        () => mapRunnerExitCode(RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION, seq),
        "Sequence failed during execution",
        RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION
    );
});

test("mapRunnerExitCode: SEQUENCE_UNPACK_FAILED (10) rejects", async t => {
    const seq = mockSequence();
    await assertRejected(t,
        () => mapRunnerExitCode(RunnerExitCode.SEQUENCE_UNPACK_FAILED, seq),
        "Sequence unpack failed",
        RunnerExitCode.SEQUENCE_UNPACK_FAILED
    );
});

test("mapRunnerExitCode: KILLED (137) rejects with killed message", async t => {
    const seq = mockSequence();
    await assertRejected(t,
        () => mapRunnerExitCode(RunnerExitCode.KILLED, seq),
        "Instance killed",
        RunnerExitCode.KILLED
    );
});

// ── Generic fallback ─────────────────────────────────────────────

test("mapRunnerExitCode: any positive exit code > 0 rejects with generic message", async t => {
    const seq = mockSequence();
    try {
        await mapRunnerExitCode(1, seq);
        t.fail("Expected rejection");
    } catch (err: any) {
        t.is(err.message, "Runner failed");
        t.is(err.exitcode, 1);
        t.is(err.status, InstanceStatus.ERRORED);
    }
});

test("mapRunnerExitCode: negative exit code rejects with generic message", async t => {
    const seq = mockSequence();
    try {
        await mapRunnerExitCode(-1, seq);
        t.fail("Expected rejection");
    } catch (err: any) {
        t.is(err.message, "Runner failed");
        t.is(err.exitcode, -1);
        t.is(err.status, InstanceStatus.ERRORED);
    }
});
