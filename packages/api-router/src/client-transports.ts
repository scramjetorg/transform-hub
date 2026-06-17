import { ApiClientRequest, ApiClientResponse, ApiClientTransport } from "./client";

export type FetchLike = (url: string, init: {
    method: string;
    headers?: Record<string, string>;
    body?: any;
}) => Promise<{
    status: number;
    headers: { forEach(callback: (value: string, key: string) => void): void };
    json(): Promise<unknown>;
    text(): Promise<string>;
}>;

function materializePath(path: string, params: unknown): string {
    if (!params || typeof params !== "object") {
        return path;
    }

    return Object.entries(params as Record<string, string>).reduce(
        (current, [key, value]) => current.replace(`:${key}`, encodeURIComponent(String(value))),
        path
    );
}

function appendQuery(url: string, query: unknown): string {
    if (!query || typeof query !== "object") {
        return url;
    }

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
        if (value !== undefined) {
            params.set(key, String(value));
        }
    }

    const text = params.toString();

    return text ? `${url}?${text}` : url;
}

function collectHeaders(headers: { forEach(callback: (value: string, key: string) => void): void }): Record<string, string> {
    const result: Record<string, string> = {};

    headers.forEach((value, key) => {
        result[key] = value;
    });

    return result;
}

export function createHttpClientTransport({ baseUrl, fetch }: { baseUrl: string; fetch: FetchLike }): ApiClientTransport {
    return {
        async request<T = unknown>(request: ApiClientRequest): Promise<ApiClientResponse<T>> {
            const path = materializePath(request.route.fullPath, request.params);
            const url = appendQuery(`${baseUrl.replace(/\/$/, "")}${path}`, request.query);
            const response = await fetch(url, {
                method: request.route.method.toUpperCase(),
                headers: request.headers,
                body: request.body === undefined ? undefined : JSON.stringify(request.body)
            });
            const text = await response.text();

            return {
                status: response.status,
                headers: collectHeaders(response.headers),
                body: (text ? JSON.parse(text) : undefined) as T
            };
        }
    };
}

export type Verser2BrokerLike = {
    request<T = unknown>(request: ApiClientRequest): Promise<ApiClientResponse<T>>;
};

export function createVerser2ClientTransport(broker: Verser2BrokerLike): ApiClientTransport {
    return {
        request: request => broker.request(request)
    };
}
