import test from "ava";
import { once } from "events";
import { spawn, ChildProcess } from "child_process";
import { join } from "path";
import { PassThrough, Readable } from "stream";

import {
    forwardChildStdio,
    StreamForwarderHandles,
    StreamForwarderTargets,
} from "../../src/executor/stream-forwarder";

const childPath = join(__dirname, "..", "fixtures", "five-pipe-child.js");
const fivePipeStdio = ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"] as const;

function spawnChild(): ChildProcess {
    return spawn(process.execPath, [childPath], { stdio: [...fivePipeStdio] });
}

interface StreamTracker {
    read(): string;
    ended(): boolean;
    waitFor(marker: string, timeoutMs?: number): Promise<void>;
}

function track(stream: Readable): StreamTracker {
    let buf = "";
    let ended = false;

    stream.on("data", (chunk: Buffer) => {
        buf += chunk.toString("utf8");
    });
    stream.on("end", () => {
        ended = true;
    });

    return {
        read: () => buf,
        ended: () => ended,
        async waitFor(marker: string, timeoutMs = 5000): Promise<void> {
            const deadline = Date.now() + timeoutMs;

            while (!buf.includes(marker)) {
                if (Date.now() > deadline) {
                    throw new Error(
                        `Timed out waiting for ${JSON.stringify(marker)}; buffered: ${JSON.stringify(buf)}`
                    );
                }
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        },
    };
}

async function stopChild(child: ChildProcess): Promise<void> {
    if (child.exitCode === null && child.signalCode === null) {
        child.kill();
    }
    await once(child, "close");
}

test.serial("stream forwarder non closing keeps host streams writable after child exit", async t => {
    const child = spawnChild();
    const hostStdout = new PassThrough();
    const hostStderr = new PassThrough();
    const out = track(hostStdout);
    const err = track(hostStderr);

    const targets: StreamForwarderTargets = { hostStdout, hostStderr };
    const handle: StreamForwarderHandles = forwardChildStdio(child, targets);

    try {
        await out.waitFor("STDOUT_MARK");
        await err.waitFor("STDERR_MARK");

        await stopChild(child);

        t.false(out.ended(), "host stdout must remain open after child exit");
        t.false(err.ended(), "host stderr must remain open after child exit");
        t.false(hostStdout.writableEnded, "host stdout must not be ended after child exit");
        t.false(hostStderr.writableEnded, "host stderr must not be ended after child exit");
        t.true(hostStdout.writable, "host stdout must remain writable");
        t.true(hostStderr.writable, "host stderr must remain writable");

        hostStdout.write("HOST_OUT_SENTINEL\n");
        hostStderr.write("HOST_ERR_SENTINEL\n");

        await out.waitFor("HOST_OUT_SENTINEL");
        await err.waitFor("HOST_ERR_SENTINEL");

        t.true(out.read().includes("HOST_OUT_SENTINEL"));
        t.true(err.read().includes("HOST_ERR_SENTINEL"));
    } finally {
        handle.detach();
    }
});

test.serial("stream forwarder non closing forwards child stdout/stderr bytes verbatim", async t => {
    const child = spawnChild();
    const hostStdout = new PassThrough();
    const hostStderr = new PassThrough();
    const out = track(hostStdout);
    const err = track(hostStderr);

    const handle = forwardChildStdio(child, { hostStdout, hostStderr });

    try {
        await out.waitFor("HAS_SEND:true");
        await err.waitFor("STDERR_MARK");

        const stdoutText = out.read();
        const stderrText = err.read();

        t.true(stdoutText.includes("STDOUT_MARK\n"), "stdout target sees STDOUT_MARK verbatim");
        t.true(stdoutText.includes("HAS_SEND:true\n"), "stdout target sees HAS_SEND:true verbatim");
        t.false(stdoutText.includes("STDERR_MARK"), "stdout target must not see stderr bytes");

        t.true(stderrText.includes("STDERR_MARK\n"), "stderr target sees STDERR_MARK verbatim");
        t.false(stderrText.includes("STDOUT_MARK"), "stderr target must not see stdout bytes");
        t.false(stderrText.includes("HAS_SEND:"), "stderr target must not see stdout bytes");
    } finally {
        handle.detach();
        await stopChild(child);
    }
});

test.serial("stream forwarder detach stops forwarding without ending host streams", async t => {
    const child = spawnChild();
    const hostStdout = new PassThrough();
    const hostStderr = new PassThrough();
    const out = track(hostStdout);
    const err = track(hostStderr);

    const handle = forwardChildStdio(child, { hostStdout, hostStderr });

    try {
        await out.waitFor("STDOUT_MARK");
        await err.waitFor("STDERR_MARK");

        // detach is idempotent
        t.notThrows(() => handle.detach());
        t.notThrows(() => handle.detach(), "detach must be idempotent");
        t.notThrows(() => handle.detach());

        // detach must not end host streams
        t.false(hostStdout.writableEnded, "detach must not end host stdout");
        t.false(hostStderr.writableEnded, "detach must not end host stderr");
        t.false(out.ended());
        t.false(err.ended());

        const snapshotOut = out.read();
        const snapshotErr = err.read();

        // Drain any further child output directly so it cannot reach hosts.
        child.stdout!.resume();
        child.stderr!.resume();

        await new Promise(resolve => setTimeout(resolve, 80));

        t.is(out.read(), snapshotOut, "no further bytes forwarded to host stdout after detach");
        t.is(err.read(), snapshotErr, "no further bytes forwarded to host stderr after detach");

        // Host targets remain writable after detach.
        hostStdout.write("AFTER_DETACH_OUT\n");
        hostStderr.write("AFTER_DETACH_ERR\n");

        await out.waitFor("AFTER_DETACH_OUT");
        await err.waitFor("AFTER_DETACH_ERR");
    } finally {
        await stopChild(child);
    }
});
