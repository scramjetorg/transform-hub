import test from "ava";
import { Writable } from "stream";

import { RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";

import {
    requiresHardChildTeardown,
    translateChildClose,
    writeTerminalLifecycleFrame
} from "../../src/executor/exit-translation";

test("translateChildClose maps a clean exit to SEQUENCE_COMPLETED/SUCCESS", t => {
    const out = translateChildClose(0, null);

    t.is(out.exitCode, RunnerExitCode.SUCCESS);
    t.is(out.messageCode, RunnerMessageCode.SEQUENCE_COMPLETED);
    t.is(out.sequenceError, undefined);
});

test("translateChildClose maps SIGKILL and SIGTERM to stopped terminal frames", t => {
    const killed = translateChildClose(null, "SIGKILL");
    const stopped = translateChildClose(null, "SIGTERM");

    t.is(killed.exitCode, RunnerExitCode.KILLED);
    t.is(killed.messageCode, RunnerMessageCode.SEQUENCE_STOPPED);
    t.truthy(killed.sequenceError);
    t.is(stopped.exitCode, RunnerExitCode.STOPPED);
    t.is(stopped.messageCode, RunnerMessageCode.SEQUENCE_STOPPED);
    t.truthy(stopped.sequenceError);
});

test("translateChildClose maps unknown non-zero exits to execution failure", t => {
    const out = translateChildClose(7, null);

    t.is(out.exitCode, RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION);
    t.is(out.messageCode, RunnerMessageCode.SEQUENCE_STOPPED);
    t.truthy(out.sequenceError);
});

test("translateChildClose preserves known runner exit codes", t => {
    const out = translateChildClose(RunnerExitCode.SEQUENCE_FAILED_ON_START, null);

    t.is(out.exitCode, RunnerExitCode.SEQUENCE_FAILED_ON_START);
    t.is(out.messageCode, RunnerMessageCode.SEQUENCE_STOPPED);
});

test("ordinary nonzero child exits drain gracefully, while cancellation remains hard", t => {
    t.false(requiresHardChildTeardown(translateChildClose(7, null)));
    t.true(requiresHardChildTeardown(translateChildClose(null, "SIGKILL")));
    t.true(requiresHardChildTeardown(translateChildClose(RunnerExitCode.KILLED, null)));
    t.true(requiresHardChildTeardown(translateChildClose(RunnerExitCode.STOPPED, null)));
});

test("fallback terminal frames serialize only the existing payload fields", t => {
    const frames: string[] = [];
    const monitoring = new Writable({
        write(chunk, _encoding, callback) {
            frames.push(chunk.toString());
            callback();
        }
    });

    t.true(writeTerminalLifecycleFrame(monitoring, translateChildClose(0, null)));
    t.true(writeTerminalLifecycleFrame(monitoring, translateChildClose(7, null)));

    const completion = JSON.parse(frames[0].trim()) as [RunnerMessageCode, Record<string, unknown>];
    const stopped = JSON.parse(frames[1].trim()) as [RunnerMessageCode, Record<string, unknown>];

    t.deepEqual(completion[1], {});
    t.deepEqual(Object.keys(stopped[1]), ["sequenceError"]);
});
