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
    createTopic(name?: string, contentType?: string): Promise<unknown>;
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

interface HubHarnessSpace {
    [key: string]: unknown;
}

export interface HubHarness {
    hub: HubMock;
    context: {
        hub: HubMock;
        space: HubHarnessSpace;
    };
    calls(): HubTimelineEntry[];
    assert: HubAssertions;
}

interface CreateHubHarnessOptions {
    basePath?: string;
}

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
    if (!headers) return headers;

    return { ...headers };
}

function resolveResponseBodyText(body: unknown): string {
    if (typeof body === "string") {
        return body;
    }

    if (body === undefined) {
        return "";
    }

    return JSON.stringify(body);
}

function createResponse(status: number, body?: unknown, headers?: Record<string, string>): HubMockResponse {
    const textBody = resolveResponseBodyText(body);
    const responseHeaders = cloneHeaders(headers);

    return {
        status,
        headers: responseHeaders,
        body: textBody,
        text: async () => textBody,
        json: async () => {
            if (textBody === "") {
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

function normalizeBodyValue(request: HubMockRequest): unknown {
    const contentType = request.headers?.["content-type"] ?? request.headers?.["Content-Type"];

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
    const topics = new Map<string, { name: string; contentType: string }>();
    const sequences = new Map<string, unknown>();
    const instances = new Map<string, { id: string; sequenceId?: string }>();

    let callSequence = 0;
    let sequenceCounter = 0;

    const basePath = normalizePath(_options.basePath ?? "/api/v1");

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
    // eslint-disable-next-line complexity
    const defaultResponse = async (method: string, requestPath: string, requestBody: unknown): Promise<HubMockResponse> => {
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

            topics.set(topicName, { name: topicName, contentType });

            return createResponse(200, {
                topicName,
                id: topicName,
                contentType
            });
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
            const normalizedBody = normalizeBodyValue(request);
            const responseFromRoute = routeResponse(normalizedMethod, normalizedPath);
            const response = responseFromRoute
                ? createResponse(responseFromRoute.status, responseFromRoute.body, responseFromRoute.headers)
                : await defaultResponse(normalizedMethod, normalizedPath, normalizedBody);

            await recordCall(normalizedMethod, normalizedPath, normalizedBody, cloneHeaders(request.headers), response);

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
        createTopic: async (name?: string, contentType = "text/plain") => parseJson(await hub.handle({
            method: "POST",
            path: `${basePath}/topics`,
            headers: { "content-type": "application/json" },
            body: { id: name, "content-type": contentType }
        })),
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
                    if (!makeMatch(match, entry)) return false;

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
        hub,
        space: {
            host: "host-test",
            port: 0,
            timeline: timeline
        }
    };

    return {
        hub,
        context,
        calls: () => timeline.map(callLookup),
        assert
    };
}

export type { HubTimelineEntry };
