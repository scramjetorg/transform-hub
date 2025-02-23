"use strict";

/** @this {import("@scramjet/types").AppContext}*/
module.exports = async function(_stream) {
    this.logger.info("API server started");

    this.api.server.on("request", (req, res) => {
        console.log("API request", req.method, req.url);
        this.logger.info("API request", req.method, req.url);
    });

    this.api.use("/abc", async (req, res) => {
        this.logger.info("API /abc", req.method, req.url, req.body);

        try {

            switch (req.method) {
                case "GET":
                    res.writeHead(200).end("GET /abc");
                    break;
                case "POST":
                    let body = "";
                    req.setEncoding("utf8");
                    for await (const chunk of req) {
                        body += chunk;
                    }

                    res.writeHead(200).end(`POST /abc ${body}`);
                    break;
                case "DELETE":
                    res.writeHead(200).end("DELETE /abc");
                    break;
                default:
                    res.writeHead(405).end("Method Not Allowed");
            }

        } catch(e) {
            console.error(e);

            res.writeHead(500).end("Internal Server Error\n\n" + e.stack + "\n");
        }
    });

    await new Promise(res => setTimeout(res, 1000));

    return new Promise((resolve, reject) => {
        if (!this.api.server.listening) {
            reject(new Error("Server not listening"));
        }

        this.logger.info(`API server listening`, this.api.server.address());
    });
};
