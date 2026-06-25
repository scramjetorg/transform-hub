import { Readable } from "node:stream";
import { RunnerMessageCode } from "@scramjet/symbols";

export interface HubMockRequest {
    method: string;
    path: string;
    headers?: Record<string, string | string[] | undefined>;
    body?: unknown;
}

export interface HubMockResponse {
    status: number;
    headers?: Record<string, string | string[] | undefined>;
    body?: unknown;
    text(): Promise<string>;
    json(): Promise<unknown>;
    stream?: Readable;
}

export interface HubRouteBuilder {
    reply(statusCode: number, body?: unknown, headers?: Record<string, string>): void;
}

interface Route {
    method: string;
    path: string;
    status: number;
    body?: unknown;
    headers?: Record<string, string>;
}

interface HubTimelineEntry {
    sequence: number;
    method: string;
    path: string;
    body?: unknown;
    headers?: Record<string, string | string[] | undefined>;
    response?: HubMockResponse;
}

export type HubCallMatch = {
    method?: string;
    path?: string;
};

interface HubAssertions {
    called(match: HubCallMatch): void;
    callCount(match: HubCallMatch, count: number): void;
    body(match: HubCallMatch, expected: unknown | ((body: unknown) => boolean)): void;
    order(matches: HubCallMatch[]): void;
}

interface HubApiExtensions {
    getVersion(): Promise<unknown>;
    getStatus(): Promise<unknown>;
    getConfig(): Promise<unknown>;
    getLoadCheck(): Promise<unknown>;
    listSequences(): Promise<unknown>;
    sendSequence(sequencePackage: unknown): Promise<unknown>;
    getSequence(sequenceId: string): Promise<unknown>;
    deleteSequence(sequenceId: string): Promise<unknown>;
    startSequence(sequenceId: string, body?: unknown): Promise<unknown>;
    listInstances(): Promise<unknown>;
    getInstanceInfo(instanceId: string): Promise<unknown>;
    callHostRpc<T = unknown>(name: string, body?: unknown): Promise<T>;
    callInstanceRpc<T = unknown>(instanceId: string, name: string, body?: unknown): Promise<T>;
    callHostRpcStream(name: string, body?: unknown): Promise<Readable>;
    callInstanceRpcStream(instanceId: string, name: string, body?: unknown): Promise<Readable>;
    createTopic(name?: string, contentType?: string): Promise<unknown>;
    listTopics(): Promise<unknown>;
    deleteTopic(name: string): Promise<unknown>;
    sendTopic(name: string, data?: unknown): Promise<unknown>;
    getTopic(name: string): Promise<unknown>;
    sendNamedData(name: string, data?: unknown): Promise<unknown>;
    getNamedData(name: string): Promise<Readable>;
    requests(): HubMockRequest[];
    assertCalled(method: string, path: string): Promise<void>;
    assert: {
        called(method: string, path: string): Promise<void>;
        calledMatch(match: HubCallMatch): Promise<void>;
        callCount(match: HubCallMatch, count: number): Promise<void>;
        body(match: HubCallMatch, expected: unknown | ((body: unknown) => boolean)): Promise<void>;
        order(matches: HubCallMatch[]): Promise<void>;
    };
}

export interface HubMock extends HubApiExtensions {
    get(path: string): HubRouteBuilder;
    post(path: string): HubRouteBuilder;
    any(path: string): HubRouteBuilder;
    handle(request: HubMockRequest): Promise<HubMockResponse>;
}

type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

interface HubContextSpaceCall {
    sequence: number;
    method: string;
    path: string;
    body?: unknown;
    headers?: Record<string, string | string[] | undefined>;
}

interface HubHarnessSpace {
    host: string;
    port: number;
    timeline?: HubContextSpaceCall[];
    request(
        method: string,
        path: string,
        body?: unknown,
        headers?: Record<string, string | string[] | undefined>
    ): Promise<unknown>;
    get(path: string): Promise<unknown>;
    post(path: string, body?: unknown, headers?: Record<string, string | string[] | undefined>): Promise<unknown>;
    [key: string]: unknown;
}

interface HubContextLoggerCall {
    sequence: number;
    level: LogLevel;
    message: unknown;
    details: unknown[];
    timestamp: number;
}

interface HubContextEventRecord {
    sequence: number;
    scope: "host" | "space";
    name: string;
    message: unknown;
    timestamp: number;
}

type HubContextLifecycleAction = "keepAlive" | "end" | "destroy";

interface HubContextLifecycleRecord {
    sequence: number;
    action: HubContextLifecycleAction;
    keepAlive?: number;
    reason?: unknown;
    timestamp: number;
    monitoringFrame: unknown[];
}

interface HubContextStorageRecord {
    sequence: number;
    action: "getItem" | "setItem" | "removeItem" | "clear";
    key?: string;
    value?: string | null;
    previousValue?: string | null;
    state?: Record<string, string | null>;
    timestamp: number;
}

interface HubContextApiRoute {
    sequence: number;
    path: string;
    handler: unknown;
    handlerName?: string;
    argsCount?: number;
}

interface HubContextLogger {
    trace: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}

export interface HubContext {
    hub: {
        get(path: string): Promise<unknown>;
        post(path: string, body?: unknown): Promise<unknown>;
        delete(path: string): Promise<unknown>;
        request(method: string, path: string, body?: unknown): Promise<unknown>;
    };
    hubClient(): {
        status: { get(): Promise<{ body: unknown }> };
    };
    keepAlive(milliseconds?: number): HubContext;
    end(): HubContext;
    destroy(error?: unknown): HubContext;
    emit(name: string, message: unknown): HubContext;
    emitToSpace(name: string, message: unknown): HubContext;
    localStorage: {
        getItem(key: string): Promise<string | null>;
        setItem(key: string, value: string): Promise<void>;
        removeItem(key: string): Promise<void>;
        clear(): Promise<void>;
        _state?: Record<string, string | null>;
    };
    logger: HubContextLogger;
    api: {
        use(path: string, handler: unknown): void;
    };
    space: HubHarnessSpace;
    spaceClient(): {
        hubs: { get(): Promise<{ body: unknown }> };
    };
}

interface HubContextInspectors {
    lifecycle(): HubContextLifecycleRecord[];
    events(): HubContextEventRecord[];
    logs(): HubContextLoggerCall[];
    localStorageEntries(): Record<string, string | null>;
    storage(): HubContextStorageRecord[];
    apiRoutes(): HubContextApiRoute[];
    spaceCalls(): HubContextSpaceCall[];
}

export interface HubHarness {
    hub: HubMock;
    context: HubContext & HubContextInspectors;
    calls(): HubTimelineEntry[];
    lifecycle(): HubContextLifecycleRecord[];
    events(): HubContextEventRecord[];
    logs(): HubContextLoggerCall[];
    localStorageEntries(): Record<string, string | null>;
    storage(): HubContextStorageRecord[];
    apiRoutes(): HubContextApiRoute[];
    spaceCalls(): HubContextSpaceCall[];
    assert: HubAssertions;
}

interface CreateHubHarnessOptions {
    basePath?: string;
    streamDefaults?: {
        rpc?: string | Buffer;
        topic?: string | Buffer;
    };
}

type CapturedStreamBody = {
    kind: "stream";
    chunks: string[];
    totalLength: number;
};

type StoredTopic = {
    name: string;
    contentType: string;
    data?: unknown;
    defaultData?: string;
};

function normalizeMethod(method: string): string {
    return method.toUpperCase();
}

function normalizePath(rawPath: string): string {
    const pathWithoutQuery = (rawPath || "").split("?")[0] || "/";
    const trimmed = pathWithoutQuery.trim();
    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const normalized = withLeadingSlash.replace(/\/{2,}/g, "/");

    if (normalized.length > 1 && normalized.endsWith("/")) {
        return normalized.slice(0, -1);
    }

    return normalized;
}

function cloneHeaders(headers?: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined> | undefined {
    if (!headers) {
        return headers;
    }

    return { ...headers };
}

function toText(body: unknown): string {
    if (typeof body === "string") {
        return body;
    }

    if (Buffer.isBuffer(body)) {
        return body.toString("utf8");
    }

    if (body === undefined) {
        return "";
    }

    return JSON.stringify(body);
}

function createResponse(status: number, body?: unknown, headers?: Record<string, string>, stream?: Readable): HubMockResponse {
    const textBody = toText(body);
    const responseHeaders = cloneHeaders(headers);
    let responseBody: unknown = textBody;

    if (stream && textBody.length > 0) {
        responseBody = textBody;
    } else if (stream) {
        responseBody = undefined;
    }

    return {
        status,
        headers: responseHeaders,
        body: responseBody,
        stream,
        text: async () => textBody,
        json: async () => {
            if (!textBody) {
                return undefined;
            }

            try {
                return JSON.parse(textBody);
            } catch (_error) {
                return textBody;
            }
        }
    };
}

function createReadableFromPayload(payload: string | Buffer): Readable {
    return Readable.from([payload]);
}

function inferContentType(body: unknown): string {
    if (body instanceof Readable) {
        return "application/octet-stream";
    }

    if (Buffer.isBuffer(body)) {
        return "application/octet-stream";
    }

    if (typeof body === "string") {
        return "text/plain";
    }

    return "application/json";
}

function collectStreamBody(stream: Readable): Promise<CapturedStreamBody> {
    const chunks: string[] = [];
    let totalLength = 0;

    return new Promise((resolve, reject) => {
        stream.on("error", error => {
            reject(error);
        });

        stream.on("data", chunk => {
            const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));

            totalLength += value.length;
            chunks.push(value.toString("utf8"));
        });

        stream.on("end", () => {
            resolve({ kind: "stream", chunks, totalLength });
        });
    });
}

async function normalizeBodyValue(request: HubMockRequest): Promise<unknown> {
    const contentType = request.headers?.["content-type"] ?? request.headers?.["Content-Type"];

    if (request.body instanceof Readable) {
        return collectStreamBody(request.body);
    }

    if (Buffer.isBuffer(request.body)) {
        if (contentType === "application/json") {
            try {
                return JSON.parse(request.body.toString("utf8"));
            } catch (_error) {
                return request.body;
            }
        }

        return request.body;
    }

    if (typeof request.body === "string" && contentType === "application/json") {
        try {
            return JSON.parse(request.body);
        } catch (_error) {
            return request.body;
        }
    }

    return request.body;
}

function makeMatch(match: HubCallMatch, call: HubTimelineEntry): boolean {
    if (match.method && normalizeMethod(call.method) !== normalizeMethod(match.method)) {
        return false;
    }

    if (match.path && normalizePath(call.path) !== normalizePath(match.path)) {
        return false;
    }

    return true;
}

function createMatcherAssertionError(message: string): never {
    throw new Error(message);
}

export function createHubHarness(_options: CreateHubHarnessOptions = {}): HubHarness {
    const routes: Route[] = [];
    const timeline: HubTimelineEntry[] = [];
    let contextSequence = 0;
    const lifecycleTimeline: HubContextLifecycleRecord[] = [];
    const eventTimeline: HubContextEventRecord[] = [];
    const loggerTimeline: HubContextLoggerCall[] = [];
    const storageTimeline: HubContextStorageRecord[] = [];
    const apiRouteTimeline: HubContextApiRoute[] = [];
    const spaceTimeline: HubContextSpaceCall[] = [];
    const localStorageState: Record<string, string | null> = {};
    const topics = new Map<string, StoredTopic>();
    const sequences = new Map<string, unknown>();
    const instances = new Map<string, { id: string; sequenceId?: string }>();
    let callSequence = 0;
    let sequenceCounter = 0;

    const basePath = normalizePath(_options.basePath ?? "/api/v1");
    const defaultRpcStreamData = _options.streamDefaults?.rpc ?? "rpc-stream";
    const defaultTopicStreamData = _options.streamDefaults?.topic ?? "topic-stream";

    const nextContextSequence = () => {
        contextSequence += 1;

        return contextSequence;
    };

    const serializeErrorPayload = (error: unknown): unknown => {
        if (error === null || error === undefined) {
            return error;
        }

        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack
            };
        }

        return error;
    };

    const now = () => Date.now();

    const recordLifecycle = (action: HubContextLifecycleAction, value?: number, reason?: unknown): void => {
        const monitoringPayload = action === "keepAlive"
            ? [RunnerMessageCode.ALIVE, { keepAlive: value || 0 }]
            : [RunnerMessageCode.SEQUENCE_STOPPED, { action, reason: serializeErrorPayload(reason), keepAlive: value || 0 }];

        lifecycleTimeline.push({
            sequence: nextContextSequence(),
            action,
            keepAlive: value,
            reason,
            timestamp: now(),
            monitoringFrame: monitoringPayload
        });
    };

    const recordEvent = (scope: "host" | "space", name: string, message: unknown): void => {
        eventTimeline.push({
            sequence: nextContextSequence(),
            scope,
            name,
            message,
            timestamp: now()
        });
    };

    const recordLogger = (level: LogLevel, args: unknown[]): void => {
        const [message, ...details] = args;

        loggerTimeline.push({
            sequence: nextContextSequence(),
            level,
            message,
            details,
            timestamp: now()
        });
    };

    const recordStorage = (action: HubContextStorageRecord["action"], key: string | undefined, value?: string | null): void => {
        const previousValue = key === undefined ? undefined : localStorageState[key] ?? null;

        storageTimeline.push({
            sequence: nextContextSequence(),
            action,
            key,
            value,
            previousValue,
            state: key ? { ...localStorageState } : { ...localStorageState },
            timestamp: now()
        });
    };

    const recordApiRoute = (path: string, handler: unknown): void => {
        apiRouteTimeline.push({
            sequence: nextContextSequence(),
            path,
            handler,
            handlerName: typeof handler === "function" ? handler.name : undefined,
            argsCount: typeof handler === "function" ? handler.length : undefined
        });
    };

    const recordSpaceCall = (method: string, path: string, body?: unknown, headers?: Record<string, string | string[] | undefined>): void => {
        spaceTimeline.push({
            sequence: nextContextSequence(),
            method: normalizeMethod(method),
            path: normalizePath(path),
            body,
            headers: cloneHeaders(headers)
        });
    };

    const recordCall = async (
        method: string,
        path: string,
        body?: unknown,
        headers?: Record<string, string | string[] | undefined>,
        requestResponse?: HubMockResponse
    ): Promise<HubTimelineEntry> => {
        callSequence += 1;
        const entry: HubTimelineEntry = {
            sequence: callSequence,
            method: normalizeMethod(method),
            path: normalizePath(path),
            body,
            headers,
            response: requestResponse
        };

        timeline.push(entry);

        return entry;
    };

    const parseJson = async (response: HubMockResponse): Promise<unknown> => {
        try {
            return await response.json();
        } catch (_error) {
            return undefined;
        }
    };

    const registerRoute = (method: string, path: string): HubRouteBuilder => {
        const normalized = normalizePath(path);

        return {
            reply: (statusCode: number, body?: unknown, headers?: Record<string, string>) => {
                routes.push({
                    method: normalizeMethod(method),
                    path: normalized,
                    status: statusCode,
                    body,
                    headers
                });
            }
        };
    };

    const routeResponse = (method: string, path: string): Route | undefined => {
        return routes.find(route => {
            if (route.method !== "*" && route.method !== normalizeMethod(method)) {
                return false;
            }

            return route.path === normalizePath(path);
        });
    };

    // Route dispatch intentionally mirrors the supported harness endpoint matrix.
    const defaultResponse = async (
        method: string,
        requestPath: string,
        requestBody: unknown
    ): Promise<HubMockResponse> => {
        const normalized = normalizePath(requestPath);
        const methodUpper = normalizeMethod(method);
        const normalizedBase = normalizePath(basePath);

        if (normalized === `${normalizedBase}/version` && methodUpper === "GET") {
            return createResponse(200, {
                service: "sequence-test",
                version: "dev",
                build: "test",
                apiVersion: "1"
            });
        }

        if (normalized === `${normalizedBase}/status` && methodUpper === "GET") {
            return createResponse(200, { cpm: { cpmId: "local", connected: true } });
        }

        if (normalized === "/api/v2/status" && methodUpper === "GET") {
            return createResponse(200, { status: "ok", details: { cpm: { cpmId: "local", connected: true } } });
        }

        if (normalized === "/api/v1/cpm/api/v2/hubs" && methodUpper === "GET") {
            return createResponse(200, { items: [{ id: "hub-test" }] });
        }

        if (normalized === `${normalizedBase}/config` && methodUpper === "GET") {
            return createResponse(200, { public: true, hubTest: true });
        }

        if (normalized === `${normalizedBase}/load-check` && methodUpper === "GET") {
            return createResponse(200, {
                avgLoad: 0,
                currentLoad: 0,
                memFree: 2048,
                memUsed: 0,
                fsSize: [{ fs: "/", size: 0, used: 0, available: 0, use: 0 }]
            });
        }

        if (normalized === `${normalizedBase}/sequences` && methodUpper === "GET") {
            return createResponse(200, Array.from(sequences.entries()).map(([id]) => ({ id, instances: [], config: {} })));
        }

        if (normalized === `${normalizedBase}/sequences` && methodUpper === "POST") {
            sequenceCounter += 1;
            const id = `seq-${sequenceCounter}`;

            sequences.set(id, requestBody);

            return createResponse(200, { id });
        }

        if (normalizedBase !== "/" && normalized.startsWith(`${normalizedBase}/sequence/`) && methodUpper === "GET") {
            const sequenceId = normalized.slice(`${normalizedBase}/sequence/`.length);

            if (!sequences.has(sequenceId)) {
                return createResponse(404, { error: `sequence ${sequenceId} not found` });
            }

            return createResponse(200, { id: sequenceId, body: sequences.get(sequenceId) });
        }

        if (normalizedBase !== "/" && normalized.startsWith(`${normalizedBase}/sequence/`) && methodUpper === "DELETE") {
            const sequenceId = normalized.slice(`${normalizedBase}/sequence/`.length);

            sequences.delete(sequenceId);

            return createResponse(200, { opStatus: "OK", message: `sequence ${sequenceId} deleted` });
        }

        if (normalizedBase !== "/" && normalized.startsWith(`${normalizedBase}/sequence/`) && normalized.endsWith("/start") && methodUpper === "POST") {
            const sequenceId = normalized.slice(`${normalizedBase}/sequence/`.length, -"/start".length);

            if (!sequences.has(sequenceId)) {
                return createResponse(404, { error: `sequence ${sequenceId} not found` });
            }

            const instanceId = `inst-${instances.size + 1}`;

            instances.set(instanceId, { id: instanceId, sequenceId });

            return createResponse(200, { id: instanceId, status: "running", sequenceId, body: requestBody });
        }

        if (normalized === `${normalizedBase}/instances` && methodUpper === "GET") {
            return createResponse(200, Array.from(instances.keys()));
        }

        if (normalizedBase !== "/" && normalized.startsWith(`${normalizedBase}/instance/`) && methodUpper === "GET") {
            const instanceId = normalized.slice(`${normalizedBase}/instance/`.length);

            const info = instances.get(instanceId);

            if (!info) {
                return createResponse(404, { error: `instance ${instanceId} not found` });
            }

            return createResponse(200, { id: info.id, sequenceId: info.sequenceId });
        }

        if (normalized === `${normalizedBase}/topics` && methodUpper === "GET") {
            return createResponse(200, Array.from(topics.values()));
        }

        if (normalized === `${normalizedBase}/topics` && methodUpper === "POST") {
            const payload = typeof requestBody === "object" && requestBody !== null
                ? requestBody as Record<string, unknown>
                : {};

            const topicName = typeof payload.id === "string" && payload.id.length > 0
                ? payload.id
                : `topic-${topics.size + 1}`;
            const contentType = typeof payload["content-type"] === "string"
                ? payload["content-type"]
                : "text/plain";

            topics.set(topicName, { name: topicName, contentType, defaultData: undefined, data: undefined });

            return createResponse(200, {
                topicName,
                id: topicName,
                contentType
            });
        }

        if (normalizedBase !== "/" && normalized.startsWith(`${normalizedBase}/topics/`) && normalized.endsWith("/stream") && methodUpper === "GET") {
            const topicName = normalized.slice(`${normalizedBase}/topics/`.length, -"/stream".length);
            const topic = topics.get(topicName);

            return createResponse(
                200,
                topic?.defaultData ?? undefined,
                { "content-type": "text/plain" },
                createReadableFromPayload(topic?.defaultData ?? defaultTopicStreamData)
            );
        }

        if (normalizedBase !== "/" && normalized.startsWith(`${normalizedBase}/topics/`) && methodUpper === "GET") {
            const topicName = normalized.slice(`${normalizedBase}/topics/`.length);
            const topic = topics.get(topicName);

            if (!topic) {
                return createResponse(404, { error: `topic ${topicName} not found` });
            }

            return createResponse(200, { topicName: topic.name, id: topic.name, contentType: topic.contentType, data: topic.data });
        }

        if (normalizedBase !== "/" && normalized.startsWith(`${normalizedBase}/topics/`) && methodUpper === "POST") {
            const topicName = normalized.slice(`${normalizedBase}/topics/`.length);
            const topic = topics.get(topicName) ?? {
                name: topicName,
                contentType: "text/plain",
                defaultData: undefined,
                data: undefined
            };

            topic.data = requestBody;

            if (typeof requestBody === "string") {
                topic.defaultData = requestBody;
            } else if (Buffer.isBuffer(requestBody)) {
                topic.defaultData = requestBody.toString("utf8");
            }

            topics.set(topicName, topic);

            return createResponse(200, { topicName, id: topicName, opStatus: "OK", data: requestBody });
        }

        if (normalizedBase !== "/" && normalized.startsWith(`${normalizedBase}/topics/`) && methodUpper === "DELETE") {
            const topicName = normalized.slice(`${normalizedBase}/topics/`.length);
            const removed = topics.delete(topicName);

            return createResponse(200, { opStatus: removed ? "OK" : "NOT_FOUND" });
        }

        if (normalizedBase !== "/" && normalized.startsWith(`${normalizedBase}/rpc/`) && normalized.endsWith("/stream") && methodUpper === "POST") {
            const rpcName = normalized.slice(`${normalizedBase}/rpc/`.length, -"/stream".length);

            return createResponse(200, `rpc-stream:${rpcName}`, { "content-type": "text/plain" }, createReadableFromPayload(defaultRpcStreamData));
        }

        if (normalizedBase !== "/" && normalized.startsWith(`${normalizedBase}/rpc/`) && methodUpper === "POST") {
            const rpcName = normalized.slice(`${normalizedBase}/rpc/`.length);

            return createResponse(200, { rpc: rpcName, scope: "host", method: methodUpper, body: requestBody });
        }

        if (normalizedBase !== "/" && normalized.includes(`${normalizedBase}/instance/`) && normalized.includes("/rpc/") && normalized.endsWith("/stream") && methodUpper === "POST") {
            return createResponse(
                200,
                "instance-stream",
                { "content-type": "text/plain" },
                createReadableFromPayload(defaultRpcStreamData)
            );
        }

        if (normalizedBase !== "/" && normalized.includes(`${normalizedBase}/instance/`) && normalized.includes("/rpc/") && methodUpper === "POST") {
            const instanceRest = normalized.slice(`${normalizedBase}/instance/`.length);
            const separatorIndex = instanceRest.indexOf("/rpc/");

            if (separatorIndex >= 0) {
                const instanceId = instanceRest.slice(0, separatorIndex);
                const rpcName = instanceRest.slice(separatorIndex + "/rpc/".length);

                return createResponse(200, {
                    rpc: rpcName,
                    scope: "instance",
                    instanceId,
                    method: methodUpper,
                    body: requestBody
                });
            }
        }

        return createResponse(404, "");
    };

    const hub = {
        get: (path: string) => registerRoute("GET", path),
        post: (path: string) => registerRoute("POST", path),
        any: (path: string) => registerRoute("*", path),
        handle: async (request: HubMockRequest): Promise<HubMockResponse> => {
            const normalizedMethod = normalizeMethod(request.method || "GET");
            const normalizedPath = normalizePath(request.path || "/");
            const normalizedBody = await normalizeBodyValue(request);
            const normalizedHeaders = cloneHeaders(request.headers);

            const responseFromRoute = routeResponse(normalizedMethod, normalizedPath);

            if (responseFromRoute) {
                const response = responseFromRoute.body instanceof Readable
                    ? createResponse(responseFromRoute.status, undefined, responseFromRoute.headers, responseFromRoute.body)
                    : createResponse(responseFromRoute.status, responseFromRoute.body, responseFromRoute.headers);

                await recordCall(normalizedMethod, normalizedPath, normalizedBody, normalizedHeaders, response);

                return response;
            }

            const response = await defaultResponse(normalizedMethod, normalizedPath, normalizedBody);

            await recordCall(normalizedMethod, normalizedPath, normalizedBody, normalizedHeaders, response);

            return response;
        },
        getVersion: async () => parseJson(await hub.handle({ method: "GET", path: `${basePath}/version`, headers: {}, body: undefined })),
        getStatus: async () => parseJson(await hub.handle({ method: "GET", path: `${basePath}/status`, headers: {}, body: undefined })),
        getConfig: async () => parseJson(await hub.handle({ method: "GET", path: `${basePath}/config`, headers: {}, body: undefined })),
        getLoadCheck: async () => parseJson(await hub.handle({ method: "GET", path: `${basePath}/load-check`, headers: {}, body: undefined })),
        listSequences: async () => parseJson(await hub.handle({ method: "GET", path: `${basePath}/sequences`, headers: {}, body: undefined })),
        sendSequence: async (sequencePackage: unknown) => parseJson(await hub.handle({
            method: "POST",
            path: `${basePath}/sequences`,
            headers: { "content-type": "application/json" },
            body: sequencePackage
        })),
        getSequence: async (sequenceId: string) => parseJson(await hub.handle({
            method: "GET",
            path: `${basePath}/sequence/${sequenceId}`,
            headers: {},
            body: undefined
        })),
        deleteSequence: async (sequenceId: string) => parseJson(await hub.handle({
            method: "DELETE",
            path: `${basePath}/sequence/${sequenceId}`,
            headers: {},
            body: undefined
        })),
        startSequence: async (sequenceId: string, body?: unknown) => parseJson(await hub.handle({
            method: "POST",
            path: `${basePath}/sequence/${sequenceId}/start`,
            headers: { "content-type": "application/json" },
            body
        })),
        listInstances: async () => parseJson(await hub.handle({
            method: "GET",
            path: `${basePath}/instances`,
            headers: {},
            body: undefined
        })),
        getInstanceInfo: async (instanceId: string) => parseJson(await hub.handle({
            method: "GET",
            path: `${basePath}/instance/${instanceId}`,
            headers: {},
            body: undefined
        })),
        callHostRpc: async <T>(name: string, body?: unknown): Promise<T> => parseJson(await hub.handle({
            method: "POST",
            path: `${basePath}/rpc/${name}`,
            headers: { "content-type": inferContentType(body) },
            body
        })) as Promise<T>,
        callInstanceRpc: async <T>(instanceId: string, name: string, body?: unknown): Promise<T> => parseJson(await hub.handle({
            method: "POST",
            path: `${basePath}/instance/${instanceId}/rpc/${name}`,
            headers: { "content-type": inferContentType(body) },
            body
        })) as Promise<T>,
        callHostRpcStream: async (name: string, body?: unknown): Promise<Readable> => {
            const response = await hub.handle({
                method: "POST",
                path: `${basePath}/rpc/${name}/stream`,
                headers: { "content-type": inferContentType(body) },
                body
            });

            return response.stream ?? createReadableFromPayload("{}");
        },
        callInstanceRpcStream: async (instanceId: string, name: string, body?: unknown): Promise<Readable> => {
            const response = await hub.handle({
                method: "POST",
                path: `${basePath}/instance/${instanceId}/rpc/${name}/stream`,
                headers: { "content-type": inferContentType(body) },
                body
            });

            return response.stream ?? createReadableFromPayload("{}");
        },
        createTopic: async (name?: string, contentType = "text/plain") => parseJson(await hub.handle({
            method: "POST",
            path: `${basePath}/topics`,
            headers: { "content-type": "application/json" },
            body: { id: name, "content-type": contentType }
        })),
        listTopics: async () => parseJson(await hub.handle({
            method: "GET",
            path: `${basePath}/topics`,
            headers: {},
            body: undefined
        })),
        deleteTopic: async (name: string) => parseJson(await hub.handle({
            method: "DELETE",
            path: `${basePath}/topics/${name}`,
            headers: {},
            body: undefined
        })),
        sendTopic: async (name: string, data?: unknown) => parseJson(await hub.handle({
            method: "POST",
            path: `${basePath}/topics/${name}`,
            headers: { "content-type": inferContentType(data) },
            body: data
        })),
        getTopic: async (name: string) => parseJson(await hub.handle({
            method: "GET",
            path: `${basePath}/topics/${name}`,
            headers: {},
            body: undefined
        })),
        sendNamedData: (name: string, data?: unknown) => hub.sendTopic(name, data),
        getNamedData: async (name: string): Promise<Readable> => {
            const response = await hub.handle({
                method: "GET",
                path: `${basePath}/topics/${name}/stream`,
                headers: {},
                body: undefined
            });

            return response.stream ?? createReadableFromPayload("{}");
        },
        requests: () => timeline.map((entry) => ({
            method: entry.method,
            path: entry.path,
            headers: cloneHeaders(entry.headers),
            body: entry.body
        } as HubMockRequest)),
        assertCalled: (method: string, path: string): Promise<void> => Promise.resolve().then(() => {
            if (!timeline.some(entry => normalizeMethod(entry.method) === normalizeMethod(method) && normalizePath(entry.path) === normalizePath(path))) {
                throw new Error(`Expected Hub request ${normalizeMethod(method)} ${normalizePath(path)} was not captured`);
            }
        }),
        assert: {
            called: (method: string, path: string): Promise<void> => {
                return hub.assertCalled(method, path);
            },
            calledMatch: (match: HubCallMatch): Promise<void> => Promise.resolve().then(() => {
                if (!timeline.some(entry => makeMatch(match, entry))) {
                    throw new Error(`Expected Hub request not captured: ${JSON.stringify(match)}`);
                }
            }),
            callCount: (match: HubCallMatch, count: number): Promise<void> => Promise.resolve().then(() => {
                const actual = timeline.filter(entry => makeMatch(match, entry)).length;

                if (actual !== count) {
                    throw new Error(`Expected ${count} calls matching ${JSON.stringify(match)}, got ${actual}`);
                }
            }),
            body: (match: HubCallMatch, expected: unknown | ((body: unknown) => boolean)): Promise<void> => Promise.resolve().then(() => {
                const expectedFn = typeof expected === "function"
                    ? expected as (body: unknown) => boolean
                    : (body: unknown) => body === expected || JSON.stringify(body) === JSON.stringify(expected);

                const hasBodyMatch = timeline.some(entry => {
                    if (!makeMatch(match, entry)) {
                        return false;
                    }

                    return expectedFn(entry.body);
                });

                if (!hasBodyMatch) {
                    throw new Error(`Expected request body match not found for ${JSON.stringify(match)}`);
                }
            }),
            order: (matches: HubCallMatch[]): Promise<void> => Promise.resolve().then(() => {
                let cursor = 0;

                for (const match of matches) {
                    const index = timeline.slice(cursor).findIndex(entry => makeMatch(match, entry));

                    if (index < 0) {
                        throw new Error(`Expected ordered call not found: ${JSON.stringify(match)}`);
                    }

                    cursor += index + 1;
                }
            })
        }
    };

    const contextHub = {
        request: async (method: string, path: string, body?: unknown): Promise<unknown> => {
            const normalizedMethod = method.toUpperCase();

            return parseJson(await hub.handle({
                method: normalizedMethod,
                path,
                headers: normalizedMethod === "GET" ? {} : { "content-type": inferContentType(body) },
                body
            }));
        },
        get: async (path: string): Promise<unknown> => contextHub.request("GET", path),
        post: async (path: string, body?: unknown): Promise<unknown> => contextHub.request("POST", path, body),
        delete: async (path: string): Promise<unknown> => contextHub.request("DELETE", path)
    };

    const contextHubExtended = {
        ...contextHub,
        getVersion: async () => hub.getVersion(),
        getStatus: async () => hub.getStatus(),
        getConfig: async () => hub.getConfig(),
        getLoadCheck: async () => hub.getLoadCheck(),
        listSequences: async () => hub.listSequences(),
        sendSequence: async (sequencePackage: unknown) => hub.sendSequence(sequencePackage),
        getSequence: async (sequenceId: string) => hub.getSequence(sequenceId),
        deleteSequence: async (sequenceId: string) => hub.deleteSequence(sequenceId),
        startSequence: async (sequenceId: string, body?: unknown) => hub.startSequence(sequenceId, body),
        listInstances: async () => hub.listInstances(),
        getInstanceInfo: async (instanceId: string) => hub.getInstanceInfo(instanceId),
        callHostRpc: async <T>(name: string, body?: unknown): Promise<T> => hub.callHostRpc<T>(name, body),
        callInstanceRpc: async <T>(instanceId: string, name: string, body?: unknown): Promise<T> =>
            hub.callInstanceRpc<T>(instanceId, name, body),
        callHostRpcStream: async (name: string, body?: unknown) => hub.callHostRpcStream(name, body),
        callInstanceRpcStream: async (instanceId: string, name: string, body?: unknown) =>
            hub.callInstanceRpcStream(instanceId, name, body),
        createTopic: async (name?: string, contentType?: string) => hub.createTopic(name, contentType),
        listTopics: async () => hub.listTopics(),
        deleteTopic: async (name: string) => hub.deleteTopic(name),
        sendTopic: async (name: string, data?: unknown) => hub.sendTopic(name, data),
        getTopic: async (name: string) => hub.getTopic(name),
        sendNamedData: async (name: string, data?: unknown) => hub.sendNamedData(name, data),
        getNamedData: async (name: string) => hub.getNamedData(name)
    };

    const v2HubClient = {
        status: {
            get: async () => ({ body: await parseJson(await hub.handle({ method: "GET", path: "/api/v2/status", headers: {}, body: undefined })) })
        }
    };

    const v2SpaceClient = {
        hubs: {
            get: async () => ({ body: await parseJson(await hub.handle({ method: "GET", path: "/api/v1/cpm/api/v2/hubs", headers: {}, body: undefined })) })
        }
    };

    const callLookup = (entry: HubTimelineEntry): HubTimelineEntry => ({
        sequence: entry.sequence,
        method: entry.method,
        path: entry.path,
        body: entry.body,
        response: entry.response
    });

    const assert: HubAssertions = {
        called: (match: HubCallMatch): void => {
            if (!timeline.some(entry => makeMatch(match, entry))) {
                createMatcherAssertionError(`Expected Hub call ${match.method ?? ""} ${match.path ?? ""} was not captured`);
            }
        },
        callCount: (match: HubCallMatch, count: number): void => {
            const actual = timeline.filter(entry => makeMatch(match, entry)).length;

            if (actual !== count) {
                createMatcherAssertionError(`Expected ${count} calls matching ${JSON.stringify(match)}, got ${actual}`);
            }
        },
        body: (match: HubCallMatch, expected: unknown | ((body: unknown) => boolean)): void => {
            const expectedFn = typeof expected === "function"
                ? expected as (body: unknown) => boolean
                : (body: unknown) => body === expected || JSON.stringify(body) === JSON.stringify(expected);

            const found = timeline.some(entry => {
                if (!makeMatch(match, entry)) {
                    return false;
                }

                return expectedFn(entry.body);
            });

            if (!found) {
                createMatcherAssertionError(`No matching call body for ${JSON.stringify(match)}`);
            }
        },
        order: (matches: HubCallMatch[]): void => {
            let cursor = 0;

            for (const match of matches) {
                const index = timeline.slice(cursor).findIndex(entry => makeMatch(match, entry));

                if (index < 0) {
                    createMatcherAssertionError(`Expected ordered call not found: ${JSON.stringify(match)}`);
                }

                cursor += index + 1;
            }
        }
    };

    const context = {
        hub: contextHubExtended,
        hubClient: () => v2HubClient,
        keepAlive(milliseconds?: number) {
            recordLifecycle("keepAlive", milliseconds);

            return context;
        },
        end() {
            recordLifecycle("end");

            return context;
        },
        destroy(error?: unknown) {
            recordLifecycle("destroy", undefined, error);

            return context;
        },
        emit(name: string, message: unknown) {
            recordEvent("host", name, message);

            return context;
        },
        emitToSpace(name: string, message: unknown) {
            recordEvent("space", name, message);

            return context;
        },
        localStorage: {
            getItem: async (key: string): Promise<string | null> => {
                const value = localStorageState[key] ?? null;

                recordStorage("getItem", key, value);

                return value;
            },
            setItem: async (key: string, value: string): Promise<void> => {
                recordStorage("setItem", key, value);
                localStorageState[key] = value;

                return undefined;
            },
            removeItem: async (key: string): Promise<void> => {
                recordStorage("removeItem", key);
                delete localStorageState[key];

                return undefined;
            },
            clear: async (): Promise<void> => {
                recordStorage("clear", undefined);

                for (const key of Object.keys(localStorageState)) {
                    delete localStorageState[key];
                }

                return undefined;
            }
        },
        logger: {
            trace: (...args: unknown[]) => {
                recordLogger("trace", args);
            },
            debug: (...args: unknown[]) => {
                recordLogger("debug", args);
            },
            info: (...args: unknown[]) => {
                recordLogger("info", args);
            },
            warn: (...args: unknown[]) => {
                recordLogger("warn", args);
            },
            error: (...args: unknown[]) => {
                recordLogger("error", args);
            }
        },
        api: {
            use: (path: string, handler: unknown) => {
                recordApiRoute(path, handler);
            }
        },
        lifecycle: () => lifecycleTimeline.map((entry) => ({ ...entry })),
        events: () => eventTimeline.map((entry) => ({ ...entry })),
        logs: () => loggerTimeline.map((entry) => ({ ...entry })),
        localStorageEntries: () => ({ ...localStorageState }),
        storage: () => storageTimeline.map((entry) => ({ ...entry })),
        apiRoutes: () => apiRouteTimeline.map((entry) => ({ ...entry })),
        spaceCalls: () => spaceTimeline.map((entry) => ({ ...entry })),
        space: {
            host: "host-test",
            port: 0,
            request: async (_method: string, path: string, body?: unknown, headers?: Record<string, string | string[] | undefined>) => {
                recordSpaceCall(_method, path, body, headers);

                return {
                    method: normalizeMethod(_method),
                    path,
                    body,
                    headers
                };
            },
            get: async (path: string) => {
                recordSpaceCall("GET", path);

                return { path };
            },
            post: async (path: string, body?: unknown, headers?: Record<string, string | string[] | undefined>) => {
                recordSpaceCall("POST", path, body, headers);

                return { path, body, headers };
            }
        },
        spaceClient: () => v2SpaceClient
    } as HubContext & HubContextInspectors;

    return {
        hub,
        context,
        calls: () => timeline.map(callLookup),
        assert,
        lifecycle: () => context.lifecycle(),
        events: () => context.events(),
        logs: () => context.logs(),
        localStorageEntries: () => context.localStorageEntries(),
        storage: () => context.storage(),
        apiRoutes: () => context.apiRoutes(),
        spaceCalls: () => context.spaceCalls()
    };
}

export type { HubTimelineEntry };
