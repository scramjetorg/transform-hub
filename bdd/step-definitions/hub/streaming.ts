import { Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import * as http from "http";

/**
 * Streaming HTTP steps for runner-node spawn-isolation regression coverage.
 *
 * These steps use Node's built-in http module instead of the global fetch
 * API (disabled under --no-experimental-fetch). They are intentionally
 * narrow and additive; the broader request/response semantics still live in
 * bdd/step-definitions/hub/config.ts.
 *
 * Two new behaviours are required by the plan:
 *   - assert that a streaming response is observed as multiple chunks
 *     before completion (not the concatenated final body);
 *   - assert that a streaming POST body reaches the handler as multiple
 *     chunks (not one aggregated payload).
 */

interface StreamingChunk {
    text: string;
    bytes: number;
    /** Milliseconds since the request was issued. */
    at: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

When(
    "I send a {string} streaming request to {string} and collect response chunks",
    { timeout: 30000 },
    async function(method: string, path: string) {
        const baseUrl = process.env.LOCAL_HOST_BASE_URL;

        assert.ok(baseUrl, "LOCAL_HOST_BASE_URL is not set");

        const target = new URL(`${baseUrl}${path}`);

        const { status, chunks, text } = await new Promise<{
            status: number;
            chunks: StreamingChunk[];
            text: string;
        }>((resolve, reject) => {
            const req = http.request({
                method,
                hostname: target.hostname,
                port: target.port,
                path: `${target.pathname}${target.search}`
            }, (res) => {
                const decoder = new TextDecoder();
                const start = Date.now();
                const chunks: StreamingChunk[] = [];
                const parts: Buffer[] = [];

                res.on("data", (chunk: Buffer) => {
                    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

                    parts.push(buf);
                    chunks.push({
                        text: decoder.decode(buf, { stream: true }),
                        bytes: buf.byteLength,
                        at: Date.now() - start
                    });
                });

                res.on("error", reject);

                res.on("end", () => {
                    const tail = decoder.decode();

                    if (tail) {
                        chunks.push({ text: tail, bytes: 0, at: Date.now() - start });
                    }

                    resolve({
                        status: res.statusCode ?? 0,
                        chunks,
                        text: Buffer.concat(parts).toString("utf8")
                    });
                });
            });

            req.on("error", reject);
            req.setTimeout(25000, () => { req.destroy(new Error("Request timed out")); });
            req.end();
        });

        this.response = { status };
        this.responseChunks = chunks;
        this.responseText = text;
    }
);

Then(
    "I observe at least {int} streaming response chunks",
    function(expected: number) {
        const chunks = (this.responseChunks as StreamingChunk[] | undefined) ?? [];

        assert.ok(
            chunks.length >= expected,
            `Expected at least ${expected} streamed response chunks but observed ${chunks.length}: ${JSON.stringify(chunks)}`
        );
    }
);

Then(
    "the streamed response body contains {string}",
    function(expected: string) {
        const text = (this.responseText as string | undefined) ?? "";

        assert.ok(
            text.includes(expected),
            `Expected streamed body to contain ${JSON.stringify(expected)}, got ${JSON.stringify(text)}`
        );
    }
);

When(
    "I send a {string} streaming request to {string} with {int} body chunks of {string} every {int} ms",
    { timeout: 30000 },
    async function(method: string, path: string, count: number, payload: string, gapMs: number) {
        const baseUrl = process.env.LOCAL_HOST_BASE_URL;

        assert.ok(baseUrl, "LOCAL_HOST_BASE_URL is not set");

        const target = new URL(`${baseUrl}${path}`);
        // Pad each request body chunk so it exceeds typical OS / proxy
        // small-write coalescing thresholds; without padding ~7-byte chunks
        // are aggregated into a single read on the handler side.
        const padding = " ".repeat(65536);

        const responseText: string = await new Promise<string>((resolve, reject) => {
            const req = http.request({
                method,
                hostname: target.hostname,
                port: target.port,
                path: `${target.pathname}${target.search}`,
                headers: {
                    "Content-Type": "text/plain",
                    "Transfer-Encoding": "chunked"
                }
            }, (res) => {
                this.response = {
                    status: res.statusCode ?? 0,
                    headers: res.headers
                };
                const parts: Buffer[] = [];

                res.on("data", (c: Buffer) => parts.push(c));
                res.on("end", () => resolve(Buffer.concat(parts).toString("utf8")));
                res.on("error", reject);
            });

            req.on("error", reject);

            // Wait until the underlying socket is connected before writing any
            // body chunks - otherwise http.ClientRequest queues every write
            // into outputData and flushes them all at once on connect, which
            // makes the upstream see one coalesced read regardless of any
            // inter-chunk delay we await on the client side.
            const socketReady = new Promise<void>((r) => {
                req.once("socket", (s) => {
                    if (typeof s.setNoDelay === "function") s.setNoDelay(true);
                    if ((s as { connecting?: boolean }).connecting) {
                        s.once("connect", () => r());
                    } else {
                        r();
                    }
                });
            });

            req.flushHeaders();

            (async () => {
                await socketReady;
                for (let i = 0; i < count; i++) {
                    await new Promise<void>((r) => req.write(`${payload}${i}${padding}\n`, () => r()));
                    if (gapMs > 0 && i + 1 < count) {
                        await sleep(gapMs);
                    }
                }
                req.end();
            })().catch(reject);
        });

        this.responseText = responseText;
    }
);

Then(
    "the response body reports at least {int} request body chunks",
    function(expected: number) {
        const text = (this.responseText as string | undefined) ?? "";
        const match = text.match(/chunks=(\d+)/);

        assert.ok(match, `Expected response body to contain "chunks=<n>", got ${JSON.stringify(text)}`);

        const observed = parseInt(match[1], 10);

        assert.ok(
            observed >= expected,
            `Expected handler to observe at least ${expected} request body chunks, got ${observed} (response: ${text})`
        );
    }
);
