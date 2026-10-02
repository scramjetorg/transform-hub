"use strict";
const { createServer } = require("http");

/** @this {import("@scramjet/sequence-types").SequenceAppContext}*/
module.exports = async function(_stream) {
    this.logger.info("Aggregation API server started");
    const rpcArrivals = [];
    const heldResponses = new Map();
    let holdRpcResponses = false;
    const observerPort = Number(this.config && this.config.rpcObserverPort);
    const observer = createServer(async (req, res) => {
        if (req.url === "/receipts" && req.method === "GET") {
            res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(rpcArrivals));
            return;
        }
        if (req.url === "/gate" && req.method === "POST") {
            let body = "";
            for await (const chunk of req) body += chunk;
            holdRpcResponses = body === "hold";
            if (!holdRpcResponses) {
                for (const release of heldResponses.values()) release();
                heldResponses.clear();
            }
            res.writeHead(200).end(holdRpcResponses ? "holding" : "released");
            return;
        }
        res.writeHead(404).end("not found");
    });
    if (Number.isInteger(observerPort) && observerPort > 0) {
        observer.listen(observerPort, "127.0.0.1");
        this.api.server.once("close", () => observer.close());
    }

    const readBody = async (req) => {
        let body = "";

        req.setEncoding("utf8");
        for await (const chunk of req) {
            body += chunk;
        }

        return body;
    };

    this.api.server.on("request", (req, res) => {
        console.log("Aggregation API request", req.method, req.url);
        this.logger.info("Aggregation API request", req.method, req.url);
    });

    this.api.use("/abc", async (req, res) => {
        this.logger.info("Aggregation API /abc", req.method, req.url, req.body);

        try {
            switch (req.method) {
                case "GET":
                    res.writeHead(200).end("GET /abc");
                    break;
                case "POST": {
                    const body = await readBody(req);

                    res.writeHead(200).end(`POST /abc ${body}`);
                    break;
                }
                case "DELETE":
                    res.writeHead(200).end("DELETE /abc");
                    break;
                default:
                    res.writeHead(405).end("Method Not Allowed");
            }
        } catch (e) {
            console.error(e);
            res.writeHead(500).end(`Internal Server Error\n\n${e.stack}\n`);
        }
    });

    this.api.use("/call-target", async (req, res) => {
        this.logger.info("Aggregation API /call-target", req.method, req.url);

        try {
            const url = new URL(req.url, "http://sequence.local");
            const sourceHub = url.searchParams.get("sourceHub");
            const targetHub = url.searchParams.get("targetHub");
            const targetInstance = url.searchParams.get("targetInstance");

            if (!sourceHub || !targetHub || !targetInstance) {
                res.writeHead(400).end("Missing sourceHub, targetHub, or targetInstance");
                return;
            }

            const body = await readBody(req);
            const rpc = this.space
                .getHostClient(targetHub)
                .getInstanceClient(targetInstance)
                .getRPCClient();
            const targetResponse = await rpc.post(
                "test/abc",
                body,
                { headers: { "Content-Type": "text/plain" } },
                { parse: "text", json: false }
            );

            res.writeHead(200).end(targetResponse);
        } catch (e) {
            console.error(e);
            res.writeHead(500).end(`Internal Server Error\n\n${e.stack}\n`);
        }
    });

    // Side-effect-free route used only to prove source-sequence -> Manager ->
    // target-Hub readiness before an asserted POST call-target request.
    this.api.use("/call-target-ready", async (req, res) => {
        try {
            const url = new URL(req.url, "http://sequence.local");
            const targetHub = url.searchParams.get("targetHub");
            const targetInstance = url.searchParams.get("targetInstance");
            if (!targetHub || !targetInstance) {
                res.writeHead(400).end("Missing targetHub or targetInstance");
                return;
            }

            const rpc = this.space
                .getHostClient(targetHub)
                .getInstanceClient(targetInstance)
                .getRPCClient();
            const targetResponse = await rpc.request("GET", "test/abc");
            const targetBody = await targetResponse.text();
            if (targetResponse.status === 200 && targetBody === "GET /abc") {
                res.writeHead(200).end(targetBody);
            } else if (targetResponse.status === 404 || targetResponse.status === 503) {
                res.writeHead(targetResponse.status).end(targetBody);
            } else {
                res.writeHead(targetResponse.status || 500).end(targetBody || "Target readiness probe failed");
            }
        } catch (e) {
            console.error(e);
            const code = e?.code;
            const status = code === "ECONNREFUSED" || code === "ECONNRESET" || code === "ETIMEDOUT" ? 503 : 500;
            res.writeHead(status).end(`${e.message || e}`);
        }
    });

    if (Number.isInteger(observerPort) && observerPort > 0) {
        this.api.use("/rpc", async (req, res) => {
            const url = new URL(req.url, "http://sequence.local");
            const requestPath = decodeURIComponent(url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname);
            const id = requestPath.startsWith("rpc/") ? requestPath.slice(4) : requestPath;
            const body = await readBody(req);
            rpcArrivals.push({ id, body });
            const finish = () => res.writeHead(200, { "content-type": "text/plain" }).end(`receipt:${id}:${body}`);
            if (holdRpcResponses) {
                heldResponses.set(id, finish);
                return;
            }
            finish();
        });
    }

    if (!this.api.server.listening) {
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Aggregation API server did not become ready within 10000ms")), 10_000);
            this.api.server.once("listening", () => {
                clearTimeout(timer);
                resolve();
            });
        });
    }

    return new Promise((resolve, reject) => {
        if (!this.api.server.listening) {
            reject(new Error("Server not listening"));
        }

        this.logger.info("Aggregation API server listening", this.api.server.address());
    });
};
