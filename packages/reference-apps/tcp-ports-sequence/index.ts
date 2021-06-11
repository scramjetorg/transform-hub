import * as http from "https";

import { ReadableApp } from "@scramjet/types";
import { PassThrough } from "stream";

const ports = [7006, 7007, 7008, 7009];
const servers: http.Server[] = [];
const createServers = (output: PassThrough): http.Server[] => {

    let server;

    ports.forEach(function(port) {
        server = http.createServer();

        server.on("close", function() {
            console.log("~~~~~~~~~~~~~~~Server closed.");
        });
        server.on("error", function(error) {
            console.error("~~~~~~~~~~~~~~~Server error: " + error);
        });

        server.on("connection", function(socket) {

            console.log("~~~~~~~~~~~~~~~ Socket is listening at port: " + socket.remotePort);

            socket.on("data", function(data: any) {
                console.log("~~~~~~~~~~~~~~~Data sent to server and output: " + data);
                output.write(data);
            });

            socket.on("error", function(error: any) {
                console.error("~~~~~~~~~~~~~~~Socket Error: " + error);
            });

            socket.on("end", function(data: any) {
                console.log("~~~~~~~~~~~~~~~End data: " + data);
                output.end();
            });

            socket.on("close", function(error: any) {
                console.log("~~~~~~~~~~~~~~~Socket closed, error: " + error);
                output.end();
            });

        });

        server.listen(port, () => {
            console.log("~~~~~~~~~~~~~~~ Listening at port: " + port);
        });

        servers.push(server);
    });

    return servers;
};
const testServerConnection = (portNumber: number) => {

    const net = require("net");
    const client = new net.Socket();

    client.connect({
        port: portNumber
    });

    client.on("connect", function() {
        console.log("~~~~~~~~~~~~~~~ Client: connection established");
        client.write("Is there anybody out there?");
    });

};
/**
 * @param _stream - input
 */
const mod: ReadableApp = async function(_stream: any) {

    const output = new PassThrough();

    createServers(output);

    await new Promise(res => setTimeout(res, 10000));

    testServerConnection(7006);

    return output;
};

export default mod;
