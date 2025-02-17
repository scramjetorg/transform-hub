"use strict";

const { PassThrough } = require("stream");

/** @this {import("@scramjet/types").AppContext<any, any>} */
module.exports = function(_stream, ...args) {
    this.api.use("/abc", (req, res) => {
        switch (req.method) {
            case "GET":
                res.writeHead(200).end("GET /abc");
                break;
            case "POST":
                let body = "";
                
                for (const chunk of req) {
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
    });

    return new Promise((resolve, reject) => {
        if (!this.api.server.listening) {
            reject(new Error("Server not listening"));
        }
    });
};
