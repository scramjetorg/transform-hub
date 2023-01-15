/*eslint no-unused-vars: ["error", { "args": "none" }]*/
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-console */

import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { IncomingMessage, createServer, request } from "http";
import { DataStream } from "scramjet";
import { FrameData } from "./utils";

import { Socket } from "net";
import { TeceMux, TeceMuxChannel } from "./tecemux";

(async () => {
    const logger = new ObjLogger("Sandbox");

    logger.pipe(new DataStream().map(prettyPrint({ colors: true }))).pipe(process.stdout);

    const PORT = 6660;
    const server = createServer();

    server.setTimeout(0);
    server.requestTimeout = 0;

    server.on("connect", async (req: IncomingMessage, socket: Socket) => {
        //socket.setNoDelay(true);
        //socket.write(`HTTP/1.1 ${200} \r\n\r\n`);
        socket.write('HTTP/1.1 200 Connection Established\r\n' +
        'Proxy-agent: Node.js-Proxy\r\n' +
        '\r\n');
        logger.debug("on connect");
        socket.write("dddd\r\n");
        //socket.pipe(process.stdout)

        const tcmux = new TeceMux(socket, "Server Side");
        tcmux.on("error", (err) => {
            logger.error("TCMUX err", err);
        });

        tcmux.logger.pipe(logger);

        const channel = tcmux.multiplex();

        let i = 0;

        req.on("pause", () => { logger.warn("Request paused"); });

        setInterval(() => {
            logger.warn("writing to server response")
            channel.write("som\n");
        }, 250)

        for await (const chunk of channel) {
            const parsed = JSON.parse(chunk) as FrameData;
            logger.debug(`Server on request data [${i++}]`, parsed.chunk, parsed.dataLength);

            channel.write(new Uint8Array([1,2,3,4]));
            //channel.write(Buffer.from(new Uint8Array([255, 255, 255, 255])));
        };
    });

    server.listen(PORT);

    const req = request({
        hostname: "0.0.0.0",
        method: "connect",
        port: PORT,
        headers: { "Content-Type": "application/octet-stream", "Transfer-Encoding": "chunked" }
    });

    req.on("connect", (response, socket, head) => {
        const reqLogger = new ObjLogger("Req", { id: "Request"});
        reqLogger.pipe(logger);


        //socket.setNoDelay(true);

        reqLogger.debug("Response. Head:", head.toString());

        let i = 0;
        let m = 0;
        response.on("data", (d) => {
            console.log("req data in", d);
        }).pause();


        const tcmux = new TeceMux(socket);

        socket.resume();
        tcmux.logger.updateBaseLog({ id: "Client side"});

        tcmux.logger.pipe(logger);

        tcmux.on("channel", (channel: TeceMuxChannel) => {
            reqLogger.debug("New channel", channel._id);
            channel.pipe(process.stdout);

            setInterval(async () => {
                reqLogger.debug(`Writing [${++m}]..`);

                channel.write(Buffer.from(new Uint8Array([0x61, 0x62, 0x63, 0x64])));
            }, 500);
        });
        /*setInterval(async () => {
            reqLogger.debug(`Writing [${++m}]..`);
            tcmux.multiplex().write(Buffer.from(new Uint8Array([0x61, 0x62, 0x63, 0x64])));
        }, 250);*/
        req.on("error", (err) => {
            console.error(err);
        });
    });

    req.flushHeaders();

    await new Promise((_res, _rej) => {});
})();
