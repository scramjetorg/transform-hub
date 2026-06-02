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

export interface HubMock {
    get(path: string): HubRouteBuilder;
    post(path: string): HubRouteBuilder;
    any(path: string): HubRouteBuilder;
    handle(request: HubMockRequest): Promise<HubMockResponse>;
    requests(): HubMockRequest[];
    assertCalled(method: string, path: string): Promise<void>;
    assert: {
        called(method: string, path: string): Promise<void>;
    };
}

interface Route {
    method: string;
    path: string;
    status: number;
    body?: unknown;
    headers?: Record<string, string>;
}

function normalizeMethod(method: string): string {
    return method.toUpperCase();
}

function normalizeBody(request: HubMockRequest): unknown {
    const contentType = request.headers?.["content-type"] ?? request.headers?.["Content-Type"];

    if (typeof request.body === "string" && contentType === "application/json") {
        return JSON.parse(request.body);
    }

    return request.body;
}

function createResponse(status: number, body?: unknown, headers?: Record<string, string>): HubMockResponse {
    const serialized = typeof body === "string" ? body : JSON.stringify(body ?? "");

    return {
        status,
        headers,
        body: serialized,
        text: async () => serialized,
        json: async () => JSON.parse(serialized)
    };
}

export function createHubMock(): HubMock {
    const routes: Route[] = [];
    const capturedRequests: HubMockRequest[] = [];

    const register = (method: string, path: string): HubRouteBuilder => ({
        reply: (statusCode: number, body?: unknown, headers?: Record<string, string>) => {
            routes.push({ method: normalizeMethod(method), path, status: statusCode, body, headers });
        }
    });
    const assertCalled = async (method: string, path: string): Promise<void> => {
        const expectedMethod = normalizeMethod(method);
        const found = capturedRequests.some(request => normalizeMethod(request.method) === expectedMethod && request.path === path);

        if (!found) {
            throw new Error(`Expected Hub request ${expectedMethod} ${path} was not captured`);
        }
    };

    return {
        get: path => register("GET", path),
        post: path => register("POST", path),
        any: path => register("*", path),
        handle: async request => {
            const captured = {
                ...request,
                method: normalizeMethod(request.method),
                body: normalizeBody(request)
            };

            capturedRequests.push(captured);

            const route = routes.find(candidate =>
                candidate.path === request.path &&
                (candidate.method === "*" || candidate.method === normalizeMethod(request.method))
            );

            if (!route) {
                return createResponse(404, "");
            }

            return createResponse(route.status, route.body, route.headers);
        },
        requests: () => capturedRequests.slice(),
        assertCalled,
        assert: {
            called: assertCalled
        }
    };
}
