import baseTest from "ava";
const { createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);

import { ApiClientRequest, createApiClient, createHttpClientTransport, createRouter, createVerser2ClientTransport } from "../src";
import { ClientRequestProbeError, createClientRequestProbe } from "./lib/no-circumvention";
import { Readable } from "stream";

test("HTTP client transport materializes params, query, headers and body", async t => {
    const manifest = createRouter({ basePath: "/api/v2" }).post("/sequence/:id").collect();
    const seen: any[] = [];
    const transport = createHttpClientTransport({
        baseUrl: "http://localhost:8000",
        async fetch(url, init) {
            seen.push({ url, init });

            return {
                status: 201,
                headers: { forEach: callback => callback("application/json", "content-type") },
                async json() {
                    return { unused: true };
                },
                async text() {
                    return '{"ok":true}';
                }
            };
        }
    });
    const client = createApiClient(manifest, transport);
    const response = await client.request("POST /api/v2/sequence/:id", {
        params: { id: "seq 1" },
        query: { force: true, tag: ["a", "b"] },
        headers: { authorization: "token" },
        body: { start: true }
    });

    t.is(seen[0].url, "http://localhost:8000/api/v2/sequence/seq%201?force=true&tag=a%2Cb");
    t.is(seen[0].init.method, "POST");
    t.is(seen[0].init.body, '{"start":true}');
    t.is(response.status, 201);
    t.deepEqual(response.body, { ok: true });
});

test("HTTP client transport preserves raw bodies and existing path query strings", async t => {
    const seen: any[] = [];
    const transport = createHttpClientTransport({
        baseUrl: "http://localhost:8000",
        async fetch(url, init) {
            seen.push({ url, init });
            return {
                status: 202,
                headers: { forEach: callback => callback("text/plain", "content-type") },
                body: "opaque response",
                async json() { return undefined; },
                async text() { return "not used for raw requests"; }
            };
        }
    });
    const body = Buffer.from("opaque request");
    const response = await transport.request({
        route: { id: "PATCH <raw>", method: "patch", path: "/legacy?enabled=true", fullPath: "/legacy?enabled=true", kind: "duplex" },
        raw: true,
        query: { tag: "a" },
        headers: { "content-type": "application/octet-stream" },
        body
    });

    t.is(seen[0].url, "http://localhost:8000/legacy?enabled=true&tag=a");
    t.is(seen[0].init.body, body);
    t.is(response.body, "opaque response");
});

test("HTTP client transport marks raw readable bodies as streaming requests", async t => {
    const seen: any[] = [];
    const transport = createHttpClientTransport({
        baseUrl: "http://localhost:8000",
        async fetch(_, init) {
            seen.push(init);
            return {
                status: 200,
                headers: { forEach: callback => callback("application/octet-stream", "content-type") },
                body: "raw",
                async json() { return undefined; },
                async text() { return "not used for raw requests"; }
            };
        }
    });
    const body = Readable.from([Buffer.from("stream")]);

    await transport.request({
        route: { id: "PUT <raw>", method: "put", path: "/upload", fullPath: "/upload", kind: "duplex" },
        raw: true,
        body
    });

    t.is(seen[0].body, body);
    t.is(seen[0].duplex, "half");
});

test("verser2 client transport delegates to broker request", async t => {
    const manifest = createRouter({ basePath: "/api/v2" }).get("/health").collect();
    const client = createApiClient(manifest, createVerser2ClientTransport({
        async request<T>(request: ApiClientRequest) {
            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    }));

    t.deepEqual((await client.request("GET /api/v2/health")).body, { route: "GET /api/v2/health" });
});

test("client request probe detects request usage", async t => {
    const manifest = createRouter({ basePath: "/api/v2" }).get("/health").collect();
    const probe = createClientRequestProbe({
        async request<T>() {
            return { status: 200, headers: {}, body: {} as T };
        }
    });
    const client = createApiClient(manifest, probe.transport);

    t.throws(() => probe.assertUsed(), { instanceOf: ClientRequestProbeError });
    await client.request("GET /api/v2/health");
    probe.assertUsed();
    t.throws(() => probe.assertNotUsed(), { instanceOf: ClientRequestProbeError });
});
