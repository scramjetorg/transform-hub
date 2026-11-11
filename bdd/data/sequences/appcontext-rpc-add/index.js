"use strict";

module.exports = async function appcontextRpcAdd() {
    this.api.create("/add", async (request, response) => {
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const { a, b } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ result: a + b }));
    });

    await new Promise(() => undefined);
};
