"use strict";

/** @this {import("@scramjet/types").AppContext}*/
module.exports = async function(_stream) {
    this.logger.info("Aggregation API server started");

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

    await new Promise(res => setTimeout(res, 1000));

    return new Promise((resolve, reject) => {
        if (!this.api.server.listening) {
            reject(new Error("Server not listening"));
        }

        this.logger.info("Aggregation API server listening", this.api.server.address());
    });
};
