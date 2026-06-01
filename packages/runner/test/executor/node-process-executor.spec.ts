import test from "ava";
import { once } from "events";
import { ChildProcess } from "child_process";
import { join } from "path";
import { Duplex, Readable } from "stream";

import { RUNNER_NODE_STDIO, spawnRunnerNode } from "../../src/executor/node-process-executor";

const fixtureChild = join(__dirname, "..", "fixtures", "five-pipe-child.js");

async function readUntil(stream: NodeJS.ReadableStream, marker: string): Promise<string> {
    let output = "";

    while (!output.includes(marker)) {
        const [chunk] = await once(stream, "data") as [Buffer];

        output += chunk.toString("utf8");
    }

    return output;
}

async function exchangeBytes(stream: Duplex, payload: Buffer): Promise<Buffer> {
    const next = once(stream, "data") as Promise<[Buffer]>;

    stream.write(payload);

    const [chunk] = await next;

    return chunk;
}

async function stopChild(child: ChildProcess): Promise<void> {
    if (child.exitCode === null && child.signalCode === null) {
        child.kill();
    }
    await once(child, "close");
}

test.serial("RUNNER_NODE_STDIO is the exact six-slot layout", t => {
    t.deepEqual(
        [...RUNNER_NODE_STDIO],
        ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"]
    );
    t.is(RUNNER_NODE_STDIO.length, 6);
});

test.serial("process executor forwarding: spawnRunnerNode returns typed handles for stdout/stderr/fd4/fd5", async t => {
    const handles = spawnRunnerNode({
        nodeExecPath: process.execPath,
        runtimeEntry: fixtureChild,
        bootConfigPath: "/dev/null"
    });

    try {
        const ipcSend = handles.child["send"];

        t.is(typeof ipcSend, "function");
        t.true(handles.stdout instanceof Readable);
        t.true(handles.stderr instanceof Readable);
        t.true(handles.control instanceof Duplex);
        t.true(handles.monitoring instanceof Duplex);

        const stdoutText = await readUntil(handles.stdout, "HAS_SEND:true");
        const stderrText = await readUntil(handles.stderr, "STDERR_MARK");

        t.true(stdoutText.includes("STDOUT_MARK"));
        t.true(stdoutText.includes("HAS_SEND:true"));
        t.false(stdoutText.includes("STDERR_MARK"));
        t.true(stderrText.includes("STDERR_MARK"));
        t.false(stderrText.includes("STDOUT_MARK"));
    } finally {
        await stopChild(handles.child);
    }
});

test.serial("process executor forwarding: parent process.stdout/stderr references are unchanged", async t => {
    const parentStdoutBefore = process.stdout;
    const parentStderrBefore = process.stderr;

    const handles = spawnRunnerNode({
        nodeExecPath: process.execPath,
        runtimeEntry: fixtureChild,
        bootConfigPath: "/dev/null"
    });

    try {
        t.is(process.stdout, parentStdoutBefore);
        t.is(process.stderr, parentStderrBefore);

        const parentOut: unknown = process.stdout;
        const parentErr: unknown = process.stderr;
        const childOut: unknown = handles.stdout;
        const childErr: unknown = handles.stderr;

        t.not(childOut, parentOut);
        t.not(childErr, parentErr);
    } finally {
        await stopChild(handles.child);
    }

    t.is(process.stdout, parentStdoutBefore);
    t.is(process.stderr, parentStderrBefore);
});

test.serial("control monitoring passthrough: fd4 echoes raw bytes byte-for-byte", async t => {
    const handles = spawnRunnerNode({
        nodeExecPath: process.execPath,
        runtimeEntry: fixtureChild,
        bootConfigPath: "/dev/null"
    });

    try {
        const payload = Buffer.from([0x00, 0x01, 0x02, 0xfe, 0xff, 0x7f, 0x80, 0x42]);
        const echoed = await exchangeBytes(handles.control, payload);

        t.deepEqual(Array.from(echoed), Array.from(payload));
    } finally {
        await stopChild(handles.child);
    }
});

test.serial("control monitoring passthrough: fd5 echoes raw bytes byte-for-byte and is independent from fd4", async t => {
    const handles = spawnRunnerNode({
        nodeExecPath: process.execPath,
        runtimeEntry: fixtureChild,
        bootConfigPath: "/dev/null"
    });

    try {
        const fd4Payload = Buffer.from([0xaa, 0xbb, 0xcc]);
        const fd5Payload = Buffer.from([0x11, 0x22, 0x33, 0x44]);

        const fd5Echoed = await exchangeBytes(handles.monitoring, fd5Payload);

        t.deepEqual(Array.from(fd5Echoed), Array.from(fd5Payload));

        const fd4Echoed = await exchangeBytes(handles.control, fd4Payload);

        t.deepEqual(Array.from(fd4Echoed), Array.from(fd4Payload));
    } finally {
        await stopChild(handles.child);
    }
});

test.serial("process executor forwarding: exposes fd4 and fd5 under the locked layout", async t => {
    const handles = spawnRunnerNode({
        nodeExecPath: process.execPath,
        runtimeEntry: fixtureChild,
        bootConfigPath: "/dev/null"
    });

    try {
        t.true(handles.control instanceof Duplex);
        t.true(handles.monitoring instanceof Duplex);
    } finally {
        await stopChild(handles.child);
    }
});

test.serial("process executor forwarding: rejects non-absolute runner-node entry and boot config paths", t => {
    t.throws(() => spawnRunnerNode({
        nodeExecPath: process.execPath,
        runtimeEntry: "relative-entry.js",
        bootConfigPath: "/dev/null"
    }), { message: /runtimeEntry must be an absolute path/ });

    t.throws(() => spawnRunnerNode({
        nodeExecPath: process.execPath,
        runtimeEntry: fixtureChild,
        bootConfigPath: "relative-boot.json"
    }), { message: /bootConfigPath must be an absolute path/ });
});

test.serial("process executor forwarding: does not inherit parent environment by default", async t => {
    const previous = process.env.RUNNER_EXECUTOR_SECRET;

    process.env.RUNNER_EXECUTOR_SECRET = "must-not-leak";

    const handles = spawnRunnerNode({
        nodeExecPath: process.execPath,
        runtimeEntry: fixtureChild,
        bootConfigPath: "/dev/null"
    });

    try {
        const stdoutText = await readUntil(handles.stdout, "ENV_SECRET:");

        t.true(stdoutText.includes("ENV_SECRET:\n"));
        t.false(stdoutText.includes("must-not-leak"));
    } finally {
        if (previous === undefined) {
            delete process.env.RUNNER_EXECUTOR_SECRET;
        } else {
            process.env.RUNNER_EXECUTOR_SECRET = previous;
        }
        await stopChild(handles.child);
    }
});

test.serial("process executor forwarding: uses explicit environment when provided", async t => {
    const handles = spawnRunnerNode({
        nodeExecPath: process.execPath,
        runtimeEntry: fixtureChild,
        bootConfigPath: "/dev/null",
        env: { RUNNER_EXECUTOR_SECRET: "explicit-value" }
    });

    try {
        const stdoutText = await readUntil(handles.stdout, "ENV_SECRET:explicit-value");

        t.true(stdoutText.includes("ENV_SECRET:explicit-value"));
    } finally {
        await stopChild(handles.child);
    }
});
