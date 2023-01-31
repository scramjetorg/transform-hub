/*eslint no-unused-vars: ["error", { "args": "none" }]*/
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-console */

import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { IncomingMessage, createServer } from "http";
import { DataStream } from "scramjet";

import { Socket, createConnection } from "net";
import { TeceMux } from "./tecemux";
import { TeceMuxChannel } from "./types";
import { createReadStream, createWriteStream } from "fs";
import path from "path";

(async () => {
    const logger = new ObjLogger("Sandbox");

    logger
        .pipe(
            new DataStream()
                .map(prettyPrint({ colors: true }))
                .map((chunk: string) =>
                    chunk.replace(
                        /(:?FIN|SYN|RST|PSH|ACK|URG|ECE|CWR)|^$]/,
                        "\x1b[41m\$&\x1b[0m"
                    )
                )
        )
        .pipe(process.stdout);

    /**********************************************/
    /* SERVER
    /**********************************************/

    const PORT = 6660;
    const server = createServer({});

    server.on("timeout", (_socket) => {
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
            .on("unpipe", (c: any) => {
                logger.info("Carrier Socket unpiped", c);
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
            });

        const tcmux = new TeceMux(socket, "Server")
            .on("error", (err) => {
                logger.error("TCMUX err", err);
            });

        tcmux.logger.pipe(logger);

        const channel1 = tcmux.multiplex();
        //const channel2 = tcmux.multiplex();

        channel1.pipe(createWriteStream(path.join(__dirname, "output-server.tar.gz")));

        createReadStream(path.join(__dirname, "../../../../forever.tar.gz"))
            .on("end", () => {
                logger.info("FILE END");
            })
            .pipe(channel1);

        //Readable.from(Buffer.alloc(1024 * 100)).pipe(channel1, { end: false });

        req.on("pause", () => { logger.warn("Request paused"); });

        //logger.warn("Waiting for stdin...");

        //DataStream.from(process.stdin).filter((x: Buffer) => !(parseInt(x[0].toString(), 10) % 2)).pipe(channel1);
        //DataStream.from(process.stdin).filter((x: Buffer) => !!(parseInt(x[0].toString(), 10) % 2)).pipe(channel2);
        /*
        (async () => {
            try {
                for await (const chunk of channel1) {
                    console.log("CHUNK", chunk);
                    logger.debug("reading CHANNEL1 chunk", chunk.toString());
                }
            } catch (error) {
                logger.error("reading CHANNEL1 ERROR", error);
            }

            logger.debug("reading CHANNEL1 END");
        })();
*/
        // (async () => {
        //     try {
        //         for await (const chunk of channel2) {
        //             logger.debug("reading CHANNEL2 chunk", chunk.toString());
        //         }
        //     } catch (error) {
        //         logger.error("reading CHANNEL2 ERROR", error);
        //     }

        //     logger.debug("reading CHANNEL2 END");
        // })();

        /*
        setTimeout(() => {
            console.log("\n\n\n\n");
            logger.trace("Ending channels");
            channel1.push(null);
            //channel2.end();
        }, 4000);
        */
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

    const reqLogger = new ObjLogger("Req", { id: "Client" });

    reqLogger.pipe(logger);

    socket.write("CONNECT HTTP/1.1\r\n\r\n\r\n");

    socket.on("error", (error) => {
        reqLogger.error("ERROR", error);
    });

    reqLogger.info("connected to server!");

    const tcmux = new TeceMux(socket, "Request");

    tcmux.logger.updateBaseLog({ id: reqLogger.baseLog.id });

    tcmux.logger.pipe(logger);

    tcmux.on("channel", async (channel: TeceMuxChannel) => {
        reqLogger.debug("New channel", channel._id);

        channel
            .on("finish", () => {
                tcmux.logger.info("Channel finish", channel._id);
            })
            .on("end", () => {
                tcmux.logger.info("Channel readable end", channel._id, channel.readableEnded, channel.writableEnded);
            });

        createReadStream(path.join(__dirname, "../../../../forever.tar.gz")).pipe(channel, { end: false });
        channel.pipe(createWriteStream(path.join(__dirname, "output-client.tar.gz")));

        let total = 0;

        channel
            .on("data", (d) => {
                total += d.length;
                tcmux.logger.info("-------------------- data", channel._id, d.length, total);
            })
            .on("pause", () => {
                tcmux.logger.info("-------------------- paused", channel._id);
            })
            .on("resume", () => {
                tcmux.logger.info("-------------------- resumed", channel._id);
            });
    });

    socket.on("error", (err) => {
        console.error(err);
    });

    await new Promise((_res, _rej) => {});
})();
