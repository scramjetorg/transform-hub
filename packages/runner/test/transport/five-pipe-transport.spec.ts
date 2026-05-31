import test from "ava";
import { once } from "events";
import { spawn, ChildProcess } from "child_process";
import { join } from "path";
import { Duplex } from "stream";

const childPath = join(__dirname, "..", "fixtures", "five-pipe-child.js");
const fivePipeStdio = ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"] as const;

function isDuplex(stream: unknown): stream is Duplex {
    return stream instanceof Duplex;
}

function spawnFivePipeChild() {
    return spawn(process.execPath, [childPath], { stdio: [...fivePipeStdio] });
}

async function readUntil(stream: NodeJS.ReadableStream, marker: string): Promise<string> {
    let output = "";

    while (!output.includes(marker)) {
        const [chunk] = await once(stream, "data") as [Buffer];

        output += chunk.toString("utf8");
    }

    return output;
}

async function writeAndRead(stream: Duplex, payload: string): Promise<string> {
    const data = once(stream, "data") as Promise<[Buffer]>;

    stream.write(payload);

    const [chunk] = await data;

    return chunk.toString("utf8");
}

async function stopChild(child: ChildProcess): Promise<void> {
    if (child.exitCode === null && child.signalCode === null) {
        child.kill();
    }

    await once(child, "close");
}

test.serial("five-pipe transport exposes fd3 as unused ipc and fd4/fd5 as independent duplex pipes", async t => {
    t.deepEqual(fivePipeStdio, ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"]);

    const child = spawnFivePipeChild();

    try {
        t.is(typeof child["send"], "function");
        const stdio = child.stdio as unknown[];

        t.is(stdio.length, 6);
        t.true(isDuplex(stdio[4]));
        t.true(isDuplex(stdio[5]));

        const control = stdio[4];
        const monitoring = stdio[5];

        if (!isDuplex(control) || !isDuplex(monitoring)) {
            t.fail("fd4 and fd5 must both be duplex pipes");
            return;
        }

        const stdout = await readUntil(child.stdout!, "HAS_SEND:true");
        const stderr = await readUntil(child.stderr!, "STDERR_MARK");

        t.true(stdout.includes("STDOUT_MARK"));
        t.true(stdout.includes("HAS_SEND:true"));
        t.false(stdout.includes("STDERR_MARK"));
        t.true(stderr.includes("STDERR_MARK"));
        t.false(stderr.includes("STDOUT_MARK"));

        t.is(await writeAndRead(control, "control-frame"), "control-frame");
        t.is(await writeAndRead(monitoring, "monitoring-frame"), "monitoring-frame");
    } finally {
        await stopChild(child);
    }
});

test.serial("five-pipe transport detects when fd3 is not reserved for ipc", async t => {
    const child = spawn(process.execPath, [childPath], {
        stdio: ["pipe", "pipe", "pipe", "pipe", "pipe", "pipe"]
    });

    try {
        t.not(typeof child["send"], "function");

        const stdout = await readUntil(child.stdout!, "HAS_SEND:false");

        t.true(stdout.includes("HAS_SEND:false"));
    } finally {
        await stopChild(child);
    }
});

test.serial("five-pipe transport detects missing fd4/fd5 pipes", async t => {
    const child = spawn(process.execPath, [childPath], {
        stdio: ["pipe", "pipe", "pipe", "ipc"]
    });

    const [code] = await once(child, "close") as [number | null, NodeJS.Signals | null];

    t.not(code, 0);
});
