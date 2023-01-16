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

        socket
            .on("data", (data) => {
                console.log("SERVER socket ondata", data);
                console.log("SOCKET TX RX", socket.bytesWritten, socket.bytesRead)
            })
            .on("pause", () => {
                logger.info("Socket paused");
            })
            .on("resume", () => {
                logger.info("Socket resumed");
            })

        const tcmux = new TeceMux(socket, "Server")
            .on("error", (err) => {
                logger.error("TCMUX err", err);
            });



        tcmux.logger.pipe(logger);

        const channel = tcmux.multiplex();

        req.on("pause", () => { logger.warn("Request paused"); });

        logger.warn("Waiting for stdin...");

        process.stdin.pipe(channel);

        const somePayload = "smth\n";
        logger.info("writing some payload to channel", somePayload);
        channel.write(somePayload);

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

    const reqLogger = new ObjLogger("Req", { id: "Client"});
    reqLogger.pipe(logger);

    socket.write("CONNECT HTTP/1.1\r\n\r\n\r\n");

    socket.on("error", (error) => {
        reqLogger.error("ERROR", error);
    });

    reqLogger.info('connected to server!');

    const tcmux = new TeceMux(socket, "Request");

    tcmux.logger.updateBaseLog({ id: reqLogger.baseLog.id });

    tcmux.logger.pipe(logger);

    tcmux.on("channel", async (channel: TeceMuxChannel) => {
        reqLogger.debug("New channel", channel._id);

        // for await (const chunk of channel) {
        //     reqLogger.info("Data from server", chunk.toString());

        //     await new Promise<void>((resolve, reject) => {
        //         setTimeout(() => {
        //             //channel.encoder.write("Echo\n");
        //             resolve();
        //         }, 2000);
        //     });
        // }

        channel.on("data", async (chunk) => {
            reqLogger.info("SERVER->CLIENT->CHANNEL", chunk.toString());

            await new Promise<void>((resolve, reject) => {
                setTimeout(() => {
                    //channel.encoder.write("Echo\n");
                    resolve();
                }, 2000);
            });
        })
    });

    socket.on("error", (err) => {
        console.error(err);
    });

    await new Promise((_res, _rej) => {});
})();
