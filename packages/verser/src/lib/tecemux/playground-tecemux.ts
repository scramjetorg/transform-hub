/*eslint no-unused-vars: ["error", { "args": "none" }]*/
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-console */

import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { IncomingMessage, createServer } from "http";
import { DataStream } from "scramjet";

import { Socket, createConnection } from "net";
import { TeceMux, TeceMuxChannel } from "./tecemux";
import { FrameData } from "./utils";

(async () => {
    const logger = new ObjLogger("Sandbox");

    logger.pipe(new DataStream().map(prettyPrint({ colors: true }))).pipe(process.stdout);

    /**********************************************/
    /* SERVER
    /**********************************************/

    const PORT = 6660;
    const server = createServer();

    server.setTimeout(0);
    server.requestTimeout = 0;

    server.on("connect", async (req: IncomingMessage, socket: Socket) => {
        socket.setNoDelay(true);

        logger.info("Incoming request", req.method, req.headers);

        const tcmux = new TeceMux(socket, "Server Side")
            .on("error", (err) => {
                logger.error("TCMUX err", err);
            });

        tcmux.logger.pipe(logger);

        const channel = tcmux.multiplex();

        req.on("pause", () => { logger.warn("Request paused"); });

        logger.warn("writing to server response")
        channel.write("som\n");

        for await (const chunk of channel) {
            const parsed = JSON.parse(chunk) as FrameData;
            logger.debug(`Server on request data [C: ${parsed.sequenceNumber}, SN: ${parsed.sequenceNumber}]`, parsed.chunk, parsed.dataLength);

            //channel.write(new Uint8Array([1,2,3,4]));
            //channel.write(Buffer.from(new Uint8Array([255, 255, 255, 255])));
        };
        /*
        channel.on("data", (d) => {
            logger.error("Server on request data", d);
        });
        */

        //channel.pipe(process.stdout);
    });

    server.listen(PORT, "0.0.0.0");

    /**********************************************/
    /* CLIENT
    /**********************************************/

    const socket = createConnection({ port: PORT, allowHalfOpen: true, host: "0.0.0.0" }, () => {});

    socket.setNoDelay(true);

    const reqLogger = new ObjLogger("Req", { id: "Request"});
    reqLogger.pipe(logger);


    socket.write("CONNECT HTTP/1.1\r\n\r\n\r\n");

    socket.on("error", (error) => {
        reqLogger.error("ERROR", error);
    });

    reqLogger.info('connected to server!');

    const tcmux = new TeceMux(socket);

    tcmux.logger.updateBaseLog({ id: "Client side"});

    tcmux.logger.pipe(logger);

    tcmux.on("channel", async (channel: TeceMuxChannel) => {
        reqLogger.debug("New channel", channel._id);

        //channel.write(Buffer.from(new Uint8Array([0x61, 0x62, 0x63, 0x64])));
        channel.pipe(process.stdout);

        for await (const chunk of channel) {
            reqLogger.info("request on response data", chunk);
        }
    });
    /*setInterval(async () => {
        reqLogger.debug(`Writing [${++m}]..`);
        tcmux.multiplex().write(Buffer.from(new Uint8Array([0x61, 0x62, 0x63, 0x64])));
    }, 250);*/
    socket.on("error", (err) => {
        console.error(err);
    });


    //socket.flushHeaders();

    await new Promise((_res, _rej) => {});
})();
