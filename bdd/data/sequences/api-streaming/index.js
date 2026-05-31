"use strict";

const { setTimeout: sleep } = require("node:timers/promises");
const fs = require("node:fs");

const debugLog = (msg) => {
    try { fs.appendFileSync("/tmp/api-streaming-debug.log", `${Date.now()} ${msg}\n`); } catch {}
};

/**
 * BDD fixture: exposes streaming GET and POST endpoints for the
 * runner-node spawn-isolation regression scenarios:
 *   "Exposed sequence API streams response chunks"
 *   "Exposed sequence API request body streams into the handler".
 *
 * Routes (registered under the package exposePath "/streaming"):
 *
     * GET /stream-out
     *   Writes 4 separate "chunk-N\n" frames spaced by 250ms, then ends with
     *   "end\n". Each frame is padded to ~1KB and the response socket has
     *   Nagle's algorithm disabled so the host -> client hop forwards every
     *   write as its own TCP segment. Clients reading the response body
     *   chunk-by-chunk must see multiple distinct chunks BEFORE the response
     *   completes.
 *
 * POST /stream-in
 *   Counts request "data" events from the incoming body stream and
 *   replies with `chunks=<count> sizes=<comma-separated byte sizes>` so
 *   the BDD harness can assert that the handler observed multiple
 *   request body chunks instead of one aggregated payload.
 *
 * @this {import("@scramjet/types").AppContext}
 */
module.exports = async function(_input) {
    this.logger.info("api-streaming sequence started");

    this.api.use("/stream-out", async (req, res) => {
        if (req.method !== "GET") {
            res.writeHead(405).end("Method Not Allowed");
            return;
        }

        // Disable Nagle on this response socket so each res.write() is sent
        // as its own TCP segment instead of being coalesced with the next
        // one. Without this, two TCP hops (host proxy -> client) can hide
        // the per-chunk boundaries inside the OS send buffer.
        if (res.socket && typeof res.socket.setNoDelay === "function") {
            res.socket.setNoDelay(true);
        }

        res.writeHead(200, {
            "Content-Type": "text/plain",
            "Transfer-Encoding": "chunked",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no"
        });

        // Force the headers down the wire before the first body chunk so the
        // client sees the response start immediately.
        if (typeof res.flushHeaders === "function") {
            res.flushHeaders();
        }

        // Each chunk is padded so it exceeds the typical OS send buffer
        // threshold and the proxy hop forwards it immediately instead of
        // waiting to fill a larger TCP segment.
        const padding = " ".repeat(65536);

        for (let i = 0; i < 4; i++) {
            res.write(`chunk-${i}${padding}\n`);
            // eslint-disable-next-line no-await-in-loop
            await sleep(250);
        }

        res.end("end\n");
    });

    this.api.use("/stream-in", (req, res) => {
        if (req.method !== "POST") {
            res.writeHead(405).end("Method Not Allowed");
            return;
        }

        let count = 0;
        const sizes = [];
        const startedAt = Date.now();

        debugLog(`stream-in: handler invoked, headers=${JSON.stringify(req.headers)}`);
        req.on("data", (chunk) => {
            count++;
            sizes.push(Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk));
            debugLog(`stream-in: data event at=${Date.now() - startedAt} size=${sizes[sizes.length - 1]}`);
        });
        req.on("end", () => {
            debugLog(`stream-in: end at=${Date.now() - startedAt} count=${count}`);
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end(`chunks=${count} sizes=${sizes.join(",")}`);
        });
        req.on("error", (e) => {
            try {
                res.writeHead(500).end("err: " + e.message);
            } catch {
                /* ignore */
            }
        });
    });

    // Keep the sequence alive so the api server stays listening for requests.
    return new Promise(() => { /* never resolve */ });
};
