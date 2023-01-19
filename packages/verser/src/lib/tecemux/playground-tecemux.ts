/*eslint no-unused-vars: ["error", { "args": "none" }]*/
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-console */

import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { IncomingMessage, createServer } from "http";
import { DataStream } from "scramjet";

import { Socket, createConnection } from "net";
import { TeceMux, TeceMuxChannel } from "./tecemux";

(async () => {
    const logger = new ObjLogger("Sandbox");

    logger.pipe(new DataStream().map(prettyPrint({ colors: true }))).pipe(process.stdout);

    /**********************************************/
    /* SERVER
    /**********************************************/

    const PORT = 6660;
    const server = createServer({});

    server.on("timeout", (socket) => {
        logger.warn("Server on timeout");
    });
    server.requestTimeout = 0;

    server.on("connect", async (req: IncomingMessage, socket: Socket) => {
        socket.setNoDelay(true);

        logger.info("Incoming request", req.method, req.headers);

        socket
            .on("pipe", () => {
                logger.info("Carrier Socket piped");
            })
            .on("unpipe", () => {
                logger.info("Carrier Socket unpiped");
            })
            .on("pause", () => {
                //socket.resume();
                logger.fatal("Carrier Socket paused");
                //debugger;
            })
            .on("resume", () => {
                logger.info("Carrier Socket resumed");
            })
            .on("error", (error) => {
                logger.error("Carrier Socket error", error);
            })
            .on("close", () => {
                logger.info("Carrier Socket closed");
            })
            .on("timeout", () => {
                logger.info("Carrier Socket timeout");
            })
            .pause()

        const tcmux = new TeceMux(socket, "Server")
            .on("error", (err) => {
                logger.error("TCMUX err", err);
            });

        tcmux.logger.pipe(logger);

        const channel1 = tcmux.multiplex();
        const channel2 = tcmux.multiplex();

        req.on("pause", () => { logger.warn("Request paused"); });

        logger.warn("Waiting for stdin...");

        DataStream.from(process.stdin).filter((x: Buffer) => !(parseInt(x[0].toString()) % 2)).pipe(channel1);
        DataStream.from(process.stdin).filter((x: Buffer) => !!(parseInt(x[0].toString()) % 2)).pipe(channel2);

        (async () => {
            for await (const chunk of channel1) {
                logger.debug(`reading CHANNEL1 chunk`, chunk.toString());
            };
        })();

        (async () => {
            for await (const chunk of channel2) {
                logger.debug(`reading CHANNEL2 chunk`, chunk.toString());
            };
        })();
    });

    server.listen(PORT, "0.0.0.0");

    /**********************************************/
    /* CLIENT
    /**********************************************/

    const socket = createConnection({ port: PORT, allowHalfOpen: true, host: "0.0.0.0" }, () => {});

    await new Promise((resolve, reject) => {
        socket
            .on("connect", resolve)
            .on("error", reject);
    });

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

        for await (const chunk of channel) {
            reqLogger.info("SERVER->CLIENT->CHANNEL", channel._id, chunk.toString());

            await new Promise<void>((resolve, reject) => {
                setTimeout(() => {
                    channel.write("abcde\n");
                    resolve();
                }, 2000);
            });
        }
    });

    socket.on("error", (err) => {
        console.error(err);
    });

    await new Promise((_res, _rej) => {});
})();
