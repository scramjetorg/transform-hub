import test from "ava";
import path from "path";
import { spawn } from "child_process";
import { createFakeInstancesServer } from "./fake-instances-server";
import { RunnerMessageCode, CommunicationChannel as CC, InstanceStatus } from "@scramjet/symbols";

const INSTANCE_ID = "00000000-0000-0000-0000-0000000000aa";
const startRunner = path.resolve(__dirname, "../../src/bin/start-runner.ts");
const sequenceDir = path.resolve(__dirname, "../../../runner-node/test/fixtures/trivial-sequence");

function buildEnv(port: number): NodeJS.ProcessEnv {
    return {
        ...process.env,
        SEQUENCE_PATH: path.resolve(sequenceDir, "index.js"),
        SEQUENCE_INFO: JSON.stringify({
            id: INSTANCE_ID,
            config: { engines: { node: "*" } },
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
            const timeoutDiagnostics = [
                "runner did not exit within 500ms",
                "stdout:",
                Buffer.concat(stdout).toString("utf8"),
                "stderr:",
                Buffer.concat(stderr).toString("utf8"),
                "diagnostics:",
                diagnostics(),
            ].join("\n");

            void timeoutDiagnostics;
            child.kill("SIGKILL");
            resolve({ code: null, signal: "SIGKILL" });
        }, 500);

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

async function waitForPingFrame(frames: Array<[number, any]>): Promise<[number, any] | undefined> {
    const deadline = Date.now() + 8_000;

    while (Date.now() < deadline) {
        const ping = frames.find(([code]) => code === RunnerMessageCode.PING);

        if (ping) return ping;
        await new Promise(resolve => setTimeout(resolve, 100));
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

test("split runner communication: emits PING with handshake metadata", async t => {
    t.timeout(15_000);

    const server = await createFakeInstancesServer(INSTANCE_ID);

    t.teardown(() => server.close());
    closeHostSideOutputChannelsAfterTerminalFrame(server);

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const child = spawn(process.execPath, ["-r", "ts-node/register", startRunner], {
        env: buildEnv(server.port),
        stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));

    const ping = await waitForPingFrame(server.frames.monitoring);

    const stdin = server.channels.get(CC.STDIN);

    stdin?.end();
    stdin?.destroy();

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
    t.truthy(ping, "PING frame must be present");
    t.is(ping![1].id, INSTANCE_ID, "PING id matches instance id");
    t.is(typeof ping![1].created, "number", "created timestamp is numeric");
    t.true(ping![1].created > 0, "created timestamp present");
    t.is(ping![1].status, InstanceStatus.STARTING, "status matches legacy startup state");
    t.is(ping![1].inputHeadersSent, false, "inputHeadersSent defaults to false");
    t.truthy(ping![1].sequenceInfo, "sequenceInfo present");
    t.is(ping![1].sequenceInfo.id, INSTANCE_ID, "sequenceInfo.id matches");
    t.truthy(ping![1].sequenceInfo.config, "sequenceInfo.config present");
    t.true(Array.isArray(ping![1].sequenceInfo.instances), "sequenceInfo.instances is array");
    t.truthy(ping![1].sequenceInfo.location, "sequenceInfo.location present");
    t.truthy(ping![1].payload, "payload present");
    t.is(typeof ping![1].payload?.system?.processPID, "string", "processPID is string");
    t.true(Number(ping![1].payload?.system?.processPID ?? 0) > 0, "processPID > 0");
    t.truthy(ping![1].payload?.appConfig, "appConfig present");
    t.true(Array.isArray(ping![1].payload?.args), "args is array");
    t.is(ping![1].payload?.instanceName, "trivial", "instanceName matches");
});
