import test from "ava";
import path from "path";
import { spawn } from "child_process";
import { createFakeInstancesServer } from "./fake-instances-server";
import { RunnerMessageCode, CommunicationChannel as CC } from "@scramjet/symbols";

const INSTANCE_ID = "00000000-0000-0000-0000-0000000000aa";
const startRunner = path.resolve(__dirname, "../../src/bin/start-runner.ts");
const fixturesDir = path.resolve(__dirname, "../../../runner-node/test/fixtures");

function buildEnv(port: number, sequenceName: string): NodeJS.ProcessEnv {
    const sequenceDir = path.resolve(fixturesDir, sequenceName);

    return {
        ...process.env,
        SCRAMJET_RUNNER_TRANSPORT_CONFIG: JSON.stringify({ kind: "legacy" }),
        SEQUENCE_PATH: path.resolve(sequenceDir, "index.js"),
        SEQUENCE_INFO: JSON.stringify({
            id: INSTANCE_ID,
            config: { engines: { node: "*" } },
            instances: [],
            location: sequenceDir,
        }),
        RUNNER_CONNECT_INFO: JSON.stringify({ appConfig: {}, args: [], instanceName: sequenceName }),
        INSTANCES_SERVER_PORT: String(port),
        INSTANCES_SERVER_HOST: "127.0.0.1",
        INSTANCE_ID,
    };
}

async function waitForExit(
    child: ReturnType<typeof spawn>,
    stdout: Buffer[],
    stderr: Buffer[],
    diagnostics: () => string
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            child.kill("SIGKILL");
            reject(new Error([
                "runner did not exit within 12000ms",
                "stdout:",
                Buffer.concat(stdout).toString("utf8"),
                "stderr:",
                Buffer.concat(stderr).toString("utf8"),
                "diagnostics:",
                diagnostics(),
            ].join("\n")));
        }, 12_000);

        child.once("exit", (code, signal) => {
            clearTimeout(timer);
            resolve({ code, signal });
        });
        child.once("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

function closeHostSideOutputChannelsAfterTerminalFrame(server: Awaited<ReturnType<typeof createFakeInstancesServer>>): void {
    const pushFrame = server.frames.monitoring.push.bind(server.frames.monitoring);

    server.frames.monitoring.push = (...frames: Array<[number, any]>) => {
        const ret = pushFrame(...frames);
        const hasTerminalFrame = frames.some(([code]) =>
            code === RunnerMessageCode.SEQUENCE_COMPLETED || code === RunnerMessageCode.SEQUENCE_STOPPED
        );

        if (hasTerminalFrame) {
            for (const socket of server.sockets) socket.destroy();
        }

        return ret;
    };
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForMonitoringFrame(
    frames: Array<[number, any]>,
    predicate: (frame: [number, any]) => boolean,
    timeoutMs: number
): Promise<[number, any] | undefined> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const frame = frames.find(predicate);

        if (frame) return frame;
        await delay(25);
    }

    return frames.find(predicate);
}

function terminalFrames(frames: Array<[number, any]>): Array<[number, any]> {
    return frames.filter(([code]) =>
        code === RunnerMessageCode.SEQUENCE_COMPLETED || code === RunnerMessageCode.SEQUENCE_STOPPED
    );
}

function parseOutItems(raw: Buffer): any[] {
    return raw
        .toString("utf8")
        .split(/\r?\n/)
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line));
}

test("split runner communication: delayed sequence emits no premature terminal frame", async t => {
    t.timeout(15_000);

    const server = await createFakeInstancesServer(INSTANCE_ID);

    t.teardown(() => server.close());
    closeHostSideOutputChannelsAfterTerminalFrame(server);

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const child = spawn(process.execPath, ["-r", "ts-node/register", startRunner], {
        env: buildEnv(server.port, "delayed-sequence"),
        stdio: ["ignore", "pipe", "pipe"],
    });

    t.teardown(() => child.kill("SIGKILL"));
    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));

    const stdin = await server.awaitChannel(CC.STDIN, 5_000);

    stdin.end();
    stdin.destroy();

    const ping = await waitForMonitoringFrame(
        server.frames.monitoring,
        ([code]) => code === RunnerMessageCode.PING,
        8_000
    );

    if (!ping) {
        t.fail("PING must arrive before timing assertions");
        return;
    }

    const pingAt = Date.now();

    for (const offset of [500, 1000, 1500]) {
        await delay(Math.max(0, pingAt + offset - Date.now()));
        t.is(terminalFrames(server.frames.monitoring).length, 0, `no terminal frame ${offset}ms after PING`);
    }

    await waitForExit(child, stdout, stderr, () => JSON.stringify({
        channels: Array.from(server.channels.keys()),
        monitoringFrames: server.frames.monitoring,
        harnessErrors: server.harnessErrors.map(e => e.message),
    }));

    t.is(terminalFrames(server.frames.monitoring).length, 1, "exactly one terminal frame total");
});

test("split runner communication: output sequence delivers items on CC.OUT", async t => {
    t.timeout(15_000);

    const server = await createFakeInstancesServer(INSTANCE_ID);

    t.teardown(() => server.close());
    closeHostSideOutputChannelsAfterTerminalFrame(server);

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const child = spawn(process.execPath, ["-r", "ts-node/register", startRunner], {
        env: buildEnv(server.port, "output-sequence"),
        stdio: ["ignore", "pipe", "pipe"],
    });

    t.teardown(() => child.kill("SIGKILL"));
    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));

    const stdin = await server.awaitChannel(CC.STDIN, 5_000);

    stdin.end();
    stdin.destroy();

    await waitForExit(child, stdout, stderr, () => JSON.stringify({
        channels: Array.from(server.channels.keys()),
        monitoringFrames: server.frames.monitoring,
        rawChannels: Array.from(server.frames.raw.keys()),
        harnessErrors: server.harnessErrors.map(e => e.message),
    }));

    t.is(server.frames.monitoring[0]?.[0], RunnerMessageCode.PING, "PING was first monitoring frame");

    const rawOut = server.frames.raw.get(CC.OUT);

    t.truthy(rawOut?.length, "CC.OUT raw bytes should be non-empty");

    const items = parseOutItems(rawOut ?? Buffer.alloc(0));

    t.true(items.length >= 3 && items.length <= 5, "OUT item count is in expected sequence range");
    t.true(items.every(item => item.from === "output-sequence"), "each OUT item comes from output-sequence");
});
