#!/usr/bin/env node
import { EventEmitter } from "events";
import { AddressInfo } from "net";
import { Readable, Writable } from "stream";

import { ObjLogger } from "@scramjet/obj-logger";
import { DataStream } from "scramjet";
import { AppConfig } from "@scramjet/runtime-types";
import type { EncodedMonitoringMessage } from "@scramjet/runtime-types";
import type { APIExpose } from "@scramjet/api-types";
import { CommunicationChannel as CC, RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";

import { parseBootConfigPathFromArgv, readBootConfig, RunnerNodeBootConfig, shouldForwardRunnerLogs } from "../boot-config";
import { buildAppContext, buildSequenceContext } from "../context";
import { createFdStreams } from "../fd-streams";
import { buildPing } from "../handshake";
import { HostClient } from "../host-client";
import { mapToInputDataStream, readInputStreamHeaders } from "../input-stream";
import { defer } from "@scramjet/utility";
import { RunnerLifecycle } from "../lifecycle";
import type { LifecycleContext } from "../lifecycle";
import { MessageUtils } from "../message-utils";
import { runSequence } from "../run-sequence";
import type { RunSequenceHostClient } from "../run-sequence";
import type { BootstrapOverrides, ResolvedSequenceFunctions } from "../types";
import {
    getMemoryUsage,
    legacyExitFilePath,
    loadSequenceModule,
    makeOutputDiscard,
    resolveSequenceFunctions,
    RUNNER_NODE_CHANNELS,
    wireControlStream,
    writeLegacyExitFileSecure,
    writeMonitoring,
    writeProcessExitFile
} from "../utils";

export { buildAppContext, buildSequenceContext, legacyExitFilePath, loadSequenceModule, resolveSequenceFunctions, wireControlStream, writeLegacyExitFileSecure };

export type { BootstrapOverrides, ControlDispatch, SequenceLocalContext } from "../types";

async function startApiServer(api: APIExpose, exposePath: string, exposeHost: string | undefined, logger: ObjLogger): Promise<{ port: number; host: string }> {
    return new Promise((res) => {
        api.server.listen(0, exposeHost || "localhost", () => {
            const address = api.server.address() as AddressInfo;

            logger.debug("API server started", { exposePath, port: address.port, host: address.address });
            res({ port: address.port, host: address.address });
        });
    });
}

function serializeError(error: unknown, depth = 0): unknown {
    if (!(error instanceof Error)) return error;
    if (depth >= 3) return { name: error.name, message: error.message.slice(0, 512) };

    const data = (error as Error & { data?: unknown }).data;

    return {
        name: error.name,
        message: error.message.slice(0, 512),
        stack: error.stack?.slice(0, 4096),
        data: serializeError(data, depth + 1)
    };
}

function formatErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    try {
        const encoded = JSON.stringify(error);
        return (encoded === undefined ? "unknown error" : encoded).slice(0, 512);
    } catch {
        return "unserializable error";
    }
}

/**
 * Resolve the completion grace period without discarding a sequence change to
 * context.exitTimeout. The hub target default is retained only for contexts
 * that do not expose an exitTimeout value (for example, older local contexts).
 */
export function resolveCompletionExitTimeout(context: { exitTimeout?: number }, bootConfig: { verser2Runtime?: { hubTargetDomain?: string } }): number {
    return context.exitTimeout ?? (bootConfig.verser2Runtime?.hubTargetDomain ? 10_000 : 5_000);
}

function logRuntimeError(logger: ObjLogger, phase: "sequence-load" | "instance-runtime", bootConfig: RunnerNodeBootConfig, error: unknown): void {
    const message = `STH runtime error phase=${phase} runtime=node sequenceId=${bootConfig.sequenceInfo?.id} instanceId=${bootConfig.instanceId} error=${formatErrorMessage(error)}`;
    const details = {
        phase,
        runtime: "node",
        sequenceId: bootConfig.sequenceInfo?.id,
        instanceId: bootConfig.instanceId,
        sequencePath: bootConfig.sequencePath,
        error: serializeError(error)
    };

    logger.error(message, details);
    console.error(message, details);
}

export async function bootstrap(overrides: BootstrapOverrides = {}): Promise<number> {
    const bootConfigPath = parseBootConfigPathFromArgv(process.argv);
    const bootConfig = readBootConfig(bootConfigPath);
    const streams = createFdStreams();
    const logger = new ObjLogger(`runner-node:${bootConfig.instanceId ?? "unknown"}`, {}, bootConfig.logLevel ?? "DEBUG");

    const loader = overrides.loadSequence ?? loadSequenceModule;
    let sequenceFns: ResolvedSequenceFunctions;

    try {
        sequenceFns = loader(bootConfig.sequencePath);
    } catch (err) {
        logRuntimeError(logger, "sequence-load", bootConfig, err);
        writeMonitoring(streams.monitoringOut, [
            RunnerMessageCode.READY,
            {
                state: "errored",
                diagnostic: { code: "INITIALIZE_REJECTED", phase: "initialize", message: formatErrorMessage(err) }
            }
        ]);
        throw err;
    }

    const emitter = new EventEmitter();
    let exitCode: RunnerExitCode = RunnerExitCode.SUCCESS;
    const lifecycleRef: { current?: RunnerLifecycle } = {};
    let hostClient: HostClient | undefined;
    let hostAdapter: RunSequenceHostClient;
    let inputDataStream: DataStream;
    let api: APIExpose | undefined;
    let context: LifecycleContext & {
        localStorage: { handleBroadcastUpdate(data: { key: string; value: string | null }): void };
        monitor: () => Promise<{ healthy: boolean; details?: Record<string, unknown> }>;
    };
    const outputDataStream = new DataStream();

    const hasHost = typeof bootConfig.instancesServerPort === "number" && typeof bootConfig.instancesServerHost === "string";

    const appConfig: AppConfig = bootConfig.appConfig ?? {};
    const args = bootConfig.sequenceArgs ?? [];

    if (hasHost) {
        if (!bootConfig.sequenceInfo) {
            throw new Error("runner-node: boot config field 'sequenceInfo' is required when host channels are configured");
        }

        const sequenceInfo = bootConfig.sequenceInfo;

        hostClient = new HostClient(bootConfig.instancesServerPort!, bootConfig.instancesServerHost!, bootConfig.requestsUnsupported, bootConfig.verser2Runtime);
        const channels =
            bootConfig.requestsUnsupported || bootConfig.verser2Runtime
                ? new Set(Array.from(RUNNER_NODE_CHANNELS).filter((channel) => channel !== CC.REQUESTS))
                : RUNNER_NODE_CHANNELS;

        try {
            await hostClient.init(bootConfig.instanceId, channels);
        } catch (err) {
            logger.error("Failed to connect runner-node host channels", err);
            throw err;
        }

        const built = buildAppContext({
            bootConfig,
            monitorStream: streams.monitoringOut,
            emitter,
            logger,
            hostClient,
            onKeepAliveIssued: () => lifecycleRef.current?.keepAliveIssued()
        });

        api = built.api;
        context = built.context as unknown as typeof context;
        if (shouldForwardRunnerLogs(bootConfig)) {
            logger.pipe(hostClient.logStream, { stringified: true });
        }

        if (sequenceFns.initialize) {
            try {
                await sequenceFns.initialize.call(context, context);
            } catch (error) {
                writeMonitoring(streams.monitoringOut, [
                    RunnerMessageCode.READY,
                    {
                        state: "errored",
                        diagnostic: { code: "INITIALIZE_REJECTED", phase: "initialize", message: formatErrorMessage(error) }
                    }
                ]);
                throw error;
            }
        }

        const exposed = bootConfig.exposePath ? await startApiServer(built.api, bootConfig.exposePath, bootConfig.exposeHost, logger) : undefined;

        outputDataStream.JSONStringify().pipe(hostClient.outputStream as unknown as Writable);

        hostAdapter = {
            outputStream: hostClient.outputStream as unknown as RunSequenceHostClient["outputStream"],
            monitorStream: streams.monitoringOut
        };

        inputDataStream = new DataStream();
        readInputStreamHeaders(hostClient.inputStream as unknown as Readable)
            .then((headers) => {
                const contentType = headers["content-type"];

                if (!contentType) {
                    logger.warn("Host input has no content-type header; treating as empty input");
                    inputDataStream.end();
                    return;
                }

                try {
                    mapToInputDataStream(hostClient!.inputStream as unknown as Readable, contentType)
                        .catch((error: Error) => {
                            logger.error("mapToInputDataStream error", error);
                        })
                        .pipe(inputDataStream);
                } catch (e) {
                    logger.error("mapToInputDataStream threw synchronously", e);
                    inputDataStream.end();
                }
            })
            .catch((err) => {
                logger.warn("readInputStreamHeaders failed; closing input", err);
                inputDataStream.end();
            });

        await new Promise<void>((resolveWrite) => {
            MessageUtils.writeMessageOnStream(
                buildPing({
                    instanceId: bootConfig.instanceId,
                    sequenceInfo,
                    appConfig,
                    args,
                    instanceName: bootConfig.instanceName,
                    inputTopic: bootConfig.inputTopic,
                    outputTopic: bootConfig.outputTopic,
                    exposePath: undefined,
                    exposeHost: exposed?.host,
                    exposePort: exposed?.port
                }) as EncodedMonitoringMessage,
                streams.monitoringOut
            );
            resolveWrite();
        });

        writeMonitoring(streams.monitoringOut, [RunnerMessageCode.MONITORING, { healthy: true, ...getMemoryUsage() }]);

        writeMonitoring(streams.monitoringOut, [
            RunnerMessageCode.READY,
            {
                state: "ready",
                ...(bootConfig.exposePath ? { exposePath: bootConfig.exposePath, exposeHost: exposed?.host, exposePort: exposed?.port } : {})
            }
        ]);
    } else {
        const built = buildSequenceContext({
            bootConfig,
            streams,
            emitter,
            logger,
            onKeepAliveIssued: () => lifecycleRef.current?.keepAliveIssued()
        });

        context = built.context as unknown as typeof context;
        hostAdapter = {
            outputStream: makeOutputDiscard(),
            monitorStream: streams.monitoringOut
        };
        inputDataStream = new DataStream();
        inputDataStream.end();

        if (sequenceFns.initialize) {
            try {
                await sequenceFns.initialize.call(context, context);
            } catch (error) {
                writeMonitoring(streams.monitoringOut, [
                    RunnerMessageCode.READY,
                    {
                        state: "errored",
                        diagnostic: { code: "INITIALIZE_REJECTED", phase: "initialize", message: formatErrorMessage(error) }
                    }
                ]);
                throw error;
            }
        }

        writeMonitoring(streams.monitoringOut, [RunnerMessageCode.READY, { state: "ready" }]);
    }

    const lifecycle = new RunnerLifecycle({
        context,
        monitorStream: streams.monitoringOut,
        logger,
        onExit: (code) => {
            exitCode = code;
        },
        onTerminalStop: () => {
            terminalStop = true;
            resolveTerminalStop();
        }
    });

    lifecycleRef.current = lifecycle;

    // runner-node owns the active child runtime, so it must evaluate author
    // monitoring handlers itself. Runtime telemetry is appended after the
    // author payload and is never part of the author-controlled merge.
    const reportHealth = async (): Promise<void> => {
        try {
            const health = await context.monitor();
            writeMonitoring(streams.monitoringOut, [RunnerMessageCode.MONITORING, { ...health, ...getMemoryUsage() }]);
        } catch (error) {
            const message = formatErrorMessage(error).slice(0, 256);
            writeMonitoring(streams.monitoringOut, [
                RunnerMessageCode.MONITORING,
                { healthy: false, error: { code: (error as { code?: string })?.code || "ERR_HEALTH_EVALUATION", message }, ...getMemoryUsage() }
            ]);
        }
    };
    const monitoringInterval = setInterval(() => {
        reportHealth().catch(() => undefined);
    }, 1_000);
    monitoringInterval.unref();
    lifecycle.setMonitoringInterval(monitoringInterval);

    let killed = false;
    let resolveKilled!: () => void;
    const killedPromise = new Promise<void>((resolve) => {
        resolveKilled = resolve;
    });

    let terminalStop = false;
    let resolveTerminalStop!: () => void;
    const terminalStopPromise = new Promise<void>((resolve) => {
        resolveTerminalStop = resolve;
    });

    wireControlStream(
        streams.controlIn,
        {
            onStop: (data) => lifecycle.handleStopRequest(data),
            onKill: async () => {
                await lifecycle.handleKillRequest();
                killed = true;
                resolveKilled();
            },
            onEvent: (data) => emitter.emit(data.eventName, data.message),
            onStorage: (data) => {
                for (const [key, value] of Object.entries(data.values)) {
                    context.localStorage.handleBroadcastUpdate({ key, value });
                }
            },
            onStorageUpdate: (data) => context.localStorage.handleBroadcastUpdate(data)
        },
        logger
    );

    try {
        const sequenceRun = runSequence(sequenceFns, {
            context,
            inputDataStream,
            outputDataStream,
            hostClient: hostAdapter,
            args,
            logger
        });

        await Promise.race([sequenceRun, killedPromise, terminalStopPromise]);

        if (killed) {
            logger.warn("Sequence execution interrupted by KILL");
            sequenceRun.catch((error) => logger.debug("Sequence rejected after KILL", error));
        } else if (terminalStop) {
            logger.info("Sequence execution interrupted by terminal STOP");
            sequenceRun.catch((error) => logger.debug("Sequence rejected after terminal STOP", error));
        } else {
            await sequenceRun;

            // Legacy parity: wait for exitTimeout after sequence completes
            // so post-return control messages (events, storage updates) are
            // still processed before writing SEQUENCE_COMPLETED.
            const exitTimeout = resolveCompletionExitTimeout(context, bootConfig);
            await Promise.race([defer(exitTimeout), killedPromise, terminalStopPromise]);

            writeMonitoring(streams.monitoringOut, [RunnerMessageCode.SEQUENCE_COMPLETED, { timeout: 0 }]);
        }
    } catch (err) {
        logRuntimeError(logger, "instance-runtime", bootConfig, err);
        logger.error("Sequence failed", err);
        writeMonitoring(streams.monitoringOut, [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError: serializeError(err) }]);
        exitCode = RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION;
    } finally {
        lifecycle.cleanup();

        if (api?.server.listening) {
            await new Promise<void>((resolveClose) => {
                api!.server.close(() => resolveClose());
            }).catch(() => undefined);
        }

        if (hostClient) {
            logger.unpipe(hostClient.logStream, { stringified: true });
            await hostClient.disconnect(exitCode !== RunnerExitCode.SUCCESS).catch(() => undefined);
        }

        logger.end();

        await new Promise<void>((resolveEnd) => {
            streams.monitoringOut.end(() => resolveEnd());
        });

        if (typeof (streams.controlIn as { destroy?: () => void }).destroy === "function") {
            (streams.controlIn as Readable).destroy();
        }
    }

    writeProcessExitFile(exitCode);

    return exitCode;
}

if (require.main === module) {
    bootstrap()
        .then((code) => {
            process.exitCode = code;
            process.exit(code);
        })
        .catch((err) => {
            console.error("runner-node bootstrap failed:", err instanceof Error ? (err.stack ?? err.message) : err);
            writeProcessExitFile(RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION);
            process.exit(RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION);
        });
}
