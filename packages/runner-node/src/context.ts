import { AppConfig, LogLevel } from "@scramjet/runtime-types";
import type { KeepAliveMessageData } from "@scramjet/runtime-types";
import { RunnerMessageCode } from "@scramjet/symbols";
import { createServer } from "@scramjet/api-server";
import { HostClient as ApiHostClient } from "@scramjet/api-client";
import type { ApiClientRequest, ApiClientTransport } from "@scramjet/api-router";
import { ClientUtilsCustomAgent } from "@scramjet/client-utils";
import { createHubClient, createSpaceClient } from "@scramjet/rest-api2";

import { LocalStorageAgent } from "./local-storage-agent";
import type { LocalStorageAgentHost } from "./local-storage-agent";
import type { LifecycleContext } from "./lifecycle";
import { RunnerAppContext } from "./runner-app-context";
import type { RunnerProxy } from "./runner-app-context";
import type { BuildAppContextDeps, BuildAppContextResult, BuildContextDeps, BuildSequenceContextResult, SequenceLocalContext } from "./types";
import { writeMonitoring } from "./utils";

function materializePath(path: string, params: unknown): string {
    if (!params || typeof params !== "object") {
        return path;
    }

    return Object.entries(params as Record<string, string>).reduce((current, [key, value]) => current.replace(`:${key}`, encodeURIComponent(String(value))), path);
}

function appendQuery(path: string, query: unknown): string {
    if (!query || typeof query !== "object") {
        return path;
    }

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
        if (value !== undefined) {
            params.set(key, String(value));
        }
    }

    const text = params.toString();

    return text ? `${path}?${text}` : path;
}

function responseHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};

    response.headers.forEach((value, key) => {
        headers[key] = value;
    });

    return headers;
}

/**
 * Wraps JSON parse errors from RestAPI2 v2 client flows with a clear,
 * actionable message.  Without this, route-metadata redirects (308) or
 * empty-body CPM proxy responses surface as a bare SyntaxError that is
 * indistinguishable from a genuine JSON bug.
 *
 * Only SyntaxErrors mentioning JSON parsing are caught; other errors
 * propagate unchanged.
 */
function normalizeRestApiResponseError(original: unknown, routePath: string, status?: number): Error {
    if (original instanceof SyntaxError && /JSON|parse|end of input|Unexpected/.test(original.message)) {
        const code = status !== undefined ? ` status=${status}` : "";
        return new Error(
            `RestAPI2 response parse error for ${routePath}${code}: ${original.message}. ` +
                `This may be caused by a 308 route-metadata redirect or an empty-body response ` +
                `from the Hub CPM proxy. Configure hubTargetDomain for direct Manager/space v2 ` +
                `routing, or handle route-aware responses explicitly.`
        );
    }

    return original instanceof Error ? original : new Error(String(original));
}

function createRestApi2Transport(clientUtils: ClientUtilsCustomAgent): ApiClientTransport {
    return {
        async request<T>(request: ApiClientRequest) {
            const path = appendQuery(materializePath(request.route.fullPath, request.params), request.query).replace(/^\//, "");
            const headers = { ...request.headers };
            let response: Response;

            try {
                response = await clientUtils.request(request.route.method as any, path, {
                    headers,
                    body: request.body === undefined ? undefined : JSON.stringify(request.body)
                });
            } catch (err) {
                // Catches JSON parse errors from the verser-common/agent layer
                // before a Response object is formed (e.g. empty-body 308).
                throw normalizeRestApiResponseError(err, request.route.fullPath);
            }

            const text = await response.text();
            let body: T | undefined;

            if (text) {
                try {
                    body = JSON.parse(text) as T;
                } catch (err) {
                    throw normalizeRestApiResponseError(err, request.route.fullPath, response.status);
                }
            }

            return {
                status: response.status,
                headers: responseHeaders(response),
                body: body as T
            };
        }
    };
}

export function buildSequenceContext(deps: BuildContextDeps): BuildSequenceContextResult {
    const { bootConfig, streams, emitter, logger, onKeepAliveIssued } = deps;
    const monitorStream = streams.monitoringOut;

    const localCache: Record<string, string | null> = {};
    const storageHost: LocalStorageAgentHost = {
        writeMonitoringMessage: (msg) => writeMonitoring(monitorStream, msg),
        localCache
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
        // Preserve the local runner's historical completion delay while still
        // allowing a sequence to replace it through context.exitTimeout.
        exitTimeout: bootConfig.exitTimeout ?? 5_000,
        keepAlive(milliseconds?: number) {
            onKeepAliveIssued();
            const data: KeepAliveMessageData = { keepAlive: milliseconds || 0 };

            writeMonitoring(monitorStream, [RunnerMessageCode.ALIVE, data]);
            return ctx;
        },
        end() {
            writeMonitoring(monitorStream, [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError: undefined }]);
            return ctx;
        },
        destroy(error) {
            writeMonitoring(monitorStream, [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError: error }]);
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
        }
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
        }
    });

    const localCache: Record<string, string | null> = {};
    const storageHost: LocalStorageAgentHost = {
        writeMonitoringMessage: (msg) => writeMonitoring(monitorStream, msg),
        localCache
    };
    const localStorage = new LocalStorageAgent(storageHost);

    const apiBase = hostClient.getApiBase();
    const hostClientUtils = new ClientUtilsCustomAgent(apiBase, hostClient.getAgent());
    const hub = new ApiHostClient(apiBase, hostClientUtils);
    const space = hub.getManagerClient("/api/v1");
    const apiRoot = hostClient.getV2ApiBase().replace(/\/api\/v2\/?$/, "");
    const restApi2Transport = createRestApi2Transport(new ClientUtilsCustomAgent(apiRoot, hostClient.getAgent()));
    const v2Hub = createHubClient({ transport: restApi2Transport, basePath: "/api/v2" });

    // Space v2 client: direct Manager/space v2 routing when spaceTargetDomain
    // is explicitly configured, Hub-local v2 fallback otherwise. The
    // hubClient() continues to use hubTargetDomain (from hostClient.getV2ApiBase())
    // — the two target domains are independent.
    const spaceTargetDomain = bootConfig.verser2Runtime?.spaceTargetDomain;
    const v2Space = spaceTargetDomain
        ? createSpaceClient({
              transport: createRestApi2Transport(new ClientUtilsCustomAgent(`http://${spaceTargetDomain}`, hostClient.getAgent())),
              basePath: "/api/v2"
          })
        : createSpaceClient({ transport: restApi2Transport, basePath: "/api/v2" });

    const proxy: RunnerProxy = {
        keepAliveIssued: () => onKeepAliveIssued(),
        sendKeepAlive: (data) => writeMonitoring(monitorStream, [RunnerMessageCode.ALIVE, data]),
        sendStop: (err) => writeMonitoring(monitorStream, [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError: err }]),
        sendEvent: (ev) => writeMonitoring(monitorStream, [RunnerMessageCode.EVENT, ev])
    };

    const logLevel: LogLevel = bootConfig.logLevel ?? "DEBUG";
    const appConfig: AppConfig = bootConfig.appConfig ?? {};
    const instanceId = bootConfig.instanceId;

    const context = new RunnerAppContext<AppConfig, unknown, typeof v2Hub, typeof v2Space>(
        appConfig,
        monitorStream,
        emitter,
        proxy,
        hub,
        space,
        v2Hub,
        v2Space,
        instanceId,
        logLevel,
        api,
        localStorage,
        logger
    ) as BuildAppContextResult["context"];
    context.exitTimeout = bootConfig.exitTimeout ?? 10_000;

    emitter.on("error", (e) => logger.error("Sequence emitted an error event", e));

    return { context, api, localStorage };
}
