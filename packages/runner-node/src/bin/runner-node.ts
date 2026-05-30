#!/usr/bin/env node
/* eslint-disable no-console */
import { EventEmitter } from "events";
import { AddressInfo } from "net";
import { PassThrough, Readable, Writable } from "stream";

import { ObjLogger } from "@scramjet/obj-logger";
import { DataStream } from "scramjet";
import {
    APIExpose,
    AppConfig,
    AppError,
    EncodedControlMessage,
    EncodedMonitoringMessage,
    EventMessageData,
    KeepAliveMessageData,
    LogLevel,
    StopSequenceMessageData,
    StorageUpdateMessageData,
} from "@scramjet/types";
import { RunnerMessageCode, RunnerExitCode, CommunicationChannel as CC } from "@scramjet/symbols";
import { createServer } from "@scramjet/api-server";
import { HostClient as ApiHostClient } from "@scramjet/api-client";
import { ClientUtilsCustomAgent } from "@scramjet/client-utils";

import { parseBootConfigPathFromArgv, readBootConfig, RunnerNodeBootConfig } from "../boot-config";
import { createFdStreams, RunnerNodeFdStreams } from "../fd-streams";
import { runSequence, RunSequenceHostClient } from "../run-sequence";
import { RunnerLifecycle, LifecycleContext } from "../lifecycle";
import { MessageUtils } from "../message-utils";
import { LocalStorageAgent, LocalStorageAgentHost } from "../local-storage-agent";
import { HostClient } from "../host-client";
import { mapToInputDataStream, readInputStreamHeaders } from "../input-stream";
import { RunnerAppContext, RunnerProxy } from "../runner-app-context";

export interface SequenceLocalContext {
    bootConfig: RunnerNodeBootConfig;
    streams: RunnerNodeFdStreams;
    instanceId: string | undefined;
    logger: ObjLogger;
    emitter: EventEmitter;
    localStorage: LocalStorageAgent;
    monitorStream: Writable;
    keepAlive(milliseconds?: number): SequenceLocalContext;
    end(): SequenceLocalContext;
    destroy(error?: AppError | Error): SequenceLocalContext;
    on(eventName: string, handler: (msg?: unknown) => void): SequenceLocalContext;
    emit(eventName: string, message?: unknown): SequenceLocalContext;
    addStopHandler(handler: (timeout: number, canCallKeepalive: boolean) => Promise<void> | void): SequenceLocalContext;
    addKillHandler(handler: () => void): SequenceLocalContext;
}

type SequenceFunction = (this: unknown, instanceOutput: unknown, ...args: unknown[]) => unknown;
type SequenceModule =
    | SequenceFunction
    | SequenceFunction[]
    | { default?: SequenceFunction | SequenceFunction[] };

export function resolveSequenceFunctions(mod: SequenceModule): SequenceFunction[] {
    let candidate: unknown = mod;

    if (candidate && typeof candidate === "object" && "default" in (candidate as Record<string, unknown>)) {
        const next = (candidate as { default?: unknown }).default;

        if (next !== undefined) candidate = next;
    }

    if (Array.isArray(candidate)) {
        return candidate.filter((fn): fn is SequenceFunction => typeof fn === "function");
    }

    if (typeof candidate === "function") {
        return [candidate as SequenceFunction];
    }

    return [];
}

export function loadSequenceModule(sequencePath: string): SequenceFunction[] {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const loaded: SequenceModule = require(sequencePath);

    return resolveSequenceFunctions(loaded);
}

function writeMonitoring(monitor: Writable, msg: EncodedMonitoringMessage): void {
    MessageUtils.writeMessageOnStream(msg, monitor);
}

export interface ControlDispatch {
    onStop(data: StopSequenceMessageData): Promise<void>;
    onKill(): Promise<void>;
    onEvent(data: EventMessageData): void;
    onStorageUpdate(data: StorageUpdateMessageData): void;
}

export function wireControlStream(
    controlIn: Readable,
    dispatch: ControlDispatch,
    logger?: ObjLogger
): void {
    let buffer = "";

    controlIn.setEncoding("utf8");
    controlIn.on("data", chunk => {
        buffer += chunk;

        let nlIndex = buffer.indexOf("\n");

        while (nlIndex !== -1) {
            const line = buffer.slice(0, nlIndex).replace(/\r$/, "");

            buffer = buffer.slice(nlIndex + 1);
            nlIndex = buffer.indexOf("\n");

            if (line.length === 0) continue;

            let parsed: EncodedControlMessage;

            try {
                parsed = JSON.parse(line) as EncodedControlMessage;
            } catch (err) {
                logger?.warn("control: invalid JSON frame", err);
                continue;
            }

            const [code, data] = parsed;

            switch (code) {
                case RunnerMessageCode.STOP:
                    void dispatch.onStop(data as StopSequenceMessageData);
                    break;
                case RunnerMessageCode.KILL:
                    void dispatch.onKill();
                    break;
                case RunnerMessageCode.EVENT:
                    dispatch.onEvent(data as EventMessageData);
                    break;
                case RunnerMessageCode.STORAGE_UPDATE:
                    dispatch.onStorageUpdate(data as StorageUpdateMessageData);
                    break;
                default:
                    break;
            }
        }
    });
    controlIn.on("error", err => logger?.warn("control: stream error", err));
}

interface BuildContextDeps {
    bootConfig: RunnerNodeBootConfig;
    streams: RunnerNodeFdStreams;
    emitter: EventEmitter;
    logger: ObjLogger;
    onKeepAliveIssued: () => void;
}

export function buildSequenceContext(deps: BuildContextDeps): {
    context: SequenceLocalContext & LifecycleContext;
    localStorage: LocalStorageAgent;
} {
    const { bootConfig, streams, emitter, logger, onKeepAliveIssued } = deps;
    const monitorStream = streams.monitoringOut;

    const localCache: Record<string, string | null> = {};
    const storageHost: LocalStorageAgentHost = {
        writeMonitoringMessage: (msg) => writeMonitoring(monitorStream, msg),
        localCache,
    };
    const localStorage = new LocalStorageAgent(storageHost);

    const stopHandlers: Array<(timeout: number, canCallKeepalive: boolean) => Promise<void> | void> = [];
    const killHandlers: Array<() => void> = [];

    const ctx: SequenceLocalContext & LifecycleContext = {
        bootConfig,
        streams,
        instanceId: bootConfig.instanceId,
        logger,
        emitter,
        localStorage,
        monitorStream,
        keepAlive(milliseconds?: number) {
            onKeepAliveIssued();
            const data: KeepAliveMessageData = { keepAlive: milliseconds || 0 };

            writeMonitoring(monitorStream, [RunnerMessageCode.ALIVE, data]);
            return ctx;
        },
        end() {
            writeMonitoring(monitorStream, [
                RunnerMessageCode.SEQUENCE_STOPPED,
                { sequenceError: undefined },
            ]);
            return ctx;
        },
        destroy(error) {
            writeMonitoring(monitorStream, [
                RunnerMessageCode.SEQUENCE_STOPPED,
                { sequenceError: error },
            ]);
            return ctx;
        },
        on(eventName, handler) {
            emitter.on(eventName, handler);
            return ctx;
        },
        emit(eventName, message) {
            const ev: EventMessageData = { eventName, message, scope: "host" };

            writeMonitoring(monitorStream, [RunnerMessageCode.EVENT, ev]);
            return ctx;
        },
        addStopHandler(handler) {
            stopHandlers.push(handler);
            return ctx;
        },
        addKillHandler(handler) {
            killHandlers.push(handler);
            return ctx;
        },
        async stopHandler(timeout, canCallKeepalive) {
            for (const handler of stopHandlers) {
                await handler(timeout, canCallKeepalive);
            }
        },
        killHandler() {
            for (const handler of killHandlers) handler();
        },
    };

    return { context: ctx, localStorage };
}

interface BuildAppContextDeps {
    bootConfig: RunnerNodeBootConfig;
    monitorStream: Writable;
    emitter: EventEmitter;
    logger: ObjLogger;
    hostClient: HostClient;
    onKeepAliveIssued: () => void;
}

interface BuildAppContextResult {
    context: RunnerAppContext<AppConfig, unknown> & LifecycleContext;
    api: APIExpose;
    localStorage: LocalStorageAgent;
}

export function buildAppContext(deps: BuildAppContextDeps): BuildAppContextResult {
    const { bootConfig, monitorStream, emitter, logger, hostClient, onKeepAliveIssued } = deps;

    const api: APIExpose = createServer(undefined, {
        defaultRoute: (req, res) => {
            logger.debug("API unhandled request", req.url);
            res.writeHead(404);
            res.end("Not Found");
        },
    });

    const localCache: Record<string, string | null> = {};
    const storageHost: LocalStorageAgentHost = {
        writeMonitoringMessage: (msg) => writeMonitoring(monitorStream, msg),
        localCache,
    };
    const localStorage = new LocalStorageAgent(storageHost);

    const apiBase = "http://scramjet-host/api/v1";
    const hostClientUtils = new ClientUtilsCustomAgent(apiBase, hostClient.getAgent());
    const hub = new ApiHostClient(apiBase, hostClientUtils);
    const space = hub.getManagerClient("/api/v1");

    const proxy: RunnerProxy = {
        keepAliveIssued: () => onKeepAliveIssued(),
        sendKeepAlive: (data) =>
            writeMonitoring(monitorStream, [RunnerMessageCode.ALIVE, data]),
        sendStop: (err) =>
            writeMonitoring(monitorStream, [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError: err }]),
        sendEvent: (ev) =>
            writeMonitoring(monitorStream, [RunnerMessageCode.EVENT, ev]),
    };

    const logLevel: LogLevel = bootConfig.logLevel ?? "DEBUG";
    const appConfig: AppConfig = bootConfig.appConfig ?? {};
    const instanceId = bootConfig.instanceId;

    const context = new RunnerAppContext<AppConfig, unknown>(
        appConfig,
        monitorStream,
        emitter,
        proxy,
        hub,
        space,
        instanceId,
        logLevel,
        api,
        localStorage
    ) as RunnerAppContext<AppConfig, unknown> & LifecycleContext;

    emitter.on("error", (e) => logger.error("Sequence emitted an error event", e));

    return { context, api, localStorage };
}

const RUNNER_NODE_CHANNELS: ReadonlySet<CC> = new Set<CC>([
    CC.IN, CC.OUT, CC.LOG, CC.REQUESTS,
]);

function makeOutputDiscard(): RunSequenceHostClient["outputStream"] {
    const sink = new PassThrough();

    sink.resume();
    return sink as unknown as RunSequenceHostClient["outputStream"];
}

export interface BootstrapOverrides {
    loadSequence?: (sequencePath: string) => SequenceFunction[];
}

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

    if (hasHost) {
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

        if (bootConfig.exposePath) {
            await startApiServer(built.api, bootConfig.exposePath, bootConfig.exposeHost, logger);
        }

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
            args: bootConfig.sequenceArgs ?? [],
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
            process.exit(RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION);
        });
}
