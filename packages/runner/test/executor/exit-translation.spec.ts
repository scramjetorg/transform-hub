import test from "ava";

import { RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";

import { translateChildClose } from "../../src/executor/exit-translation";

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
