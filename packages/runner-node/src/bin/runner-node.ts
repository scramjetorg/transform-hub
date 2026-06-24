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

import { parseBootConfigPathFromArgv, readBootConfig, RunnerNodeBootConfig } from "../boot-config";
import { buildAppContext, buildSequenceContext } from "../context";
import { createFdStreams } from "../fd-streams";
import { buildPing } from "../handshake";
import { HostClient } from "../host-client";
import { mapToInputDataStream, readInputStreamHeaders } from "../input-stream";
import { RunnerLifecycle } from "../lifecycle";
import type { LifecycleContext } from "../lifecycle";
import { MessageUtils } from "../message-utils";
import { runSequence } from "../run-sequence";
import type { RunSequenceHostClient } from "../run-sequence";
import type { BootstrapOverrides } from "../types";
import {
    legacyExitFilePath,
    loadSequenceModule,
    makeOutputDiscard,
    resolveSequenceFunctions,
    RUNNER_NODE_CHANNELS,
    wireControlStream,
    writeLegacyExitFileSecure,
    writeMonitoring,
    writeProcessExitFile,
} from "../utils";

export {
    buildAppContext,
    buildSequenceContext,
    legacyExitFilePath,
    loadSequenceModule,
    resolveSequenceFunctions,
    wireControlStream,
    writeLegacyExitFileSecure,
};

export type { BootstrapOverrides, ControlDispatch, SequenceLocalContext } from "../types";

async function startApiServer(
    api: APIExpose,
    exposePath: string,
    exposeHost: string | undefined,
    logger: ObjLogger
): Promise<{ port: number; host: string }> {
    return new Promise((res) => {
        api.server.listen(0, exposeHost || "localhost", () => {
            const address = api.server.address() as AddressInfo;

            logger.debug("API server started", { exposePath, port: address.port, host: address.address });
            res({ port: address.port, host: address.address });
        });
    });
}

function serializeError(error: unknown): unknown {
    if (!(error instanceof Error)) return error;

    const data = (error as Error & { data?: unknown }).data;

    return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        data: serializeError(data)
    };
}

function formatErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return JSON.stringify(error);
}

function logRuntimeError(
    logger: ObjLogger,
    phase: "sequence-load" | "instance-runtime",
    bootConfig: RunnerNodeBootConfig,
    error: unknown
): void {
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
    let sequenceFns: ReturnType<typeof loadSequenceModule>;

    try {
        sequenceFns = loader(bootConfig.sequencePath);
    } catch (err) {
        logRuntimeError(logger, "sequence-load", bootConfig, err);
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
    };
    const outputDataStream = new DataStream();

    const hasHost =
        typeof bootConfig.instancesServerPort === "number" &&
        typeof bootConfig.instancesServerHost === "string";

    const appConfig: AppConfig = bootConfig.appConfig ?? {};
    const args = bootConfig.sequenceArgs ?? [];

    if (hasHost) {
        if (!bootConfig.sequenceInfo) {
            throw new Error("runner-node: boot config field 'sequenceInfo' is required when host channels are configured");
        }

        const sequenceInfo = bootConfig.sequenceInfo;

        hostClient = new HostClient(
            bootConfig.instancesServerPort!,
            bootConfig.instancesServerHost!,
            bootConfig.requestsUnsupported,
            bootConfig.verser2Runtime
        );
        const channels = bootConfig.requestsUnsupported || bootConfig.verser2Runtime
            ? new Set(Array.from(RUNNER_NODE_CHANNELS).filter(channel => channel !== CC.REQUESTS))
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
            onKeepAliveIssued: () => lifecycleRef.current?.keepAliveIssued(),
        });

        api = built.api;
        context = built.context as unknown as typeof context;

        const exposed = bootConfig.exposePath
            ? await startApiServer(built.api, bootConfig.exposePath, bootConfig.exposeHost, logger)
            : undefined;

        outputDataStream
            .JSONStringify()
            .pipe(hostClient.outputStream as unknown as Writable);

        hostAdapter = {
            outputStream: hostClient.outputStream as unknown as RunSequenceHostClient["outputStream"],
            monitorStream: streams.monitoringOut,
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
                    exposePath: bootConfig.exposePath,
                    exposeHost: exposed?.host,
                    exposePort: exposed?.port,
                }) as EncodedMonitoringMessage,
                streams.monitoringOut
            );
            resolveWrite();
        });

        writeMonitoring(streams.monitoringOut, [RunnerMessageCode.MONITORING, { healthy: true }]);
    } else {
        const built = buildSequenceContext({
            bootConfig,
            streams,
            emitter,
            logger,
            onKeepAliveIssued: () => lifecycleRef.current?.keepAliveIssued(),
        });

        context = built.context as unknown as typeof context;
        hostAdapter = {
            outputStream: makeOutputDiscard(),
            monitorStream: streams.monitoringOut,
        };
        inputDataStream = new DataStream();
        inputDataStream.end();
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
        },
    });

    lifecycleRef.current = lifecycle;

    let killed = false;
    let resolveKilled!: () => void;
    const killedPromise = new Promise<void>(resolve => {
        resolveKilled = resolve;
    });

    let terminalStop = false;
    let resolveTerminalStop!: () => void;
    const terminalStopPromise = new Promise<void>(resolve => {
        resolveTerminalStop = resolve;
    });

    wireControlStream(streams.controlIn, {
        onStop: (data) => lifecycle.handleStopRequest(data),
        onKill: async () => {
            await lifecycle.handleKillRequest();
            killed = true;
            resolveKilled();
        },
        onEvent: (data) => emitter.emit(data.eventName, data.message),
        onStorageUpdate: (data) => context.localStorage.handleBroadcastUpdate(data),
    }, logger);

    try {
        const sequenceRun = runSequence(sequenceFns, {
            context,
            inputDataStream,
            outputDataStream,
            hostClient: hostAdapter,
            args,
            logger,
        });

        await Promise.race([sequenceRun, killedPromise, terminalStopPromise]);

        if (killed) {
            logger.warn("Sequence execution interrupted by KILL");
            sequenceRun.catch(error => logger.debug("Sequence rejected after KILL", error));
        } else if (terminalStop) {
            logger.info("Sequence execution interrupted by terminal STOP");
            sequenceRun.catch(error => logger.debug("Sequence rejected after terminal STOP", error));
        } else {
            await sequenceRun;

            writeMonitoring(streams.monitoringOut, [
                RunnerMessageCode.SEQUENCE_COMPLETED,
                { timeout: 0 },
            ]);
        }
    } catch (err) {
        logRuntimeError(logger, "instance-runtime", bootConfig, err);
        logger.error("Sequence failed", err);
        writeMonitoring(streams.monitoringOut, [
            RunnerMessageCode.SEQUENCE_STOPPED,
            { sequenceError: serializeError(err) },
        ]);
        exitCode = RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION;
    } finally {
        lifecycle.cleanup();

        if (api?.server.listening) {
            await new Promise<void>((resolveClose) => {
                api!.server.close(() => resolveClose());
            }).catch(() => undefined);
        }

        if (hostClient) {
            await hostClient.disconnect(exitCode !== RunnerExitCode.SUCCESS).catch(() => undefined);
        }

        await new Promise<void>(resolveEnd => {
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
        .then(code => {
            process.exitCode = code;
            process.exit(code);
        })
        .catch(err => {
            console.error(
                "runner-node bootstrap failed:",
                err instanceof Error ? err.stack ?? err.message : err
            );
            writeProcessExitFile(RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION);
            process.exit(RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION);
        });
}
