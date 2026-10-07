import { ObjLogger } from "@scramjet/obj-logger";
import { IComponent, IObjectLogger } from "@scramjet/runtime-types";
import {
    ExitCode,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterRun,
    InstanceConfig,
    InstanceLimits,
    MonitoringMessageData,
    SequenceConfig,
    SequenceInfo,
    RunnerConnectInfo
} from "@scramjet/runtime-types";
import { STHConfiguration } from "@scramjet/api-types";
import { development, streamToString } from "@scramjet/utility";
import { ChildProcess, spawn } from "child_process";

import { constants, readFileSync } from "fs";
import { access, readFile, rm } from "fs/promises";
import path from "path";
import { getRunnerEnvVariables, getRunnerTransportEnv } from "@scramjet/adapters-common";

const CRASH_LOG_TAIL_BYTES = 4096;
const TEMP_STDERR_PREFIX = "[pr1137-stderr-boundary] ";
const TEMP_STDERR_COMMON = ["capture", "level", "boundary", "event", "pid", "seq", "wallMs", "monoMs", "instanceId", "outcome", "reason", "errorCode"];
const TEMP_STDERR_PRODUCER_FIELDS = ["bytes", "chunks", "preAttachBytes", "postAttachBytes", "markerFound", "markerBeforeAttach", "markerAfterAttach", "forwardingAttached"];
const TEMP_STDERR_STREAM_KEYS = new Set(["readableLength", "writableLength", "readableEnded", "writableEnded", "writableFinished", "writableNeedDrain", "destroyed"]);
const TEMP_STDERR_ERROR_CODES = new Set(["none", "ECONNRESET", "EPIPE", "ERR_STREAM_PREMATURE_CLOSE", "ERR_STREAM_DESTROYED", "ERR_HTTP2_STREAM_CANCEL", "ERR_HTTP2_INVALID_STREAM", "ABORT_ERR", "other-error"]);
const TEMP_STDERR_SIGNALS = new Set(["SIGTERM", "SIGKILL", "SIGINT", "SIGHUP", "SIGABRT", "SIGPIPE", "other-signal"]);

function isTempStreamState(value: unknown): boolean {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const state = value as Record<string, unknown>;
    return Object.keys(state).every((key) => TEMP_STDERR_STREAM_KEYS.has(key) && (typeof state[key] === "boolean" || (Number.isSafeInteger(state[key]) && Number(state[key]) >= 0)));
}

function relayTempProducerRecords(stderr: string, instanceId: string, expectedPid: number | undefined): void {
    const lines = tailLog(stderr).split("\n");
    if (!stderr.endsWith("\n")) lines.pop();
    for (const line of lines) {
        try {
            const cleanLine = line.endsWith("\r") ? line.slice(0, -1) : line;
            if (!cleanLine.startsWith(TEMP_STDERR_PREFIX) || Buffer.byteLength(cleanLine + "\n", "utf8") > 4096) continue;
            const json = cleanLine.slice(TEMP_STDERR_PREFIX.length);
            const value: unknown = JSON.parse(json);
            if (!value || typeof value !== "object" || Array.isArray(value)) continue;
            const record = value as Record<string, unknown>;
            const keys = Object.keys(record);
            const events = {
                "forward-attached": { outcome: "pending", reason: "none", errorCode: "none", allowed: [...TEMP_STDERR_COMMON, ...TEMP_STDERR_PRODUCER_FIELDS, "sequenceId", "childPid"] },
                "child-close-observed": { outcome: "fulfilled", reason: "child-close", errorCode: "none", allowed: [...TEMP_STDERR_COMMON, ...TEMP_STDERR_PRODUCER_FIELDS, "sequenceId", "childPid", "childExitCode", "signal"] },
                "disconnect-start": { outcome: "pending", reason: "disconnect", errorCode: "none", allowed: [...TEMP_STDERR_COMMON, ...TEMP_STDERR_PRODUCER_FIELDS, "sequenceId", "childPid", "hardTeardown", "source", "target"] },
                "disconnect-settled": { outcome: record.outcome, reason: "disconnect", errorCode: record.errorCode, allowed: [...TEMP_STDERR_COMMON, ...TEMP_STDERR_PRODUCER_FIELDS, "sequenceId", "childPid", "disconnectRejected", "source", "target"] }
            } as Record<string, { outcome: unknown; reason: unknown; errorCode: unknown; allowed: string[] }>;
            const event = typeof record.event === "string" ? events[record.event] : undefined;
            if (!event || keys.some((key) => !event.allowed.includes(key)) || [...TEMP_STDERR_COMMON, ...TEMP_STDERR_PRODUCER_FIELDS].some((key) => !Object.prototype.hasOwnProperty.call(record, key))) continue;
            if (record.capture !== "pr1137-stderr-boundary" || record.boundary !== "producer" || record.instanceId !== instanceId || record.pid !== expectedPid || !Number.isSafeInteger(record.pid) || Number(record.pid) <= 0) continue;
            if (!Number.isSafeInteger(record.seq) || Number(record.seq) <= 0 || !Number.isFinite(record.wallMs) || Number(record.wallMs) < 0 || !Number.isFinite(record.monoMs) || Number(record.monoMs) < 0) continue;
            if (record.outcome !== event.outcome || record.reason !== event.reason || record.errorCode !== event.errorCode || !TEMP_STDERR_ERROR_CODES.has(String(record.errorCode))) continue;
            if (record.event === "disconnect-settled" && ((record.outcome === "fulfilled" && record.errorCode !== "none") || (record.outcome === "rejected" && record.errorCode === "none"))) continue;
            if (record.level !== (record.outcome === "rejected" ? "WARN" : "DEBUG")) continue;
            if (!["bytes", "chunks", "preAttachBytes", "postAttachBytes"].every((key) => Number.isSafeInteger(record[key]) && Number(record[key]) >= 0)) continue;
            const partitionTotal = Number(record.preAttachBytes) + Number(record.postAttachBytes);
            if (!Number.isSafeInteger(partitionTotal) || Number(record.bytes) !== partitionTotal) continue;
            if (!["markerFound", "markerBeforeAttach", "markerAfterAttach", "forwardingAttached"].every((key) => typeof record[key] === "boolean") || record.markerFound !== (record.markerBeforeAttach || record.markerAfterAttach)) continue;
            if (record.event === "forward-attached" && record.forwardingAttached !== true) continue;
            if (record.sequenceId !== undefined && (typeof record.sequenceId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(record.sequenceId))) continue;
            if (record.childPid !== undefined && (!Number.isSafeInteger(record.childPid) || Number(record.childPid) <= 0)) continue;
            if (record.childExitCode !== undefined && record.childExitCode !== null && !Number.isSafeInteger(record.childExitCode)) continue;
            if (record.signal !== undefined && record.signal !== null && !TEMP_STDERR_SIGNALS.has(String(record.signal))) continue;
            if (record.hardTeardown !== undefined && typeof record.hardTeardown !== "boolean") continue;
            if (record.disconnectRejected !== undefined && record.disconnectRejected !== (record.outcome === "rejected")) continue;
            if ((record.event === "child-close-observed") !== (record.childExitCode !== undefined && Object.prototype.hasOwnProperty.call(record, "signal"))) continue;
            if ((record.event === "disconnect-start") !== (record.hardTeardown !== undefined)) continue;
            if ((record.event === "disconnect-settled") !== (record.disconnectRejected !== undefined)) continue;
            if ((record.source !== undefined && !isTempStreamState(record.source)) || (record.target !== undefined && !isTempStreamState(record.target))) continue;
            const outputRecord: Record<string, unknown> = {};
            for (const key of event.allowed) if (Object.prototype.hasOwnProperty.call(record, key)) outputRecord[key] = record[key];
            const output = TEMP_STDERR_PREFIX + JSON.stringify(outputRecord) + "\n";
            if (Buffer.byteLength(output, "utf8") <= 4096) process.stderr.write(output);
        } catch { /* clipped/malformed diagnostic records are omitted */ }
    }
}

function resolveRunnerBin(): string {
    const packageJsonPath = require.resolve("@scramjet/runner/package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const configured = typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.["scramjet-runner"];
    if (typeof configured !== "string") throw new Error("@scramjet/runner does not expose its scramjet-runner bin");
    return path.resolve(path.dirname(packageJsonPath), configured);
}

function tailLog(value: string): string {
    return value.slice(-CRASH_LOG_TAIL_BYTES);
}

async function readProcessRss(pid: number): Promise<{ memoryUsage: number; memoryMaxUsage: number } | undefined> {
    try {
        const status = await readFile(`/proc/${pid}/status`, "utf8");
        const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);

        if (!match) return undefined;

        const rssKb = parseInt(match[1], 10);

        if (!Number.isFinite(rssKb) || rssKb <= 0) return undefined;

        const rss = rssKb * 1024;

        return {
            memoryUsage: rss,
            // No peak tracking exists for process adapter samples yet.
            memoryMaxUsage: rss
        };
    } catch {
        return undefined;
    }
}

export function getRunnerInterpreter(entry: string): string {
    return path.extname(entry) === ".ts" ? "tsx" : process.execPath;
}

/**
 * Adapter for running Instance by Runner executed in separate process.
 */
class ProcessInstanceAdapter implements ILifeCycleAdapterMain, ILifeCycleAdapterRun, IComponent {
    logger: IObjectLogger;
    sthConfig: STHConfiguration;

    processPID: number = -1;
    exitCode = -1;
    id?: string | undefined;

    private runnerProcess?: ChildProcess;
    private crashLogStreams?: Promise<string[]>;
    private memoryMaxUsage?: number;
    private _limits?: InstanceLimits = {};

    get limits() {
        return this._limits || ({} as InstanceLimits);
    }
    private set limits(value: InstanceLimits) {
        this._limits = value;
        this.logger.warn("Limits are not yet supported in process runner");
    }

    constructor(config: STHConfiguration) {
        this.logger = new ObjLogger(this);
        this.sthConfig = config;
    }

    async init(): Promise<void> {
        // noop
    }

    async stats(msg: MonitoringMessageData): Promise<MonitoringMessageData> {
        const pid = this.runnerProcess?.pid ?? (this.processPID > 0 ? this.processPID : undefined);
        const result: MonitoringMessageData = {
            ...msg,
            processId: pid ?? this.processPID
        };

        if (pid) {
            const memory = await readProcessRss(pid);

            if (memory) {
                this.memoryMaxUsage = Math.max(this.memoryMaxUsage ?? 0, memory.memoryUsage);
                result.memoryUsage = memory.memoryUsage;
                result.memoryMaxUsage = this.memoryMaxUsage;
            }
        }

        return result;
    }

    getRunnerCmd(config: SequenceConfig) {
        const engines = Object.keys(config.engines);
        let debugFlags: string[] = [];

        if (engines.length > 1) {
            throw new Error("Incorrect config passed to SequenceConfig," + "'engines' field can't contain more than one element");
        }

        this.logger.trace("Detected sequence engines", engines);

        if (this.sthConfig.debug) debugFlags = ["--inspect-brk=9229"];

        const runnerBin = resolveRunnerBin();
        return [getRunnerInterpreter(runnerBin), ...debugFlags, runnerBin];
    }

    setRunner(system: Record<string, string>): void {
        this.logger.info("Setting system from runner", system);
        this.processPID = parseInt(system.processPID, 10);
    }

    async run(config: InstanceConfig, instancesServerPort: number, instanceId: string, sequenceInfo: SequenceInfo, payload: RunnerConnectInfo): Promise<ExitCode> {
        await this.dispatch(config, instancesServerPort, instanceId, sequenceInfo, payload);
        return this.waitUntilExit(config, instanceId, sequenceInfo);
    }

    async dispatch(config: InstanceConfig, instancesServerPort: number, instanceId: string, sequenceInfo: SequenceInfo, payload: RunnerConnectInfo): Promise<ExitCode> {
        if (config.type !== "process") {
            throw new Error("Process instance adapter run with invalid runner config");
        }

        this.logger.info("Instance preparation done");

        this.logger.trace("Starting Runner", config.id);

        const runnerCommand = this.getRunnerCmd(config);
        const sequencePath = path.join(config.sequenceDir, config.entrypointPath);

        const extraEnvs = development() ? process.env : {};

        const env = getRunnerEnvVariables(
            {
                sequencePath,
                instancesServerHost: "127.0.0.1",
                instancesServerPort,
                instanceId,
                pipesPath: "",
                sequenceInfo,
                payload
            },
            {
                EXPOSE_HOST: "127.0.0.1",
                ...this.sthConfig.runnerEnvs,
                ...getRunnerTransportEnv(this.sthConfig, instanceId),
                ...extraEnvs
            }
        );

        this.logger.debug("Spawning Runner process with command", runnerCommand);
        this.logger.trace("Runner process environment", env);

        const runnerProcess = spawn(runnerCommand[0], runnerCommand.slice(1), { env, detached: payload.reconnect });

        runnerProcess.unref();

        runnerProcess.on("exit", (code) => {
            this.exitCode = Number(code) || -1;
            this.logger.info("Runner exit code", code);
        });

        this.crashLogStreams = Promise.all([runnerProcess.stdout, runnerProcess.stderr].map(streamToString));

        this.runnerProcess = runnerProcess;

        this.logger.trace("Runner process is running", runnerProcess.pid);

        return 0;
    }

    getRunnerInfo(): RunnerConnectInfo["system"] {
        return {
            processPID: this.processPID.toString()
        };
    }

    async waitUntilExit(_config: InstanceConfig, _instanceId: string, _sequenceInfo: SequenceInfo): Promise<ExitCode> {
        if (this.runnerProcess) {
            const [statusCode, signal] = await new Promise<[number | null, NodeJS.Signals | null]>((res) => {
                if (this.exitCode > -1) {
                    res([this.exitCode, null]);
                }

                this.runnerProcess?.on("exit", (code, sig) => res([code, sig]));
            });

            this.logger.trace("Runner process exited", this.runnerProcess?.pid);

            if (statusCode === null) {
                this.logger.warn("Runner was killed by a signal, and didn't return a status code", signal);

                // Probably SIGIKLL
                return 137;
            }

            if (statusCode > 0) {
                this.logger.debug("Process returned non-zero status code", statusCode);
                await this.logCrashContext("instance-runtime", statusCode, signal, _instanceId, _sequenceInfo);
            }

            return statusCode;
        }

        // When no process reference Wait for file created by runner
        return new Promise<ExitCode>((res, reject) => {
            const interval = setInterval(async () => {
                if (this.processPID < 1) return;

                const filePath = `/tmp/runner-${this.processPID}`;

                try {
                    await access(filePath, constants.F_OK);

                    clearInterval(interval);

                    const data = await readFile(filePath, "utf8").catch((readErr) => {
                        this.logger.error(`Cant' read runner exit code from: ${readErr}`);
                        reject(readErr);
                        return;
                    });

                    this.logger.debug("exitCode saved to file by runner:", data, filePath);

                    rm(filePath).then(
                        () => {
                            this.logger.debug("File removed");
                        },
                        (err: any) => {
                            this.logger.error("Can't remove exitcode file", err);
                        }
                    );

                    res(parseInt(data!, 10));
                } catch {
                    /** OK. file not exists. check if process is*/

                    try {
                        process.kill(this.processPID, 0);
                    } catch (e) {
                        this.logger.error("Runner process not exists", e);

                        clearInterval(interval);

                        reject("pid not exists");
                    }
                }
            }, 1000);
        });
    }

    /**
     * Performs cleanup after Runner end.
     * Removes fifos used to communication with runner.
     */
    async cleanup(): Promise<void> {
        //noop
    }

    // @ts-expect-error
    monitorRate(_rps: number): this {
        /** ignore */
    }

    /**
     * Forcefully stops Runner process.
     */
    async remove() {
        if (this.runnerProcess) {
            this.runnerProcess.kill();
        } else if (this.processPID > 0 && Number.isFinite(this.processPID)) {
            spawn("kill", ["-9", this.processPID.toString()]);
        } else {
            this.logger.warn("remove called with invalid PID, skipping kill", this.processPID);
        }
    }

    async getCrashLog(): Promise<string[]> {
        if (!this.crashLogStreams) return [];

        return this.crashLogStreams;
    }

    private getRuntime(sequenceInfo: SequenceInfo): string {
        const engines = sequenceInfo.config?.engines || {};
        const runtime = Object.keys(engines)[0];

        return runtime || "unknown";
    }

    private async logCrashContext(
        phase: "runner-connect" | "instance-runtime",
        exitCode: number,
        signal: NodeJS.Signals | null,
        instanceId: string,
        sequenceInfo: SequenceInfo
    ): Promise<void> {
        const [stdout = "", stderr = ""] = await this.getCrashLog();

        relayTempProducerRecords(stderr, instanceId, this.runnerProcess?.pid);

        const stdoutTail = tailLog(stdout);
        const stderrTail = tailLog(stderr);

        this.logger.error(
            `STH runtime error phase=${phase} adapter=process runtime=${this.getRuntime(sequenceInfo)} sequenceId=${sequenceInfo.id} instanceId=${instanceId} exitCode=${exitCode} stderrTail=${stderrTail}`,
            {
                phase,
                adapter: "process",
                runtime: this.getRuntime(sequenceInfo),
                sequenceId: sequenceInfo.id,
                instanceId,
                exitCode,
                signal,
                stdoutTail,
                stderrTail
            }
        );
    }
}

export { ProcessInstanceAdapter };
