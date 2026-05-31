import type { AppConfig, KeepAliveMessageData, LogLevel } from "@scramjet/types";
import { RunnerMessageCode } from "@scramjet/symbols";
import { createServer } from "@scramjet/api-server";
import { HostClient as ApiHostClient } from "@scramjet/api-client";
import { ClientUtilsCustomAgent } from "@scramjet/client-utils";

import { LocalStorageAgent } from "./local-storage-agent";
import type { LocalStorageAgentHost } from "./local-storage-agent";
import type { LifecycleContext } from "./lifecycle";
import { RunnerAppContext } from "./runner-app-context";
import type { RunnerProxy } from "./runner-app-context";
import type {
    BuildAppContextDeps,
    BuildAppContextResult,
    BuildContextDeps,
    BuildSequenceContextResult,
    SequenceLocalContext,
} from "./types";
import { writeMonitoring } from "./utils";

export function buildSequenceContext(deps: BuildContextDeps): BuildSequenceContextResult {
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
            writeMonitoring(monitorStream, [RunnerMessageCode.EVENT, { eventName, message, scope: "host" }]);
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

export function buildAppContext(deps: BuildAppContextDeps): BuildAppContextResult {
    const { bootConfig, monitorStream, emitter, logger, hostClient, onKeepAliveIssued } = deps;

    const api = createServer(undefined, {
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
        sendKeepAlive: (data) => writeMonitoring(monitorStream, [RunnerMessageCode.ALIVE, data]),
        sendStop: (err) => writeMonitoring(monitorStream, [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError: err }]),
        sendEvent: (ev) => writeMonitoring(monitorStream, [RunnerMessageCode.EVENT, ev]),
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
    ) as BuildAppContextResult["context"];

    emitter.on("error", (e) => logger.error("Sequence emitted an error event", e));

    return { context, api, localStorage };
}
