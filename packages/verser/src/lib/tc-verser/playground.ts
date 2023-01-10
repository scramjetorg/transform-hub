/*eslint no-unused-vars: ["error", { "args": "none" }]*/

import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { IncomingMessage, ServerResponse, createServer, request } from "http";
import { DataStream } from "scramjet";
import { FrameTarget } from "./utils";
import { FrameDecoder, FrameEncoder } from "./codecs";

(async () => {
    const logger = new ObjLogger("Sandbox");

    logger.pipe(new DataStream().map(prettyPrint({ colors: true }))).pipe(process.stdout);

    const PORT = 6660;
    const server = createServer();

    server.setTimeout(0);
    server.requestTimeout = 0;

    server.on("request", (req: IncomingMessage, res: ServerResponse) => {
        res.socket!.setNoDelay(true);

        res.writeHead(200, { "Content-Type": "application/octet-stream", "Transfer-Encoding" : "chunked" });
        res.flushHeaders();

        logger.debug("on request");

        const serverFrameEncoder = new FrameEncoder(FrameTarget.API, { encoding: undefined }, { name: "ServerEncoder"});
        serverFrameEncoder.logger.pipe(logger);

        serverFrameEncoder.pipe(res);
        let i = 0;

        req.on("pause", () => { logger.warn("Request paused") });

        const serverFrameDecoder = new FrameDecoder({ highWaterMark: 60 * 1024, encoding: undefined, emitClose: false }, { name: "ServerDecoder"});
        serverFrameDecoder.logger.pipe(logger);

        req.pipe(serverFrameDecoder).pipe(process.stdout);

        serverFrameDecoder.on("data", (d: any) => {
            logger.debug(`Server on request data [${i++}]`, JSON.parse(d).chunk, d.length);
            serverFrameEncoder.write(Buffer.from(new Uint8Array([255, 255, 255, 255])));
        })
    });

    server.listen(PORT);

    const req = request({
        hostname: "0.0.0.0",
        port: PORT,
        headers: { "Content-Type": "application/octet-stream", "Transfer-Encoding": "chunked" }
    });


    req.on("response", (response) => {
        req.socket!.setNoDelay(true);

        logger.debug("Response");

        let i = 0;
        let m = 0;

        const frameEncoder = new FrameEncoder(FrameTarget.API, { encoding: undefined, emitClose: false }, { name: "RequestEncoder"});
        frameEncoder.logger.pipe(logger);

        frameEncoder.pipe(req);

        const responseFrameDecoder = new FrameDecoder({ highWaterMark: 60 * 1024, encoding: undefined, emitClose: false }, { name: "RequestDecoder"});

        responseFrameDecoder.logger.pipe(logger);

        response.pipe(
            responseFrameDecoder
        ).on("data", (d) => {
            logger.debug(`Echo from server [${i++}]`, JSON.parse(d).chunk, d.length);
        });

        response.on("data", (d) => console.log("plain response", d));

        req.on("error", (err) => {
            console.error(err);
        });

        setInterval(async () => {
            logger.debug(`Writing [${++m}]..`);

            frameEncoder.write(Buffer.from(new Uint8Array([0x61, 0x62, 0x63, 0x64])));
        }, 500);
    });

    req.flushHeaders();

    await new Promise((_res, _rej) => {});
})();
