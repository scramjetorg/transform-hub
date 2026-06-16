import test from "ava";
import { ChildProcess } from "child_process";
import { once } from "events";
import * as fs from "fs";
import net from "net";
import * as os from "os";
import { delimiter, dirname, join, resolve } from "path";
import { PassThrough, Writable } from "stream";

import { RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";

import { translateChildClose, writeTerminalLifecycleFrame } from "../../src/executor/exit-translation";
import { spawnRunnerPython } from "../../src/executor/python-process-executor";
import { forwardChildStdio } from "../../src/executor/stream-forwarder";

const INSTANCE_ID = "00000000-0000-0000-0000-0000000000cc";
const PYTHON_IN = "5";
const PYTHON_OUT = "6";
const PYTHON_LOG = "7";
const PYTHON_HANDSHAKE_LEN = 37;
const INSTANCE_ID_LEN = 36;
const packagesDir = resolve(__dirname, "..", "..", "..");
const runnerPythonDir = resolve(packagesDir, "runner-python");
const pythonSequenceFixture = resolve(
    runnerPythonDir,
    "tests",
    "parity",
    "fixtures",
    "throw-after-stdout",
    "sequence",
    "main.py"
);

interface CapturedSink {
    sink: Writable;
    chunks: Buffer[];
    snapshot(): Buffer;
}

interface PythonInstancesServer {
    port: number;
    sockets: Set<net.Socket>;
    channels: Map<string, net.Socket>;
    harnessErrors: Error[];
    awaitChannel(channelCode: string, timeoutMs?: number): Promise<net.Socket>;
    close(): Promise<void>;
}

function makeCapturingSink(): CapturedSink {
    const chunks: Buffer[] = [];
    const sink = new Writable({
        write(chunk: Buffer, _enc, cb): void {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            cb();
        }
    });

    return {
        sink,
        chunks,
        snapshot(): Buffer {
            return Buffer.concat(chunks);
        }
    };
}

async function createPythonInstancesServer(expectedInstanceId: string): Promise<PythonInstancesServer> {
    const sockets = new Set<net.Socket>();
    const channels = new Map<string, net.Socket>();
    const harnessErrors: Error[] = [];
    const waiters = new Map<string, Array<{
        resolve:(socket: net.Socket) => void;
        reject: (err: Error) => void;
        timer: NodeJS.Timeout;
    }>>();

    const notifyWaiters = (channelCode: string, socket: net.Socket): void => {
        const pending = waiters.get(channelCode);

        if (!pending) return;

        waiters.delete(channelCode);
        for (const waiter of pending) {
            clearTimeout(waiter.timer);
            waiter.resolve(socket);
        }
    };

    const server = net.createServer((socket) => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        socket.on("error", () => undefined);

        let header = Buffer.alloc(0);
        let channelCode: string | null = null;

        const onData = (chunk: Buffer): void => {
            if (channelCode !== null) return;

            header = Buffer.concat([header, chunk]);
            if (header.length < PYTHON_HANDSHAKE_LEN) return;

            const id = header.subarray(0, INSTANCE_ID_LEN).toString("utf8");
            const parsedChannel = header.subarray(INSTANCE_ID_LEN, PYTHON_HANDSHAKE_LEN).toString("utf8");

            if (id !== expectedInstanceId) {
                harnessErrors.push(new Error(`unexpected instance id: ${id} (expected ${expectedInstanceId})`));
                socket.destroy();
                return;
            }

            if (![PYTHON_IN, PYTHON_OUT, PYTHON_LOG].includes(parsedChannel)) {
                harnessErrors.push(new Error(`unexpected python host channel: ${parsedChannel}`));
                socket.destroy();
                return;
            }

            channelCode = parsedChannel;
            channels.set(channelCode, socket);
            notifyWaiters(channelCode, socket);
            socket.off("data", onData);
            socket.resume();
        };

        socket.on("data", onData);
    });

    await new Promise<void>((resolvePromise, rejectPromise) => {
        server.once("error", rejectPromise);
        server.listen(0, "127.0.0.1", () => resolvePromise());
    });

    const address = server.address();

    if (!address || typeof address === "string") {
        throw new Error("python instances server failed to bind");
    }

    const awaitChannel = (channelCode: string, timeoutMs = 5_000): Promise<net.Socket> => {
        const existing = channels.get(channelCode);

        if (existing) return Promise.resolve(existing);

        return new Promise<net.Socket>((resolvePromise, rejectPromise) => {
            const timer = setTimeout(() => {
                const pending = waiters.get(channelCode);

                if (pending) {
                    const filtered = pending.filter(waiter => waiter.timer !== timer);

                    if (filtered.length === 0) {
                        waiters.delete(channelCode);
                    } else {
                        waiters.set(channelCode, filtered);
                    }
                }

                rejectPromise(new Error(`python host channel ${channelCode} not opened within ${timeoutMs}ms`));
            }, timeoutMs);

            const pending = waiters.get(channelCode) ?? [];

            pending.push({ resolve: resolvePromise, reject: rejectPromise, timer });
            waiters.set(channelCode, pending);
        });
    };

    const close = async (): Promise<void> => {
        for (const [channelCode, pending] of waiters) {
            for (const waiter of pending) {
                clearTimeout(waiter.timer);
                waiter.reject(new Error(`server closing; python host channel ${channelCode} never opened`));
            }
        }

        waiters.clear();

        for (const socket of sockets) {
            socket.destroy();
        }

        sockets.clear();
        await new Promise<void>(resolvePromise => server.close(() => resolvePromise()));
    };

    return {
        port: address.port,
        sockets,
        channels,
        harnessErrors,
        awaitChannel,
        close,
    };
}

function writeBootConfig(port: number): { bootConfigPath: string; cleanup: () => void } {
    const dir = fs.mkdtempSync(join(os.tmpdir(), "runner-python-ordering-"));
    const bootConfigPath = join(dir, "boot-config.json");

    fs.writeFileSync(bootConfigPath, JSON.stringify({
        sequencePath: pythonSequenceFixture,
        instanceId: INSTANCE_ID,
        instancesServerPort: port,
        instancesServerHost: "127.0.0.1",
        sequenceInfo: {
            id: INSTANCE_ID,
            location: dirname(pythonSequenceFixture),
        },
        sequenceArgs: [],
        appConfig: {},
        logLevel: "INFO",
    }), { encoding: "utf8", mode: 0o600 });

    return {
        bootConfigPath,
        cleanup(): void {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    };
}

function buildPythonPath(): string {
    const entries = [
        resolve(runnerPythonDir, "src"),
        resolve(runnerPythonDir, "__pypackages__"),
    ];

    if (process.env.PYTHONPATH) {
        entries.push(process.env.PYTHONPATH);
    }

    return entries.join(delimiter);
}

function encodeControlFrame(code: RunnerMessageCode, payload: unknown): Buffer {
    return Buffer.from(JSON.stringify([code, payload]) + "\r\n", "utf8");
}

function parseMonitoringFrames(raw: Buffer): Array<[number, Record<string, unknown>]> {
    return raw
        .toString("utf8")
        .split("\r\n")
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line) as [number, Record<string, unknown>]);
}

async function waitForClose(
    child: ChildProcess,
    stdoutCapture: CapturedSink,
    stderrCapture: CapturedSink,
    monitoringCapture: CapturedSink,
    timeoutMs = 12_000,
): Promise<[number | null, NodeJS.Signals | null]> {
    return new Promise((resolvePromise, rejectPromise) => {
        const timer = setTimeout(() => {
            child.kill("SIGKILL");
            rejectPromise(new Error([
                `runner-python did not exit within ${timeoutMs}ms`,
                "stdout:",
                stdoutCapture.snapshot().toString("utf8"),
                "stderr:",
                stderrCapture.snapshot().toString("utf8"),
                "monitoring:",
                monitoringCapture.snapshot().toString("utf8"),
            ].join("\n")));
        }, timeoutMs);

        child.once("close", (code, signal) => {
            clearTimeout(timer);
            resolvePromise([code, signal]);
        });

        child.once("error", (err) => {
            clearTimeout(timer);
            rejectPromise(err);
        });
    });
}

async function stopChild(child: ChildProcess): Promise<void> {
    if (child.exitCode !== null || child.signalCode !== null) return;

    child.kill("SIGKILL");
    await once(child, "close");
}

test.serial("python stdout ordering: throw-after-stdout sequence flushes stdout before terminal SEQUENCE_STOPPED", async t => {
    t.timeout(15_000);

    const stdoutCapture = makeCapturingSink();
    const stderrCapture = makeCapturingSink();
    const monitoringCapture = makeCapturingSink();
    const server = await createPythonInstancesServer(INSTANCE_ID);
    const { bootConfigPath, cleanup } = writeBootConfig(server.port);
    const hostMonitoring = new PassThrough();
    const handles = spawnRunnerPython({
        runtimeEntry: "",
        bootConfigPath,
        cwd: runnerPythonDir,
        env: {
            PYTHONPATH: buildPythonPath(),
        }
    });
    const stdioHandles = forwardChildStdio(handles.child, {
        hostStdout: stdoutCapture.sink,
        hostStderr: stderrCapture.sink,
    });

    handles.monitoring.pipe(hostMonitoring, { end: false });
    hostMonitoring.pipe(monitoringCapture.sink);

    try {
        await Promise.all([
            server.awaitChannel(PYTHON_IN),
            server.awaitChannel(PYTHON_OUT),
            server.awaitChannel(PYTHON_LOG),
        ]);

        handles.control.write(encodeControlFrame(RunnerMessageCode.PONG, {
            appConfig: {},
            args: [],
            logLevel: "INFO",
        }));

        const [code, signal] = await waitForClose(
            handles.child,
            stdoutCapture,
            stderrCapture,
            monitoringCapture,
        );
        const translated = translateChildClose(code, signal);
        const stdoutBeforeTerminal = stdoutCapture.snapshot();
        const stderrBeforeTerminal = stderrCapture.snapshot().toString("utf8");

        t.deepEqual(server.harnessErrors, [], "python host channel server accepted the real runner-python handshakes");
        t.true(
            stdoutBeforeTerminal.includes(Buffer.from("stdout-before-boom\n")),
            "stdout marker must already be present on host STDOUT before terminal frame emission"
        );
        t.true(
            stderrBeforeTerminal.includes("Exception: boom"),
            "stderr should contain the python traceback for the raised exception"
        );
        t.is(translated.messageCode, RunnerMessageCode.SEQUENCE_STOPPED);
        t.is(translated.exitCode, RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION);

        const queued = writeTerminalLifecycleFrame(hostMonitoring, translated);
        const stdoutAfterTerminal = stdoutCapture.snapshot();

        t.true(queued, "terminal SEQUENCE_STOPPED frame should be queued for host MONITORING");
        t.deepEqual(
            stdoutAfterTerminal,
            stdoutBeforeTerminal,
            "no extra stdout bytes should arrive after the terminal monitoring frame is emitted"
        );

        hostMonitoring.end();
        await once(hostMonitoring, "end");

        const monitoringText = monitoringCapture.snapshot().toString("utf8");
        const monitoringFrames = parseMonitoringFrames(monitoringCapture.snapshot());
        const terminalFrame = monitoringFrames[monitoringFrames.length - 1];

        t.true(monitoringText.endsWith("\r\n"), "host MONITORING must stay CRLF framed");
        t.true(
            monitoringFrames.some(([frameCode]) => frameCode === RunnerMessageCode.PING),
            "real runner-python should emit a PING frame before termination"
        );
        t.true(
            monitoringFrames.some(([frameCode]) => frameCode === RunnerMessageCode.MONITORING),
            "real runner-python should emit a healthy MONITORING frame after PONG"
        );
        t.is(terminalFrame?.[0], RunnerMessageCode.SEQUENCE_STOPPED);
        t.is(
            terminalFrame?.[1]?.exitCode,
            translated.exitCode,
            "terminal SEQUENCE_STOPPED frame must carry the translated runner exit code"
        );
    } finally {
        stdioHandles.detach();
        hostMonitoring.destroy();
        await stopChild(handles.child);
        await server.close();
        cleanup();
    }
});
