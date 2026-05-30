import test from "ava";
import { spawn, ChildProcess } from "child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { Readable } from "stream";

import { RunnerMessageCode } from "@scramjet/symbols";

import { parseBootConfigPathFromArgv, validateBootConfig } from "../src/boot-config";
import { createFdStreams } from "../src/fd-streams";

const ENTRY = resolve(__dirname, "../src/bin/runner-node.ts");
const FIXTURE = resolve(__dirname, "fixtures/trivial-sequence.js");

type Frame = [number, Record<string, unknown>];

function makeBootConfig(extra: Record<string, unknown> = {}): string {
    const dir = mkdtempSync(join(tmpdir(), "runner-node-skeleton-"));
    const path = join(dir, "boot.json");

    writeFileSync(path, JSON.stringify({ sequencePath: FIXTURE, instanceId: "test-instance", ...extra }));
    return path;
}

function getStdioStream(child: ChildProcess, fd: number): Readable {
    const slot = (child.stdio as unknown as Array<Readable | null | undefined>)[fd];

    if (!slot) throw new Error(`fd ${fd} stream not available on child`);
    return slot;
}

function parseFrames(buf: string): Frame[] {
    return buf
        .split("\r\n")
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line) as Frame);
}

test("parseBootConfigPathFromArgv reads argv[2]", t => {
    const result = parseBootConfigPathFromArgv(["/usr/bin/node", "/srv/runner-node.js", "/tmp/boot.json"]);

    t.is(result, "/tmp/boot.json");
});

test("parseBootConfigPathFromArgv throws when missing", t => {
    t.throws(() => parseBootConfigPathFromArgv(["/usr/bin/node", "/srv/runner-node.js"]));
});

test("validateBootConfig requires sequencePath and instanceId", t => {
    t.throws(() => validateBootConfig({}));
    t.throws(() => validateBootConfig({ sequencePath: "" }));
    t.throws(() => validateBootConfig({ sequencePath: "/x" }), { message: /instanceId/ });
    t.deepEqual(
        validateBootConfig({ sequencePath: "/x", instanceId: "i-1" }),
        { sequencePath: "/x", instanceId: "i-1" }
    );
});

test("validateBootConfig accepts and validates instancesServerPort/Host", t => {
    t.deepEqual(
        validateBootConfig({
            sequencePath: "/x",
            instanceId: "i-1",
            instancesServerPort: 9000,
            instancesServerHost: "127.0.0.1",
        }),
        {
            sequencePath: "/x",
            instanceId: "i-1",
            instancesServerPort: 9000,
            instancesServerHost: "127.0.0.1",
        }
    );

    t.throws(() => validateBootConfig({
        sequencePath: "/x", instanceId: "i", instancesServerPort: -1, instancesServerHost: "h",
    }), { message: /instancesServerPort/ });
    t.throws(() => validateBootConfig({
        sequencePath: "/x", instanceId: "i", instancesServerPort: 9000, instancesServerHost: "",
    }), { message: /instancesServerHost/ });
    t.throws(() => validateBootConfig({
        sequencePath: "/x", instanceId: "i", instancesServerPort: 9000,
    }), { message: /must be set together/ });
});

test("createFdStreams is a function (smoke - fd4/5 only valid in spawned child)", t => {
    // We cannot invoke createFdStreams() inside an ava worker because fd4/fd5
    // are not opened by the parent here. The end-to-end coverage of this
    // function lives in the spawn-based tests below, where the parent does
    // wire the required pipes.
    t.is(typeof createFdStreams, "function");
});

test("runner-node child runs the sequence via runSequence and emits SEQUENCE_COMPLETED on fd5", async t => {
    const bootPath = makeBootConfig();

    const child = spawn(
        process.execPath,
        ["-r", "ts-node/register/transpile-only", ENTRY, bootPath],
        {
            stdio: ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"],
        }
    );

    let monitoringBuf = "";
    let stderrBuf = "";

    getStdioStream(child, 5).on("data", (chunk: Buffer) => {
        monitoringBuf += chunk.toString("utf8");
    });
    child.stderr!.on("data", (chunk: Buffer) => {
        stderrBuf += chunk.toString("utf8");
    });

    const exitCode: number = await new Promise((resolveExit, rejectExit) => {
        child.once("error", rejectExit);
        child.once("exit", code => resolveExit(code ?? -1));
    });

    t.is(exitCode, 0, `child should exit cleanly. stderr=${stderrBuf}`);

    const frames = parseFrames(monitoringBuf);

    // The trivial sequence returns the primitive `0`, which goes through
    // runSequence's primitive branch: a single empty PANG frame followed by
    // the terminal SEQUENCE_COMPLETED frame written by runner-node itself.
    t.true(frames.length >= 2, `expected >=2 frames, got: ${monitoringBuf}`);

    const codes = frames.map(([code]) => code);

    t.true(codes.includes(RunnerMessageCode.PANG), `expected PANG frame, got codes=${codes.join(",")}`);
    t.is(codes[codes.length - 1], RunnerMessageCode.SEQUENCE_COMPLETED);

    // The skeleton `startup-ready` envelope must be gone now that the entry
    // runs the real runtime: there should be no JSON-line `{"type": ...}`
    // frames mixed into the wire-format monitoring stream.
    t.notRegex(monitoringBuf, /"type":"startup-ready"/);
});

test("runner-node child does not read SEQUENCE_PATH/SEQUENCE_INFO/RUNNER_CONNECT_INFO from env", async t => {
    // Set legacy env vars to clearly invalid values; the child must ignore them
    // and only use the boot config file passed via argv.
    const bootPath = makeBootConfig();

    const child = spawn(
        process.execPath,
        ["-r", "ts-node/register/transpile-only", ENTRY, bootPath],
        {
            stdio: ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"],
            env: {
                ...process.env,
                SEQUENCE_PATH: "/this/path/must/not/be/used",
                SEQUENCE_INFO: "{not-json}",
                RUNNER_CONNECT_INFO: "garbage",
            },
        }
    );

    let monitoringBuf = "";

    getStdioStream(child, 5).on("data", (chunk: Buffer) => {
        monitoringBuf += chunk.toString("utf8");
    });

    const exitCode: number = await new Promise((resolveExit, rejectExit) => {
        child.once("error", rejectExit);
        child.once("exit", code => resolveExit(code ?? -1));
    });

    t.is(exitCode, 0, "child should ignore legacy env vars and exit cleanly");

    const frames = parseFrames(monitoringBuf);
    const codes = frames.map(([code]) => code);

    t.true(codes.includes(RunnerMessageCode.SEQUENCE_COMPLETED));
});

test("source has no references to legacy env vars", t => {
    const files = [
        "../src/boot-config.ts",
        "../src/fd-streams.ts",
        "../src/bin/runner-node.ts",
    ].map(p => resolve(__dirname, p));

    for (const file of files) {
        const src = readFileSync(file, "utf8");

        t.false(src.includes("SEQUENCE_PATH"), `${file} contains SEQUENCE_PATH`);
        t.false(src.includes("SEQUENCE_INFO"), `${file} contains SEQUENCE_INFO`);
        t.false(src.includes("RUNNER_CONNECT_INFO"), `${file} contains RUNNER_CONNECT_INFO`);
    }
});
