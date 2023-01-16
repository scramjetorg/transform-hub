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
        //channel.write("som\n");


        process.stdout.pipe(channel);


        for await (const chunk of channel) {
            const parsed = JSON.parse(chunk) as FrameData;
            logger.debug(`Server on request data [C: ${parsed.sequenceNumber}, SN: ${parsed.sequenceNumber}]`, parsed.chunk, parsed.dataLength);
        };
    });

    server.listen(PORT, "0.0.0.0");

    /**********************************************/
    /* CLIENT
    /**********************************************/

    const socket = createConnection({ port: PORT, allowHalfOpen: true, host: "0.0.0.0" }, () => {});

    socket.setNoDelay(true);

    const reqLogger = new ObjLogger("Req", { id: "Client Side"});
    reqLogger.pipe(logger);


    socket.write("CONNECT HTTP/1.1\r\n\r\n\r\n");

    socket.on("error", (error) => {
        reqLogger.error("ERROR", error);
    });

    reqLogger.info('connected to server!');

    const tcmux = new TeceMux(socket, "Request");

    tcmux.logger.updateBaseLog({ id: "Client side"});

    tcmux.logger.pipe(logger);

    tcmux.on("channel", async (channel: TeceMuxChannel) => {
        reqLogger.debug("New channel", channel._id);

        for await (const chunk of channel) {
            reqLogger.info("Data from server", chunk.toString());
        }
    });

    socket.on("error", (err) => {
        console.error(err);
    });

    await new Promise((_res, _rej) => {});
})();
