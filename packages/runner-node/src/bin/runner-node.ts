#!/usr/bin/env node
/* eslint-disable no-console */
import { EventEmitter } from "events";
import { AddressInfo } from "net";
import { Readable, Writable } from "stream";

import { ObjLogger } from "@scramjet/obj-logger";
import { DataStream } from "scramjet";
import type { APIExpose, AppConfig, EncodedMonitoringMessage } from "@scramjet/types";
import { RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";

import { parseBootConfigPathFromArgv, readBootConfig } from "../boot-config";
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

export async function bootstrap(overrides: BootstrapOverrides = {}): Promise<number> {
    const bootConfigPath = parseBootConfigPathFromArgv(process.argv);
    const bootConfig = readBootConfig(bootConfigPath);
    const streams = createFdStreams();
    const logger = new ObjLogger(`runner-node:${bootConfig.instanceId ?? "unknown"}`, {}, bootConfig.logLevel ?? "DEBUG");

    const loader = overrides.loadSequence ?? loadSequenceModule;
    const sequenceFns = loader(bootConfig.sequencePath);

    const emitter = new EventEmitter();
    let exitCode: RunnerExitCode = RunnerExitCode.SUCCESS;
    let lifecycleRef: RunnerLifecycle | undefined;

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

        hostClient = new HostClient(bootConfig.instancesServerPort!, bootConfig.instancesServerHost!);

        try {
            await hostClient.init(bootConfig.instanceId, RUNNER_NODE_CHANNELS);
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
            onKeepAliveIssued: () => lifecycleRef?.keepAliveIssued(),
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
            onKeepAliveIssued: () => lifecycleRef?.keepAliveIssued(),
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
    });

    lifecycleRef = lifecycle;

    wireControlStream(streams.controlIn, {
        onStop: (data) => lifecycle.handleStopRequest(data),
        onKill: () => lifecycle.handleKillRequest(),
        onEvent: (data) => emitter.emit(data.eventName, data.message),
        onStorageUpdate: (data) => context.localStorage.handleBroadcastUpdate(data),
    }, logger);

    try {
        await runSequence(sequenceFns, {
            context,
            inputDataStream,
            outputDataStream,
            hostClient: hostAdapter,
            args,
            logger,
        });

        writeMonitoring(streams.monitoringOut, [
            RunnerMessageCode.SEQUENCE_COMPLETED,
            { timeout: 0 },
        ]);
    } catch (err) {
        logger.error("Sequence failed", err);
        writeMonitoring(streams.monitoringOut, [
            RunnerMessageCode.SEQUENCE_STOPPED,
            { sequenceError: err as Error },
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
