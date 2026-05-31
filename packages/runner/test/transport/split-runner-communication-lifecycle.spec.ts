import test from "ava";
import path from "path";
import { spawn } from "child_process";
import { createFakeInstancesServer } from "./fake-instances-server";
import { CommunicationChannel as CC } from "@scramjet/symbols";

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

function formatDiagnostics(
    stdout: Buffer[],
    stderr: Buffer[],
    server: Awaited<ReturnType<typeof createFakeInstancesServer>>,
    reason: string
): string {
    return [
        reason,
        "stdout:",
        Buffer.concat(stdout).toString("utf8"),
        "stderr:",
        Buffer.concat(stderr).toString("utf8"),
        "diagnostics:",
        JSON.stringify({
            channels: Array.from(server.channels.keys()),
            sockets: server.sockets.size,
            harnessErrors: server.harnessErrors.map(e => e.message),
        }),
    ].join("\n");
}

async function waitForExit(
    child: ReturnType<typeof spawn>,
    stdout: Buffer[],
    stderr: Buffer[],
    server: Awaited<ReturnType<typeof createFakeInstancesServer>>
): Promise<{ timedOut: boolean; diagnostics: string }> {
    let timedOut = false;

    const diagnostics = () => formatDiagnostics(stdout, stderr, server, "runner did not exit within 12000ms");

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
            resolve({
                timedOut,
                diagnostics: diagnostics(),
            });
        }, 12_000);

        child.once("exit", () => {
            clearTimeout(timer);
            resolve({
                timedOut,
                diagnostics: timedOut ? diagnostics() : formatDiagnostics(stdout, stderr, server, "runner exited"),
            });
        });
        child.once("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function waitForSocketDrain(server: Awaited<ReturnType<typeof createFakeInstancesServer>>): Promise<void> {
    const deadline = Date.now() + 2_000;

    while (server.sockets.size > 0 && Date.now() < deadline) {
        await new Promise(res => setTimeout(res, 25));
    }
}

test("split runner communication: closes runner-node input channel before exiting", async t => {
    t.timeout(15_000);

    const server = await createFakeInstancesServer(INSTANCE_ID);

    t.teardown(() => server.close());

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const outerChild = spawn(process.execPath, ["-r", "ts-node/register", startRunner], {
        env: buildEnv(server.port),
        stdio: ["ignore", "pipe", "pipe"],
    });

    outerChild.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    outerChild.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));

    const exit = waitForExit(outerChild, stdout, stderr, server);

    const stdin = await server.awaitChannel(CC.STDIN, 5_000);

    stdin.end();
    stdin.destroy();

    const { diagnostics } = await exit;

    t.is(outerChild.exitCode, 0, `outer runner must exit 0\n${diagnostics}`);
    t.is(outerChild.signalCode, null, `no signal kill\n${diagnostics}`);

    await waitForSocketDrain(server);

    t.is(server.sockets.size, 0, `no leaked sockets — all channel sockets closed including CC.IN\n${diagnostics}`);

    const inSocket = server.channels.get(CC.IN);

    if (!inSocket) {
        t.fail("CC.IN channel was never opened by runner-node");
        return;
    }

    t.true(inSocket.readableEnded || inSocket.destroyed, `CC.IN closed by runner-node\n${diagnostics}`);
});
