#!/usr/bin/env node

import * as fs from "fs";
import * as os from "os";
import { dirname, resolve } from "path";
import { Readable, Writable } from "stream";

import { SequenceInfo, RunnerConnectInfo, AppConfig, LogLevel } from "@scramjet/types";
import { RunnerExitCode } from "@scramjet/symbols";

import { RuntimeProcessHandles } from "@scramjet/types";

import { HostClient, OUTER_RUNNER_CHANNELS } from "../host-client";
import { selectExecutor } from "../executor/select";
import { forwardChildStdio } from "../executor/stream-forwarder";
import {
    translateChildClose,
    writeTerminalLifecycleFrame
} from "../executor/exit-translation";
import { resolveRunnerNodeEntry } from "../executor/runner-node-launcher";
import { resolveRunnerBunEntry } from "../executor/runner-bun-launcher";
import { observeChildLifecycleFrames } from "../executor/lifecycle-observer";

const STDERR_TAIL_BYTES = 4096;

// ---------------------------------------------------------------------------
// Adapter-facing env validation. Preserved verbatim from the legacy entry so
// adapters do not need to change. Same env names, same exit codes.
// ---------------------------------------------------------------------------

const sequencePath: string = `${process.env.SEQUENCE_PATH?.replace(/(?<!\.m?js|\.ts)$/, ".js")}`;
const instancesServerPort = process.env.INSTANCES_SERVER_PORT;
const instancesServerHost = process.env.INSTANCES_SERVER_HOST;
const instanceId = process.env.INSTANCE_ID;
const sequenceInfo = process.env.SEQUENCE_INFO;
const runnerConnectInfo = process.env.RUNNER_CONNECT_INFO;

let connectInfo: SequenceInfo;
let parsedRunnerConnectInfo: RunnerConnectInfo;

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

if (!instancesServerPort || instancesServerPort !== parseInt(instancesServerPort, 10).toString()) {
    console.error("Incorrect run argument: instancesServerPort");
    process.exit(RunnerExitCode.INVALID_ENV_VARS);
}

if (!instancesServerHost) {
    console.error("Incorrect run argument: instancesServerHost");
    process.exit(RunnerExitCode.INVALID_ENV_VARS);
}

if (!instanceId) {
    console.error("Incorrect run argument: instanceId");
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
    logLevel?: LogLevel;
    exposePath?: string;
    exposeHost?: string;
}

function writeBootConfig(): string {
    const dir = fs.mkdtempSync(resolve(os.tmpdir(), "runner-node-boot-"));
    const file = resolve(dir, "boot-config.json");

    const payload: RunnerNodeBootConfigShape = {
        sequencePath: resolve(sequencePath),
        instanceId: instanceId!,
        instancesServerPort: parseInt(instancesServerPort!, 10),
        instancesServerHost: instancesServerHost!,
        sequenceInfo: connectInfo
    };

    if (Array.isArray(parsedRunnerConnectInfo.args)) {
        payload.sequenceArgs = parsedRunnerConnectInfo.args;
    }

    if (parsedRunnerConnectInfo.appConfig) payload.appConfig = parsedRunnerConnectInfo.appConfig;
    if (parsedRunnerConnectInfo.instanceName) payload.instanceName = parsedRunnerConnectInfo.instanceName;
    if (parsedRunnerConnectInfo.logLevel) payload.logLevel = parsedRunnerConnectInfo.logLevel;
    if (parsedRunnerConnectInfo.exposePath) payload.exposePath = parsedRunnerConnectInfo.exposePath;

    const exposeHostResolved = parsedRunnerConnectInfo.exposeHost ?? process.env.EXPOSE_HOST;

    if (exposeHostResolved) payload.exposeHost = exposeHostResolved;

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
    src.on("error", () => { /* swallow - host stream errors are non-fatal here */ });
    src.pipe(dst, { end: false });
}

function appendTail(current: string, chunk: Buffer | string): string {
    return (current + chunk.toString()).slice(-STDERR_TAIL_BYTES);
}

async function main(): Promise<void> {
    const hostClient = new HostClient(+instancesServerPort!, instancesServerHost!);

    await hostClient.init(instanceId!, OUTER_RUNNER_CHANNELS);

    const bootConfigPath = writeBootConfig();

    let handles: RuntimeProcessHandles;

    try {
        const engines = connectInfo.config?.engines ||
            (parsedRunnerConnectInfo.appConfig?.engines as Record<string, string> | undefined) ||
            {};
        const executor = selectExecutor({ engines });
        const childEnv: NodeJS.ProcessEnv = {};
        let runtimeEntry = "";

        if (executor.kind === "bun") {
            runtimeEntry = resolveRunnerBunEntry(__dirname).entry;
        } else if (executor.kind === "node") {
            const entry = resolveRunnerNodeEntry(__dirname);

            runtimeEntry = entry.entry;

            if (entry.needsTsNode) {
                // ts-node fallback for source-tree development. Inherit the parent's
                // PATH/HOME/NODE_PATH so ts-node and resolved modules stay reachable;
                // anything runner-owned (SEQUENCE_PATH, RUNNER_CONNECT_INFO, ...) is
                // NOT forwarded - the boot config file replaces that channel.
                childEnv.NODE_OPTIONS = "--require ts-node/register/transpile-only";
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

    // host control -> child fd4 (raw)
    pipeRaw(hostClient.controlStream, handles.control);

    // child fd5 -> host monitoring (raw)
    pipeRaw(handles.monitoring, hostClient.monitorStream);

    // Track whether the child already emitted a terminal lifecycle frame
    // (SEQUENCE_COMPLETED / SEQUENCE_STOPPED). The observer is non-
    // destructive; bytes still flow to host monitoring unchanged.
    const lifecycle = observeChildLifecycleFrames(handles.monitoring);
    let childStderrTail = "";

    handles.child.stderr?.on("data", chunk => {
        childStderrTail = appendTail(childStderrTail, chunk);
    });

    handles.child.once("error", err => {
        console.error("runner-node child errored:", err instanceof Error ? err.message : err);
    });

    handles.child.once("close", (code, signal) => {
        const translated = translateChildClose(code, signal);

        if (translated.exitCode !== RunnerExitCode.SUCCESS) {
            console.error(`STH runtime error phase=runner-runtime adapter=${process.env.RUNTIME_ADAPTER || "unknown"} runtime=node instanceId=${instanceId} exitCode=${translated.exitCode}`, {
                phase: "runner-runtime",
                adapter: process.env.RUNTIME_ADAPTER || "unknown",
                runtime: "node",
                instanceId,
                exitCode: translated.exitCode,
                childExitCode: code,
                signal,
                stderrTail: childStderrTail
            });
        }

        if (!lifecycle.observed()) {
            try {
                writeTerminalLifecycleFrame(hostClient.monitorStream, translated);
            } catch {
                // never fail child cleanup on a failed frame write
            }
        }

        tryRemove(bootConfigPath);

        hostClient.disconnect(translated.exitCode !== RunnerExitCode.SUCCESS)
            .catch(() => undefined)
            .finally(() => {
                process.exitCode = translated.exitCode;
                process.exit();
            });
    });
}

main().catch(err => {
    console.error("start-runner failed:", err instanceof Error ? err.stack ?? err.message : err);
    process.exitCode = RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION;
    process.exit();
});
