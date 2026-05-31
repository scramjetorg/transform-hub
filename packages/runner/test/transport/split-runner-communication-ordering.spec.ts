import test from "ava";
import path from "path";
import { spawn } from "child_process";
import { createFakeInstancesServer } from "./fake-instances-server";
import { RunnerMessageCode, CommunicationChannel as CC } from "@scramjet/symbols";

const INSTANCE_ID = "00000000-0000-0000-0000-0000000000aa";
const startRunner = path.resolve(__dirname, "../../src/bin/start-runner.ts");
const sequenceDir = path.resolve(__dirname, "../fixtures/trivial-sequence");

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

        child.once("close", (code, signal) => {
            clearTimeout(timer);
            resolve({ code, signal });
        });
        child.once("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

test("split runner communication: sends PING before any later monitoring or terminal frame", async t => {
    t.timeout(15_000);

    const server = await createFakeInstancesServer(INSTANCE_ID);

    t.teardown(() => server.close());
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const child = spawn(process.execPath, ["-r", "ts-node/register", startRunner], {
        env: buildEnv(server.port),
        stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));

    const exit = waitForExit(child, stdout, stderr, () => JSON.stringify({
        channels: Array.from(server.channels.keys()),
        monitoringFrames: server.frames.monitoring,
        harnessErrors: server.harnessErrors.map(e => e.message),
    }));

    const stdin = await server.awaitChannel(CC.STDIN, 5_000);

    stdin.end();
    stdin.destroy();

    await exit;

    const monitoringFrames = server.frames.monitoring;
    const firstFrame = monitoringFrames[0];
    const firstPayload = firstFrame?.[1] as {
        sequenceInfo?: { id?: string };
        payload?: { system?: { processPID?: number } };
    } | undefined;
    const pingIndex = monitoringFrames.findIndex(f => f[0] === RunnerMessageCode.PING);
    const pangIndex = monitoringFrames.findIndex(f => f[0] === RunnerMessageCode.PANG);
    const terminals = monitoringFrames.filter(f => f[0] === RunnerMessageCode.SEQUENCE_COMPLETED || f[0] === RunnerMessageCode.SEQUENCE_STOPPED);

    t.true(server.channels.has(CC.MONITORING), "monitoring channel opened");
    t.true(monitoringFrames.length > 0, "at least one monitoring frame received");
    t.is(firstFrame?.[0], RunnerMessageCode.PING, "first monitoring frame must be PING");
    t.is(firstPayload?.sequenceInfo?.id, INSTANCE_ID, "PING sequenceInfo.id matches INSTANCE_ID");
    t.is(typeof firstPayload?.payload?.system?.processPID, "number", "PING payload.system.processPID is a number");
    t.true((firstPayload?.payload?.system?.processPID ?? 0) > 0, "processPID > 0");
    t.true(pangIndex === -1 || (pingIndex !== -1 && pangIndex > pingIndex), "PANG frame, when present, follows PING");
    t.is(terminals.length, 1, "exactly one terminal frame");
});
