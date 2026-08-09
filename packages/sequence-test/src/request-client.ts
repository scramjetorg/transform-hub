import http from "http";

export interface SequenceRequestClientOptions {
    host: string;
    port: number;
}

export interface SequenceRequestResponse {
    status: number;
    text(): Promise<string>;
    json(): Promise<unknown>;
}

export interface SequenceRequestClient {
    fetch(path: string, init?: { method?: string; body?: unknown; headers?: Record<string, string> }): Promise<SequenceRequestResponse>;
    get(path: string): Promise<SequenceRequestResponse>;
    post(path: string, body: unknown): Promise<SequenceRequestResponse>;
}

function createResponse(status: number, body: Buffer): SequenceRequestResponse {
    const text = body.toString("utf8");

    return {
        status,
        text: async () => text,
        json: async () => JSON.parse(text)
    };
}

export function createSequenceRequestClient(options: SequenceRequestClientOptions): SequenceRequestClient {
    const request = async (
        requestPath: string,
        init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
    ): Promise<SequenceRequestResponse> => {
        const method = init.method ?? "GET";
        const headers = init.headers ? { ...init.headers } : {};
        const body = init.body === undefined
            ? undefined
            : Buffer.from(typeof init.body === "string" ? init.body : JSON.stringify(init.body));

        if (body && !headers["content-type"]) {
            headers["content-type"] = "application/json";
        }

        return new Promise((resolveRequest, rejectRequest) => {
            const req = http.request({
                host: options.host,
                port: options.port,
                path: requestPath,
                method,
                headers
            }, res => {
                const chunks: Buffer[] = [];

                res.on("data", chunk => chunks.push(Buffer.from(chunk)));
                res.on("end", () => {
                    resolveRequest(createResponse(res.statusCode ?? 0, Buffer.concat(chunks)));
                });
            });

            req.once("error", rejectRequest);

            if (body) {
                req.write(body);
            }

            req.end();
        });
    };

    return {
        fetch: request,
        get: path => request(path),
        post: (path, body) => request(path, { method: "POST", body })
    };
}

export function createSequenceRequestClientFromMonitoring(frame: unknown): SequenceRequestClient {
    const payload = Array.isArray(frame)
        ? (frame[1] as { payload?: Record<string, unknown> } | undefined)?.payload ?? frame[1]
        : frame;
    const expose = payload as { exposeHost?: unknown; exposePort?: unknown } | undefined;

    if (typeof expose?.exposeHost !== "string" || typeof expose.exposePort !== "number") {
        throw new Error("Cannot create sequence request client: exposed API host/port not found in monitoring frame");
    }

    return createSequenceRequestClient({
        host: expose.exposeHost,
        port: expose.exposePort
    });
}
