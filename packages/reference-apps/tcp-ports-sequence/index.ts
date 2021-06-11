import * as http from "http";
import { PassThrough } from "stream";

import { Logger, ReadableApp } from "@scramjet/types";

const ports = [7006, 7007, 7008, 7009];
const servers: http.Server[] = [];
const output = new PassThrough();

let protocol = "tcp";

const createServers = (logger: Logger): http.Server[] => {

    let server;

    ports.forEach(function(port) {
        server = http.createServer();

        server.on("close", function() {
            logger.info("TCP server at port " + port + "closed.");
        });
        server.on("error", function(error) {
            logger.error("TCP server error: " + error);
        });

        server.on("connection", function(socket) {
            logger.info("Socket connection at port: " + socket.localPort);

            socket.on("data", function(data: any) {
                logger.info("Data sent to server and output: " + data);
                output.write(data);
            });

            socket.on("error", function(error: any) {
                logger.error("Socket Error: " + error);
            });

            socket.on("end", function(data: any) {
                logger.info("Socket end: " + data);
                output.end();
            });

            socket.on("close", function(error: any) {
                logger.info("Socket closed, error: " + error);
                output.end();
            });

        });

        server.listen(port, () => {
            logger.info("TCP server listening at port: " + port);
        });

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
        createServers(this.logger);
    } else if (protocol === "udp") {
        this.logger.info("Sequence UDP server requested.");
    } else {
        this.logger.error("Sequence argument not recognized: " + protocol);
    }

    return output;
};

export default startServers;
