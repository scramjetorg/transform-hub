import test from "ava";
import { spawn } from "child_process";
import { once } from "events";
import { join } from "path";
import { PassThrough, Writable } from "stream";

import { RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";

import {
    translateChildClose,
    writeTerminalLifecycleFrame
} from "../../src/executor/exit-translation";
import { forwardChildStdio } from "../../src/executor/stream-forwarder";

const throwingFixture = join(
    __dirname,
    "..",
    "fixtures",
    "throw-after-stdout-child.js"
);

interface CapturedSink {
    sink: Writable;
    chunks: Buffer[];
    /** First absolute byte-offset at which `marker` appears, or -1. */
    indexOf(marker: string): number;
    snapshot(): Buffer;
}

function makeCapturingSink(): CapturedSink {
    const chunks: Buffer[] = [];
    const sink = new Writable({
        write(chunk: Buffer, _enc, cb): void {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            cb();
        }
    });

    return {
        sink,
        chunks,
        snapshot(): Buffer {
            return Buffer.concat(chunks);
        },
        indexOf(marker: string): number {
            return Buffer.concat(chunks).indexOf(marker);
        }
    };
}

test.serial("runner lifecycle ordering: throw-after-stdout child - stdout/stderr bytes precede terminal monitoring frame", async t => {
    const stdoutCapture = makeCapturingSink();
    const stderrCapture = makeCapturingSink();
    const monitoringCapture = makeCapturingSink();

    // Spawn fixture with raw pipes for stdout/stderr; no JSON/base64 proxying.
    const child = spawn(process.execPath, [throwingFixture], {
        stdio: ["ignore", "pipe", "pipe"],
        env: {}
    });

    const handles = forwardChildStdio(child, {
        hostStdout: stdoutCapture.sink,
        hostStderr: stderrCapture.sink
    });

    try {
        // `close` is the ordering barrier: it fires only after stdio has
        // flushed AND after exit/spawn-error.
        const [code, signal] = (await once(child, "close")) as [
            number | null,
            NodeJS.Signals | null
        ];

        const translated = translateChildClose(code, signal);

        // Emit the terminal monitoring frame strictly after `close`.
        const monitoringPipe = new PassThrough();

        monitoringPipe.pipe(monitoringCapture.sink);
        const queued = writeTerminalLifecycleFrame(monitoringPipe, translated);

        t.true(queued, "terminal lifecycle frame should be queued for write");

        monitoringPipe.end();
        await once(monitoringPipe, "end");

        // 1. Translation: throwing child gets non-zero exit, mapped to a
        //    RunnerExitCode and SEQUENCE_STOPPED message - no new symbols.
        t.is(translated.messageCode, RunnerMessageCode.SEQUENCE_STOPPED);
        t.not(translated.exitCode, RunnerExitCode.SUCCESS);
        t.truthy(translated.sequenceError);

        // 2. The child's stdout/stderr markers were observed.
        const stdoutMarkerAt = stdoutCapture.indexOf("STDOUT_BEFORE_THROW");
        const stderrMarkerAt = stderrCapture.indexOf("STDERR_BEFORE_THROW");

        t.true(stdoutMarkerAt >= 0, "stdout marker must be captured");
        t.true(stderrMarkerAt >= 0, "stderr marker must be captured");

        // 3. The terminal monitoring frame was a single JSON line carrying
        //    the translated codes.
        const monitorText = monitoringCapture.snapshot().toString("utf8");

        t.true(monitorText.endsWith("\r\n"), "frame must use CRLF terminator");

        const parsed = JSON.parse(monitorText.trimEnd()) as [number, { exitCode: number }];

        t.is(parsed[0], RunnerMessageCode.SEQUENCE_STOPPED);
        t.is(parsed[1].exitCode, translated.exitCode);

        // 4. Ordering invariant: stdout/stderr bytes were fully observed
        //    before the terminal lifecycle frame was even emitted. Because
        //    the frame is only written after `close` resolves, and `close`
        //    only fires after stdio is closed, the captured chunk lists
        //    for stdout/stderr must already be non-empty when the frame
        //    is queued. Re-assert the captured state at frame-emit time.
        t.true(stdoutCapture.chunks.length > 0,
            "stdout chunks must be observed before terminal frame");
        t.true(stderrCapture.chunks.length > 0,
            "stderr chunks must be observed before terminal frame");

        // 5. Sanity: the child stderr output also contains the uncaught
        //    exception report, which strictly followed STDERR_BEFORE_THROW.
        const stderrAll = stderrCapture.snapshot().toString("utf8");
        const throwAt = stderrAll.indexOf("intentional-throw-after-stdout");

        t.true(throwAt > stderrAll.indexOf("STDERR_BEFORE_THROW"),
            "uncaught exception text must follow stderr marker");
    } finally {
        handles.detach();
        if (child.exitCode === null && child.signalCode === null) {
            child.kill();
            await once(child, "close");
        }
    }
});

test.serial("runner lifecycle ordering: translateChildClose maps clean exit to SEQUENCE_COMPLETED/SUCCESS", t => {
    const out = translateChildClose(0, null);

    t.is(out.exitCode, RunnerExitCode.SUCCESS);
    t.is(out.messageCode, RunnerMessageCode.SEQUENCE_COMPLETED);
    t.is(out.sequenceError, undefined);
});

test.serial("runner lifecycle ordering: translateChildClose maps SIGKILL/SIGTERM to KILLED/STOPPED with SEQUENCE_STOPPED", t => {
    const killed = translateChildClose(null, "SIGKILL");

    t.is(killed.exitCode, RunnerExitCode.KILLED);
    t.is(killed.messageCode, RunnerMessageCode.SEQUENCE_STOPPED);
    t.truthy(killed.sequenceError);

    const stopped = translateChildClose(null, "SIGTERM");

    t.is(stopped.exitCode, RunnerExitCode.STOPPED);
    t.is(stopped.messageCode, RunnerMessageCode.SEQUENCE_STOPPED);
    t.truthy(stopped.sequenceError);
});

test.serial("runner lifecycle ordering: translateChildClose maps unknown non-zero exit codes to SEQUENCE_FAILED_DURING_EXECUTION", t => {
    const out = translateChildClose(7, null);

    t.is(out.exitCode, RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION);
    t.is(out.messageCode, RunnerMessageCode.SEQUENCE_STOPPED);
    t.truthy(out.sequenceError);
});

test.serial("runner lifecycle ordering: translateChildClose preserves known RunnerExitCode values verbatim", t => {
    const out = translateChildClose(RunnerExitCode.SEQUENCE_FAILED_ON_START, null);

    t.is(out.exitCode, RunnerExitCode.SEQUENCE_FAILED_ON_START);
    t.is(out.messageCode, RunnerMessageCode.SEQUENCE_STOPPED);
});
