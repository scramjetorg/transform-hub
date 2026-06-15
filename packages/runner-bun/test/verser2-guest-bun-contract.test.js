import { EventEmitter } from "events";
import { describe, expect, mock, test } from "bun:test";

let capturedNodeHandler;

mock.module("@signicode/verser2-guest-node", () => ({
    createVerserNodeGuest: () => ({
        connected: false,
        attach(handler) {
            capturedNodeHandler = handler;
            return this;
        },
        async connect() {},
        async close() {},
        onLifecycle() {
            return () => undefined;
        },
    }),
    createVerserBroker: () => ({
        createFetch() {
            return fetch;
        },
    }),
}));

const { createVerserBunGuest } = await import("@signicode/verser2-guest-bun");

function attachHandler(handler) {
    capturedNodeHandler = undefined;
    createVerserBunGuest({ hostUrl: "https://verser2.example", guestId: "runner.inst.guest" })
        .attach(handler, "runner.inst.scramjet.internal");
    expect(typeof capturedNodeHandler).toBe("function");
    return capturedNodeHandler;
}

async function dispatch(handler, { method = "GET", url = "/", chunks = [] } = {}) {
    const request = new EventEmitter();
    request.method = method;
    request.url = url;
    request.headers = { "content-type": "application/octet-stream" };

    const response = {
        statusCode: 0,
        headers: undefined,
        chunks: [],
        ended: false,
        writeHead(status, headers) {
            this.statusCode = status;
            this.headers = headers;
        },
        write(chunk) {
            this.chunks.push(Buffer.from(chunk));
        },
        end(chunk) {
            if (chunk !== undefined) {
                this.write(chunk);
            }
            this.ended = true;
            this.resolve?.();
        },
    };

    const done = new Promise(resolve => { response.resolve = resolve; });
    handler(request, response);

    for (const chunk of chunks) {
        request.emit("data", chunk);
    }
    request.emit("end");

    await done;
    return response;
}

describe("@signicode/verser2-guest-bun route contract", () => {
    test("matches routes by exact, param, wildcard, then fetch fallback precedence", async () => {
        const handler = attachHandler({
            routes: {
                "/items/static": () => new Response("exact"),
                "/items/:id": request => new Response(`param:${request.params.id}`),
                "/items/*": request => new Response(`wildcard:${request.params["*"]}`),
            },
            fetch: () => new Response("fallback"),
        });

        expect(Buffer.concat((await dispatch(handler, { url: "/items/static" })).chunks).toString()).toBe("exact");
        expect(Buffer.concat((await dispatch(handler, { url: "/items/abc%20123" })).chunks).toString()).toBe("param:abc 123");
        expect(Buffer.concat((await dispatch(handler, { url: "/items/a/b" })).chunks).toString()).toBe("wildcard:a/b");
        expect(Buffer.concat((await dispatch(handler, { url: "/other" })).chunks).toString()).toBe("fallback");
    });

    test("streams binary request bodies and response bodies through fetch handlers", async () => {
        const handler = attachHandler({
            fetch: async request => {
                const body = new Uint8Array(await request.arrayBuffer());

                return new Response(new ReadableStream({
                    start(controller) {
                        controller.enqueue(body.slice(0, 2));
                        controller.enqueue(body.slice(2));
                        controller.close();
                    },
                }), {
                    status: 202,
                    headers: { "content-type": "application/octet-stream" },
                });
            },
        });
        const payload = Buffer.from([0, 255, 1, 254]);
        const response = await dispatch(handler, { method: "POST", url: "/binary", chunks: [payload.subarray(0, 2), payload.subarray(2)] });

        expect(response.statusCode).toBe(202);
        expect(Buffer.concat(response.chunks)).toEqual(payload);
    });

    test("does not rely on WebSocket upgrade support", async () => {
        let upgradeResult;
        const handler = attachHandler({
            routes: {
                "/upgrade": (_request, server) => {
                    upgradeResult = server.upgrade(new Request("http://runner.inst.scramjet.internal/upgrade"));
                    return new Response("upgrade-disabled");
                },
            },
        });

        const response = await dispatch(handler, { url: "/upgrade" });

        expect(upgradeResult).toBe(false);
        expect(Buffer.concat(response.chunks).toString()).toBe("upgrade-disabled");
    });
});
