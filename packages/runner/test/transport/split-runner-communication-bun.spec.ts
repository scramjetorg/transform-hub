import test from "ava";
import path from "path";
import { spawn } from "child_process";

import { createFakeInstancesServer } from "./fake-instances-server";
import { CommunicationChannel as CC, RunnerMessageCode } from "@scramjet/symbols";

const INSTANCE_ID = "00000000-0000-0000-0000-0000000000aa";
const startRunner = path.resolve(__dirname, "../../src/bin/start-runner.ts");
const sequenceDir = path.resolve(__dirname, "../../../runner-node/test/fixtures/trivial-sequence");

function buildEnv(port: number): NodeJS.ProcessEnv {
    return {
        ...process.env,
        SEQUENCE_PATH: path.resolve(sequenceDir, "index.js"),
        SEQUENCE_INFO: JSON.stringify({
            id: INSTANCE_ID,
            config: { engines: { bun: "*" } },
            instances: [],
            location: sequenceDir,
        }),
        RUNNER_CONNECT_INFO: JSON.stringify({ appConfig: {}, args: [], instanceName: "trivial" }),
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
                "runner did not exit within 12s",
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
        child.once("error", err => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function waitForPingFrame(frames: Array<[number, any]>): Promise<[number, any] | undefined> {
    const deadline = Date.now() + 8_000;

    while (Date.now() < deadline) {
        const ping = frames.find(([code]) => code === RunnerMessageCode.PING);

        if (ping) return ping;
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    return frames.find(([code]) => code === RunnerMessageCode.PING);
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

test("split runner communication: bun engine delegates host mode with metadata", async t => {
    t.timeout(20_000);

    const server = await createFakeInstancesServer(INSTANCE_ID);
    t.teardown(() => server.close());
    closeHostSideOutputChannelsAfterTerminalFrame(server);

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const child = spawn(process.execPath, ["-r", "ts-node/register", startRunner], {
        env: buildEnv(server.port),
        stdio: ["ignore", "pipe", "pipe"],
    });

    t.teardown(() => child.kill("SIGKILL"));
    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));

    const stdin = await server.awaitChannel(CC.STDIN, 5_000);
    const ping = await waitForPingFrame(server.frames.monitoring);

    stdin.end();
    stdin.destroy();

    if (!ping) {
        for (const socket of server.sockets) socket.destroy();
        child.kill("SIGTERM");
    }

    await waitForExit(child, stdout, stderr, () => JSON.stringify({
        channels: Array.from(server.channels.keys()),
        monitoringFrames: server.frames.monitoring,
        harnessErrors: server.harnessErrors.map(e => e.message),
    }));

    t.truthy(ping, "no PING frame received within 8s");
    t.is(ping![1].id, INSTANCE_ID, "PING id matches instance id");
    t.truthy(ping![1].sequenceInfo, "sequenceInfo present");
    t.is(ping![1].sequenceInfo.config.engines.bun, "*", "bun engine selected in sequenceInfo");
    t.truthy(ping![1].payload, "payload present");
    t.deepEqual(ping![1].payload.appConfig, {}, "appConfig forwarded in ping payload");
    t.deepEqual(ping![1].payload.args, [], "args forwarded in ping payload");
    t.is(ping![1].payload.instanceName, "trivial", "instanceName forwarded in ping payload");
    t.true(server.channels.has(CC.STDIN), "CC.STDIN opened");
    t.true(server.channels.has(CC.MONITORING), "monitoring channel opened");
    t.true(server.channels.has(CC.CONTROL), "control channel opened");
    t.true(server.harnessErrors.length === 0, `no harness errors: ${server.harnessErrors.map(e => e.message).join("; ")}`);
});
