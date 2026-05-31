import test from "ava";
import path from "path";
import { spawn } from "child_process";
import { createFakeInstancesServer } from "./fake-instances-server";
import { RunnerMessageCode, CommunicationChannel as CC } from "@scramjet/symbols";

const INSTANCE_ID = "00000000-0000-0000-0000-0000000000aa";
const startRunner = path.resolve(__dirname, "../../src/bin/start-runner.ts");
const sequenceDir = path.resolve(__dirname, "../../../runner-node/test/fixtures/input-sequence");

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
        RUNNER_CONNECT_INFO: JSON.stringify({ appConfig: {}, args: [], instanceName: "input-sequence" }),
        INSTANCES_SERVER_PORT: String(port),
        INSTANCES_SERVER_HOST: "127.0.0.1",
        INSTANCE_ID,
    };
}

async function waitForPing(server: Awaited<ReturnType<typeof createFakeInstancesServer>>, timeoutMs: number) {
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
        const ping = server.frames.monitoring.find(([code]) => code === RunnerMessageCode.PING);

        if (ping) return ping;
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    return undefined;
}

async function waitForExit(child: ReturnType<typeof spawn>, timeoutMs: number): Promise<{ code: number | null; signal: NodeJS.Signals | null } | undefined> {
    if (child.exitCode !== null) return { code: child.exitCode, signal: child.signalCode };

    return new Promise(resolve => {
        const timer = setTimeout(() => {
            child.kill("SIGKILL");
            resolve(undefined);
        }, timeoutMs);

        child.once("exit", (code, signal) => {
            clearTimeout(timer);
            resolve({ code, signal });
        });
        child.once("error", () => {
            clearTimeout(timer);
            resolve(undefined);
        });
    });
}

function encodeInputItems(items: unknown[]): string {
    const headers = "content-type: application/x-ndjson\r\n\r\n";
    const body = items.map(item => JSON.stringify(item)).join("\r\n") + "\r\n";

    return headers + body;
}

function parseOutputItems(raw: Buffer | undefined): any[] {
    return (raw ?? Buffer.alloc(0))
        .toString("utf8")
        .split(/\r?\n/)
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line));
}

test("split runner communication: round-trips CC.IN input through input-sequence", async t => {
    t.timeout(15_000);

    const server = await createFakeInstancesServer(INSTANCE_ID);

    t.teardown(() => server.close());

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const outerChild = spawn(process.execPath, ["-r", "ts-node/register", startRunner], {
        env: buildEnv(server.port),
        stdio: ["ignore", "pipe", "pipe"],
    });

    t.teardown(() => {
        if (outerChild.exitCode === null) outerChild.kill("SIGKILL");
    });
    outerChild.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    outerChild.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));

    const ping = await waitForPing(server, 8_000);

    t.truthy(ping, "PING must arrive");
    t.is(server.frames.monitoring[0]?.[0], RunnerMessageCode.PING, "PING is first on MONITORING");

    const inSocket = await server.awaitChannel(CC.IN, 8_000);

    t.truthy(inSocket, "CC.IN channel opened by runner-node");

    const inputItems = [{ a: 1 }, { a: 2 }, { a: 3 }];

    inSocket.write(encodeInputItems(inputItems));
    inSocket.end();

    const exit = await waitForExit(outerChild, 8_000);

    t.truthy(exit, [
        "child exits within 8000ms",
        "stdout:",
        Buffer.concat(stdout).toString("utf8"),
        "stderr:",
        Buffer.concat(stderr).toString("utf8"),
        "diagnostics:",
        JSON.stringify({
            channels: Array.from(server.channels.keys()),
            monitoringFrames: server.frames.monitoring,
            harnessErrors: server.harnessErrors.map(e => e.message),
        }),
    ].join("\n"));
    t.is(outerChild.exitCode, 0, "child exits with code 0");

    const outputItems = parseOutputItems(server.frames.raw.get(CC.OUT));

    t.deepEqual(outputItems, [
        { echo: { a: 1 }, from: "input-sequence" },
        { echo: { a: 2 }, from: "input-sequence" },
        { echo: { a: 3 }, from: "input-sequence" },
    ], "CC.OUT echoes exactly 3 input-sequence items");

    const terminals = server.frames.monitoring.filter(([code]) =>
        code === RunnerMessageCode.SEQUENCE_COMPLETED || code === RunnerMessageCode.SEQUENCE_STOPPED
    );

    t.is(terminals.length, 1, "exactly one terminal frame");
});
