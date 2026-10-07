#!/usr/bin/env node

import * as fs from "fs";
import * as os from "os";
import { dirname, resolve } from "path";
import { Readable, Writable } from "stream";

import { AppConfig, LogLevel } from "@scramjet/runtime-types";
import { CommunicationChannel as CC, RunnerExitCode, RunnerMessageCode, selectRuntimeKind } from "@scramjet/symbols";

import { RunnerConnectInfo, RuntimeProcessHandles, SequenceInfo } from "@scramjet/runtime-types";

import { selectExecutor } from "../executor/select";
import { forwardChildStdio } from "../executor/stream-forwarder";
import { requiresHardChildTeardown, translateChildClose, writeTerminalLifecycleFrame } from "../executor/exit-translation";
import { waitForChildClose, waitForChildCloseAndConnection } from "../executor/child-close";
import { resolveRunnerNodeEntry } from "../executor/runner-node-launcher";
import { resolveRunnerBunEntry } from "../executor/runner-bun-launcher";
import { observeChildLifecycleFrames } from "../executor/lifecycle-observer";
import { parseRunnerTransportConfig, RunnerTransportConfigResult } from "../transport/runner-transport-config";
import { RunnerVerser2Transport } from "../transport/verser2-runner-transport";
import { bddBootExitTimeout } from "./bdd-boot-timeout";
import { copyRunnerLogForwarding } from "../runner-log-forwarding";

const STDERR_TAIL_BYTES = 4096;
const CR = 0x0d;
const TEMP_STDERR_PREFIX = "[pr1137-stderr-boundary] ";
const TEMP_STDERR_MARKER = Buffer.from("TestException: This exception should appear on stderr", "ascii");
const TEMP_STDERR_LINE_BYTES = 4096;
const TEMP_STDERR_SIGNALS = new Set(["SIGTERM", "SIGKILL", "SIGINT", "SIGHUP", "SIGABRT", "SIGPIPE"]);

type TempProducerEvent = "forward-attached" | "child-close-observed" | "disconnect-start" | "disconnect-settled";
type TempProducerCapture = ((event: TempProducerEvent, values?: Record<string, unknown>) => void) & { observe(chunk: Buffer): void; attach(): void };
type TempStreamState = { readableLength?: number; writableLength?: number; readableEnded?: boolean; writableEnded?: boolean; writableFinished?: boolean; writableNeedDrain?: boolean; destroyed?: boolean };

function tempStreamState(stream: Readable | Writable | undefined): TempStreamState | undefined {
    if (!stream) return undefined;
    const state: TempStreamState = {};
    const candidate = stream as Readable & Writable;
    for (const key of ["readableLength", "writableLength", "readableEnded", "writableEnded", "writableFinished", "writableNeedDrain", "destroyed"] as const) {
        const value = candidate[key];
        if (typeof value === "boolean" || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)) (state as Record<string, unknown>)[key] = value;
    }
    return Object.keys(state).length ? state : undefined;
}

function createTempProducerCapture(source: Readable | undefined, target: Writable, childPid: number | undefined): TempProducerCapture {
    let seq = 1;
    let bytes = 0;
    let chunks = 0;
    let preAttachBytes = 0;
    let postAttachBytes = 0;
    let forwardingAttached = false;
    let markerBeforeAttach = false;
    let markerAfterAttach = false;
    let tail = Buffer.alloc(0);

    const capture: TempProducerCapture = (event, values = {}) => {
        try {
            const pid = process.pid;
            if (!Number.isSafeInteger(pid) || pid <= 0 || !/^[A-Za-z0-9._:-]{1,128}$/.test(instanceId!)) return;
            const disconnectRejected = values.disconnectRejected === true;
            const errorCode = values.errorCode === "ECONNRESET" || values.errorCode === "EPIPE" || values.errorCode === "ERR_STREAM_PREMATURE_CLOSE" || values.errorCode === "ERR_STREAM_DESTROYED" || values.errorCode === "ERR_HTTP2_STREAM_CANCEL" || values.errorCode === "ERR_HTTP2_INVALID_STREAM" || values.errorCode === "ABORT_ERR" ? values.errorCode : disconnectRejected ? "other-error" : "none";
            const streamSnapshots = event === "disconnect-start" || event === "disconnect-settled" ? {
                ...(tempStreamState(source) ? { source: tempStreamState(source) } : {}),
                ...(tempStreamState(target) ? { target: tempStreamState(target) } : {})
            } : {};
            const record: Record<string, unknown> = {
                capture: "pr1137-stderr-boundary", level: event === "disconnect-settled" && disconnectRejected ? "WARN" : "DEBUG",
                boundary: "producer", event, pid, seq: seq++, wallMs: Date.now(), monoMs: Number(process.hrtime.bigint()) / 1e6,
                instanceId, outcome: event === "forward-attached" ? "pending" : event === "child-close-observed" ? "fulfilled" : event === "disconnect-start" ? "pending" : disconnectRejected ? "rejected" : "fulfilled",
                reason: event === "forward-attached" ? "none" : event === "child-close-observed" ? "child-close" : "disconnect",
                errorCode, bytes, chunks, preAttachBytes, postAttachBytes, markerFound: markerBeforeAttach || markerAfterAttach,
                markerBeforeAttach, markerAfterAttach, forwardingAttached, ...(Number.isSafeInteger(childPid) && childPid! > 0 ? { childPid } : {}),
                ...(event === "child-close-observed" ? { childExitCode: values.childExitCode, signal: values.signal } : {}),
                ...(event === "disconnect-start" ? { hardTeardown: values.hardTeardown } : {}),
                ...(event === "disconnect-settled" ? { disconnectRejected } : {}), ...streamSnapshots
            };
            if (record.signal !== undefined && record.signal !== null) record.signal = TEMP_STDERR_SIGNALS.has(String(record.signal)) ? record.signal : "other-signal";
            const line = TEMP_STDERR_PREFIX + JSON.stringify(record) + "\n";
            if (Buffer.byteLength(line, "utf8") <= TEMP_STDERR_LINE_BYTES) process.stderr.write(line);
        } catch { /* best-effort diagnostics must not affect runner outcomes */ }
    };
    capture.observe = (chunk: Buffer) => {
        const length = Buffer.byteLength(chunk);
        const before = forwardingAttached;
        bytes += length;
        chunks += 1;
        if (before) postAttachBytes += length; else preAttachBytes += length;
        const combined = tail.length ? Buffer.concat([tail, chunk]) : chunk;
        const found = combined.indexOf(TEMP_STDERR_MARKER) !== -1;
        if (found) {
            if (before) markerAfterAttach = true; else markerBeforeAttach = true;
        }
        tail = Buffer.from(combined.subarray(Math.max(0, combined.length - (TEMP_STDERR_MARKER.length - 1))));
    };
    capture.attach = () => { forwardingAttached = true; capture("forward-attached"); };
    return capture;
}

function normalizeSequencePath(path: string | undefined, engines?: Record<string, string>): string {
    if (!path) return "";
    if (selectRuntimeKind(engines) === "python3") return path;
    return path.replace(/(?<!\.m?js|\.ts)$/, ".js");
}

// ---------------------------------------------------------------------------
// Adapter-facing env validation. Preserved verbatim from the legacy entry so
// adapters do not need to change. Same env names, same exit codes.
// ---------------------------------------------------------------------------

const rawSequencePath = process.env.SEQUENCE_PATH;
const instanceId = process.env.INSTANCE_ID;
const sequenceInfo = process.env.SEQUENCE_INFO;
const runnerConnectInfo = process.env.RUNNER_CONNECT_INFO;

let connectInfo: SequenceInfo;
let parsedRunnerConnectInfo: RunnerConnectInfo;
let runnerTransportConfig: RunnerTransportConfigResult;

try {
    if (!runnerConnectInfo) throw new Error("Connection JSON is required.");
    parsedRunnerConnectInfo = JSON.parse(runnerConnectInfo);
} catch {
    console.error("Error while parsing connection information.");
    process.exit(RunnerExitCode.INVALID_ENV_VARS);
}

try {
    if (!sequenceInfo) throw new Error("Connection JSON is required.");
    connectInfo = JSON.parse(sequenceInfo);
} catch {
    console.error("Error while parsing connection information.");
    process.exit(RunnerExitCode.INVALID_ENV_VARS);
}

const sequencePath = normalizeSequencePath(rawSequencePath, connectInfo.config?.engines);

if (!instanceId) {
    console.error("Incorrect run argument: instanceId");
    process.exit(RunnerExitCode.INVALID_ENV_VARS);
}

try {
    runnerTransportConfig = parseRunnerTransportConfig(instanceId);
} catch (error) {
    console.error(error instanceof Error ? error.message : "Incorrect run argument: runner transport config");
    process.exit(RunnerExitCode.INVALID_ENV_VARS);
}

if (!fs.existsSync(sequencePath)) {
    console.error("Incorrect run argument: sequence path (" + sequencePath + ") does not exists. ");
    process.exit(RunnerExitCode.INVALID_SEQUENCE_PATH);
}

// ---------------------------------------------------------------------------
// Boot config: a private absolute file passed to runner-node as argv[2].
// runner-node owns its own runtime; runner-owned env vars are NOT forwarded.
// ---------------------------------------------------------------------------

interface RunnerNodeBootConfigShape {
    sequencePath: string;
    sequenceArgs?: unknown[];
    instanceId: string;
    instancesServerPort: number;
    instancesServerHost: string;
    appConfig?: AppConfig;
    sequenceInfo: SequenceInfo;
    instanceName?: string;
    exitTimeout?: number;
    logLevel?: LogLevel;
    forwardRunnerLogs?: boolean;
    exposePath?: string;
    inputTopic?: string;
    outputTopic?: string;
    exposeHost?: string;
    requestsUnsupported?: string;
    verser2Runtime?: {
        hostUrl: string;
        runnerGuestId: string;
        runnerRouteDomain: string;
        hubBrokerId: string;
        hubTargetDomain?: string;
        spaceTargetDomain?: string;
        tls?: unknown;
        leaseAcquireTimeoutMs?: number;
        minWaitingStreams?: number;
    };
}

function writeBootConfig(resolvedInstancesServerHost: string, resolvedInstancesServerPort: number): string {
    const dir = fs.mkdtempSync(resolve(os.tmpdir(), "runner-node-boot-"));
    const file = resolve(dir, "boot-config.json");

    const payload: RunnerNodeBootConfigShape = {
        sequencePath: resolve(sequencePath),
        instanceId: instanceId!,
        instancesServerPort: resolvedInstancesServerPort,
        instancesServerHost: resolvedInstancesServerHost,
        sequenceInfo: connectInfo
    };

    if (Array.isArray(parsedRunnerConnectInfo.args)) {
        payload.sequenceArgs = parsedRunnerConnectInfo.args;
    }

    if (parsedRunnerConnectInfo.appConfig) payload.appConfig = parsedRunnerConnectInfo.appConfig;
    if (parsedRunnerConnectInfo.instanceName) payload.instanceName = parsedRunnerConnectInfo.instanceName;
    const bddExitTimeout = bddBootExitTimeout();
    if (bddExitTimeout !== undefined) payload.exitTimeout = bddExitTimeout;
    if (parsedRunnerConnectInfo.logLevel) payload.logLevel = parsedRunnerConnectInfo.logLevel;
    copyRunnerLogForwarding(payload, parsedRunnerConnectInfo);
    if (parsedRunnerConnectInfo.exposePath) payload.exposePath = parsedRunnerConnectInfo.exposePath;
    if (parsedRunnerConnectInfo.inputTopic) payload.inputTopic = parsedRunnerConnectInfo.inputTopic;
    if (parsedRunnerConnectInfo.outputTopic) payload.outputTopic = parsedRunnerConnectInfo.outputTopic;

    const exposeHostResolved = parsedRunnerConnectInfo.exposeHost ?? process.env.EXPOSE_HOST;

    if (exposeHostResolved) payload.exposeHost = exposeHostResolved;

    if (runnerTransportConfig.kind === "verser2") {
        payload.verser2Runtime = {
            hostUrl: runnerTransportConfig.hostUrl,
            runnerGuestId: runnerTransportConfig.guestId,
            runnerRouteDomain: runnerTransportConfig.routeDomain,
            hubBrokerId: runnerTransportConfig.hubBrokerId,
            ...(runnerTransportConfig.hubTargetDomain ? { hubTargetDomain: runnerTransportConfig.hubTargetDomain } : {}),
            ...(runnerTransportConfig.spaceTargetDomain ? { spaceTargetDomain: runnerTransportConfig.spaceTargetDomain } : {}),
            ...(runnerTransportConfig.tls ? { tls: runnerTransportConfig.tls } : {}),
            ...(runnerTransportConfig.leaseAcquireTimeoutMs !== undefined ? { leaseAcquireTimeoutMs: runnerTransportConfig.leaseAcquireTimeoutMs } : {}),
            ...(runnerTransportConfig.minWaitingStreams !== undefined ? { minWaitingStreams: runnerTransportConfig.minWaitingStreams } : {})
        };
    }

    fs.writeFileSync(file, JSON.stringify(payload), { encoding: "utf8", mode: 0o600 });

    return file;
}

function tryRemove(file: string): void {
    try {
        fs.rmSync(file, { force: true });
        fs.rmdirSync(dirname(file));
    } catch {
        // best-effort cleanup
    }
}

// ---------------------------------------------------------------------------
// Stream wiring helpers. fd4/fd5 are raw passthrough; no JSON / base64
// aggregation, no V1 protocol names.
// ---------------------------------------------------------------------------

function pipeRaw(src: Readable, dst: Writable): void {
    src.on("error", () => {
        /* swallow - host stream errors are non-fatal here */
    });
    src.pipe(dst, { end: false });
}

function appendTail(current: string, chunk: Buffer | string): string {
    return (current + chunk.toString()).slice(-STDERR_TAIL_BYTES);
}

function observeRpcExpose(stream: Readable, transport: RunnerVerser2Transport): void {
    let pending = "";

    stream.on("data", (chunk: Buffer | string) => {
        pending += typeof chunk === "string" ? chunk : chunk.toString("utf8");

        for (;;) {
            const lfIdx = pending.indexOf("\n");

            if (lfIdx === -1) break;

            let endIdx = lfIdx;

            if (endIdx > 0 && pending.charCodeAt(endIdx - 1) === CR) endIdx -= 1;

            const line = pending.slice(0, endIdx);

            pending = pending.slice(lfIdx + 1);

            try {
                const parsed = JSON.parse(line) as [number, { payload?: { exposeHost?: string; exposePort?: number } }];

                if (parsed[0] === RunnerMessageCode.PING && parsed[1]?.payload?.exposePort !== undefined) {
                    transport.setRpcTarget(parsed[1].payload.exposeHost || "localhost", parsed[1].payload.exposePort);
                }
            } catch {
                // ignore non-frame lines
            }
        }
    });
}

type ChildTermination = { code: number | null; signal: NodeJS.Signals | null; error?: Error };

function formatReadinessFailure(kind: string, termination: ChildTermination | undefined, stderrTail: string, error: unknown): Error {
    const details = termination
        ? `code=${termination.code ?? "null"} signal=${termination.signal ?? "null"}`
        : `code=unknown signal=unknown`;
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`Runtime readiness failed executor=${kind} ${details} stderr=${JSON.stringify(stderrTail)}: ${message}`);
}

async function waitForRuntimeChannels(
    transport: RunnerVerser2Transport,
    child: RuntimeProcessHandles["child"],
    kind: string,
    stderrTail: () => string
): Promise<void> {
    let termination: ChildTermination | undefined;
    let rejectTermination!: (error: Error) => void;
    const childEnded = new Promise<never>((_, reject) => { rejectTermination = reject; });

    const onError = (error: Error) => {
        if (!termination) {
            termination = { code: null, signal: null, error };
            rejectTermination(formatReadinessFailure(kind, termination, stderrTail(), error));
        }
    };
    const onClose = (code: number | null, signal: NodeJS.Signals | null) => {
        termination = { code, signal, error: termination?.error };
        rejectTermination(formatReadinessFailure(kind, termination, stderrTail(), termination.error ?? new Error("child closed before channel readiness")));
    };

    child.once("error", onError);
    child.once("close", onClose);

    try {
        await Promise.race([
            Promise.all([transport.waitForLocalChannel(CC.IN), transport.waitForLocalChannel(CC.OUT), transport.waitForLocalChannel(CC.LOG)]).then(() => undefined),
            childEnded
        ]);
    } catch (error) {
        throw formatReadinessFailure(kind, termination, stderrTail(), error);
    }
}

async function main(): Promise<void> {
    const hostClient = new RunnerVerser2Transport({
        config: runnerTransportConfig,
        instanceId: instanceId!
    });

    await hostClient.init({ connectGuest: false });
    const resolvedInstancesServerHost = hostClient.localChannelHost;
    const resolvedInstancesServerPort = hostClient.localChannelPort;

    const bootConfigPath = writeBootConfig(resolvedInstancesServerHost, resolvedInstancesServerPort);

    let handles: RuntimeProcessHandles;
    let executor: ReturnType<typeof selectExecutor>;

    try {
        const engines = connectInfo.config?.engines || (parsedRunnerConnectInfo.appConfig?.engines as Record<string, string> | undefined) || {};
        executor = selectExecutor({ engines });
        const childEnv: NodeJS.ProcessEnv = {};

        // Forward target domains for hubClient() / spaceClient() direct v2 routing.
        if (runnerTransportConfig.hubTargetDomain) {
            childEnv.HUB_TARGET_DOMAIN = runnerTransportConfig.hubTargetDomain;
        }
        if (runnerTransportConfig.spaceTargetDomain) {
            childEnv.SPACE_TARGET_DOMAIN = runnerTransportConfig.spaceTargetDomain;
        }

        let runtimeEntry = "";

        if (executor.kind === "bun") {
            runtimeEntry = resolveRunnerBunEntry(__dirname).entry;
        } else if (executor.kind === "node") {
            const entry = resolveRunnerNodeEntry(__dirname);

            runtimeEntry = entry.entry;

            if (entry.needsTypeScriptSourceLoader) {
                // tsx fallback for source-tree development. Inherit the parent's
                // PATH/HOME/NODE_PATH so tsx and resolved modules stay reachable;
                // anything runner-owned (SEQUENCE_PATH, RUNNER_CONNECT_INFO, ...) is
                // NOT forwarded - the boot config file replaces that channel.
                childEnv.NODE_OPTIONS = `--require ${require.resolve("tsx/cjs")}`;
                if (process.env.PATH) childEnv.PATH = process.env.PATH;
                if (process.env.HOME) childEnv.HOME = process.env.HOME;
                if (process.env.NODE_PATH) childEnv.NODE_PATH = process.env.NODE_PATH;
            }
        }

        handles = executor.spawn({
            runtimeEntry,
            bootConfigPath,
            env: childEnv
        });
    } catch (err) {
        tryRemove(bootConfigPath);
        await hostClient.disconnect(true).catch(() => undefined);
        console.error("Failed to spawn runtime runner:", err instanceof Error ? err.message : err);
        process.exit(RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION);
    }

    let childStderrTail = "";
    const tempStderrCapture = createTempProducerCapture(handles.child.stderr, hostClient.stderrStream, handles.child.pid);
    handles.child.stderr?.on("data", (chunk: Buffer) => {
        childStderrTail = appendTail(childStderrTail, chunk);
        tempStderrCapture.observe(chunk);
    });

    // Install terminal handling before any awaited runtime readiness work. A
    // Node/Bun child can exit immediately after spawn, before connectGuest()
    // resolves; registering this listener later would leave the outer runner
    // waiting forever for a close event it already missed.
    const lifecycle = observeChildLifecycleFrames(handles.monitoring);
    const childClose = waitForChildClose(handles.child);

    if (hostClient instanceof RunnerVerser2Transport) {
        observeRpcExpose(handles.monitoring, hostClient);
    }

    pipeRaw(handles.monitoring, hostClient.monitorStream);
    handles.child.once("error", (err: Error) => {
        console.error("runner-node child errored:", err instanceof Error ? err.message : err);
    });

    const connectionAttempt = (async () => {
        if (executor.kind === "python3") {
            await waitForRuntimeChannels(hostClient, handles.child, executor.kind, () => childStderrTail);
        }
        await hostClient.connectGuest();
    })();

    const finalization = waitForChildCloseAndConnection(childClose, connectionAttempt).then(({ close }) => {
        const { code, signal } = close;
        tempStderrCapture("child-close-observed", { childExitCode: code, signal });
        const translated = translateChildClose(code, signal);

        if (translated.exitCode !== RunnerExitCode.SUCCESS) {
            console.error(
                `STH runtime error phase=runner-runtime adapter=${process.env.RUNTIME_ADAPTER || "unknown"} runtime=${executor.kind} instanceId=${instanceId} exitCode=${translated.exitCode}`,
                {
                    phase: "runner-runtime",
                    adapter: process.env.RUNTIME_ADAPTER || "unknown",
                    runtime: executor.kind,
                    instanceId,
                    exitCode: translated.exitCode,
                    childExitCode: code,
                    signal,
                    stderrTail: childStderrTail
                }
            );
        }

        if (!lifecycle.observed()) {
            try {
                writeTerminalLifecycleFrame(hostClient.monitorStream, translated);
            } catch {
                // never fail child cleanup on a failed frame write
            }
        }

        tryRemove(bootConfigPath);

        const hardTeardown = requiresHardChildTeardown(translated);
        tempStderrCapture("disconnect-start", { hardTeardown });
        let disconnectRejected = false;
        let disconnectErrorCode: unknown;
        return hostClient
            .disconnect(hardTeardown)
            .catch((error: unknown) => {
                disconnectRejected = true;
                disconnectErrorCode = error && typeof error === "object" && "code" in error ? (error as { code?: unknown }).code : undefined;
            })
            .finally(() => {
                tempStderrCapture("disconnect-settled", { disconnectRejected, errorCode: disconnectErrorCode });
                process.exitCode = translated.exitCode;
                process.exit();
            });
    });

    try {
        await connectionAttempt;
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        try { handles.child.kill(); } catch { /* best effort */ }
        // The close coordinator owns cleanup and exit. Waiting for the child
        // close preserves its translated outcome and prevents duplicate
        // terminal frames/disconnects when startup fails concurrently.
        await finalization;
        return;
    }

    // host stdin -> child stdin (fd0). Use end:true so EOF on host stdin is
    // forwarded to the sequence; the parent process owns the pipe lifetime.
    if (handles.child.stdin) {
        hostClient.stdinStream.on("error", () => undefined);
        hostClient.stdinStream.pipe(handles.child.stdin);
    }

    // child stdout/stderr -> host stdout/stderr (raw, end:false)
    forwardChildStdio(handles.child, {
        hostStdout: hostClient.stdoutStream,
        hostStderr: hostClient.stderrStream
    });
    tempStderrCapture.attach();

    // host control -> child fd4 (raw)
    pipeRaw(hostClient.controlStream, handles.control);

}

main().catch((err) => {
    console.error("start-runner failed:", err instanceof Error ? (err.stack ?? err.message) : err);
    process.exitCode = RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION;
    process.exit();
});
