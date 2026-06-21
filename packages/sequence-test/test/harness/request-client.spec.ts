import http from "http";

import test from "ava";

import { RunnerMessageCode } from "@scramjet/symbols";

type RequestClient = {
    fetch: (...args: unknown[]) => Promise<{
        status: number;
        text: () => Promise<string>;
        json: () => Promise<unknown>;
    }>;
    get: (path: string) => Promise<{
        status: number;
        text: () => Promise<string>;
        json: () => Promise<unknown>;
    }>;
    post: (path: string, body: unknown) => Promise<{
        status: number;
        text: () => Promise<string>;
        json: () => Promise<unknown>;
    }>;
};

type RequestClientModule = {
    createSequenceRequestClient?: (options: { host: string; port: number; }) => Promise<RequestClient> | RequestClient;
    createSequenceRequestClientFromMonitoring?: (monitoring: unknown) => Promise<RequestClient> | RequestClient;
};

const loadRequestClientModule = (): RequestClientModule => {
    const candidates = ["../../src/request-client", "../../src"];

    for (const candidate of candidates) {
        try {
            return require(candidate) as RequestClientModule;
        } catch (_err) {
            // Optional/phase-gated API may not exist yet.
        }
    }

    throw new Error("Unable to load request-client API from sequence-test package");
};

const createServer = (handler: (req: http.IncomingMessage, res: http.ServerResponse) => void) =>
    new Promise<{ server: http.Server; port: number; close: () => Promise<void>; }>((resolve, reject) => {
        const server = http.createServer(handler);

        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (typeof address === "string" || !address) {
                reject(new Error("Expected TCP address for server"));
                return;
            }

            resolve({ server, port: address.port, close: () => new Promise((res, rej) => server.close(err => err ? rej(err) : res())) });
        });
    });

const collectBody = (req: http.IncomingMessage): Promise<string> => new Promise(resolve => {
    const chunks: Buffer[] = [];
    req.on("data", chunk => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
});

const getClientCreator = (t: any, field: keyof RequestClientModule) => {
    const moduleApi = loadRequestClientModule();
    const factory = moduleApi[field];

    t.is(typeof factory, "function", `${String(field)} should be a function`);

    return factory as (...args: any[]) => any;
};

const resolveClient = async (fn: (...args: any[]) => any, ...args: any[]) => {
    const value = await fn(...args);
    if (!value) {
        return value as unknown as RequestClient;
    }

    return value as RequestClient;
};

test("createSequenceRequestClient exposes fetch/get/post", async t => {
    const createSequenceRequestClient = getClientCreator(t, "createSequenceRequestClient");

    const client = await resolveClient(createSequenceRequestClient!, { host: "127.0.0.1", port: 12345 });

    t.truthy(client);
    t.is(typeof client.fetch, "function");
    t.is(typeof client.get, "function");
    t.is(typeof client.post, "function");
});

test("get('/health') performs HTTP GET against local server and returns status/text/json", async t => {
    const server = await createServer(async (req, res) => {
        if (req.url !== "/health" || req.method !== "GET") {
            res.writeHead(404);
            res.end();
            return;
        }

        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
    });

    try {
        const createSequenceRequestClient = getClientCreator(t, "createSequenceRequestClient");
        const client = await resolveClient(createSequenceRequestClient!, { host: "127.0.0.1", port: server.port });

        const response = await client.get("/health");

        t.is(response.status, 200);

        const payloadText = await response.text();
        t.true(payloadText.includes("\"ok\""));

        const payloadJson = await response.json();
        t.deepEqual(payloadJson, { ok: true });
    } finally {
        await server.close();
    }
});

test("post('/items', { id: 1 }) sends JSON body and application/json content-type", async t => {
    let receivedBody: string | undefined;
    let receivedContentType: string | undefined;

    const server = await createServer(async (req, res) => {
        if (req.url !== "/items" || req.method !== "POST") {
            res.writeHead(404);
            res.end();
            return;
        }

        receivedContentType = req.headers["content-type"];
        receivedBody = await collectBody(req);

        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify({ stored: true }));
    });

    try {
        const createSequenceRequestClient = getClientCreator(t, "createSequenceRequestClient");
        const client = await resolveClient(createSequenceRequestClient!, { host: "127.0.0.1", port: server.port });

        const response = await client.post("/items", { id: 1 });
        const body = await response.json();

        t.is(response.status, 201);
        t.deepEqual(body, { stored: true });
        t.is(receivedBody, JSON.stringify({ id: 1 }));
        t.is(receivedContentType, "application/json");
    } finally {
        await server.close();
    }
});

test("createSequenceRequestClientFromMonitoring discovers host/port from PING payload and can request", async t => {
    const server = await createServer(async (req, res) => {
        if (req.url !== "/health" || req.method !== "GET") {
            res.writeHead(404);
            res.end();
            return;
        }

        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ discovered: true }));
    });

    try {
        const createSequenceRequestClientFromMonitoring = getClientCreator(t, "createSequenceRequestClientFromMonitoring");

        const monitoringFrame = [RunnerMessageCode.PING, {
            id: "instance-1",
            created: Date.now(),
            payload: {
                exposeHost: "127.0.0.1",
                exposePort: server.port,
            },
            sequenceInfo: {},
            status: "running",
            inputHeadersSent: true,
        }] as const;

        const client = await resolveClient(createSequenceRequestClientFromMonitoring!, monitoringFrame as unknown);
        const response = await client.get("/health");
        const payload = await response.json();

        t.is(response.status, 200);
        t.deepEqual(payload, { discovered: true });
    } finally {
        await server.close();
    }
});

test("missing exposeHost/exposePort throws clear error when creating discovery client", async t => {
    const createSequenceRequestClientFromMonitoring = getClientCreator(t, "createSequenceRequestClientFromMonitoring");

    const monitoringFrame = [RunnerMessageCode.PING, {
        id: "instance-1",
        created: Date.now(),
        payload: {
        },
        sequenceInfo: {},
        status: "running",
        inputHeadersSent: true,
    }] as const;

    const maybeErr = await t.throwsAsync(async () => {
        const result = await resolveClient(createSequenceRequestClientFromMonitoring!, monitoringFrame as unknown);
        if (result && result.fetch) {
            await result.fetch("/health");
        }
    });

    t.truthy(maybeErr);
    if (maybeErr instanceof Error) {
        t.regex(maybeErr.message, /exposed api|expose/i);
    }
});
