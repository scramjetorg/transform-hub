import { PassThrough } from "stream";

import { IObjectLogger, ReadableApp } from "@scramjet/types";
import { Server } from "net";
import { Socket } from "dgram";

const portsTCP = [17006, 17007];
const portsUDP = [17008, 17009];
const servers: (Server | Socket)[] = [];
const output = new PassThrough();
const dgram = require("dgram");
const net = require("net");

let protocol = "tcp";

const createTCPServers = (logger: IObjectLogger): (Server | Socket)[] => {
    let server;

    portsTCP.forEach(function(port) {
        server = net.createServer();

        server.on("close", function() {
            logger.info("TCP server at port " + port + "closed.");
        });
        server.on("error", function(error: any) {
            logger.error("TCP server error: " + error);
        });

        server.on("connection", function(socket: any) {
            logger.info("Socket connection at port: " + socket.localPort);

            socket.on("data", (chunk: any) => {
                logger.info(`chunk ${chunk} received, len=${chunk.length}, type=${typeof chunk}`);
                if (chunk.toString() === "null") {
                    logger.info("Sequence is closing...");
                    output.end();
                }
                output.write(chunk);
            });

            socket.on("error", function(error: any) {
                logger.error("Socket Error: " + error);
            });

            socket.on("end", function(data: any) {
                logger.info("Socket end: " + data);
            });

            socket.on("close", function(error: any) {
                logger.info("Socket closed, error: " + error);
            });
        });

        server.listen(port, () => {
            logger.info("TCP server listening at port: " + port);
        });

        servers.push(server);
    });

    return servers;
};
const createUDPServers = (logger: IObjectLogger): (Server | Socket)[] => {
    portsUDP.forEach(function(port) {
        const server = dgram.createSocket("udp4");

        server.on("error", (error: any) => {
            logger.error("UDP server error: " + error);
            server.close();
        });

        server.on("message", (data: any) => {
            logger.info(`Data ${data} received, len=${data.length}, type=${typeof data}`);
            if (data.toString() === "null") {
                logger.info("Sequence is closing...");
                output.end();
            }
            output.write(data);
        });

        server.on("listening", () => {
            logger.info("UDP server listening at port: " + port);
        });

        server.bind(port);

        servers.push(server);
    });

    return servers;
};
/**
 * @param _stream - input
 */
const startServers: ReadableApp = async function(_stream: any, ...args: any) {
    this.logger.info("Sequence started with arguments: " + args);

    if (args.length > 0) protocol = args[0];

    if (protocol === "tcp") {
        this.logger.info("Starting TCP servers...");
        createTCPServers(this.logger);
    } else if (protocol === "udp") {
        this.logger.info("Starting UDP servers...");
        createUDPServers(this.logger);
    } else {
        this.logger.error("Sequence argument not recognized: " + protocol);
    }

    return output;
};

export default startServers;
