import * as http from "http";

import { ReadableApp } from "@scramjet/types";
import { PassThrough } from "stream";

const createServers = (output: PassThrough): http.Server[] => {

    const ports = [7006, 7007, 7008, 7009];
    const servers: http.Server[] = [];

    console.log("~~~~~~~~~~~~~~~ ports: " + ports);

    let server;

    ports.forEach(function(port) {
        server = http.createServer();

        server.on("close", function() {
            console.log("~~~~~~~~~~~~~~~Server closed");
        });
        server.on("error", function(error) {
            console.log("~~~~~~~~~~~~~~~Error: " + error);
        });

        server.on("connection", function(socket) {

            console.log("~~~~~~~~~~~~~~~ Socket is listening at port" + socket.remotePort);
            console.log("~~~~~~~~~~~~~~~ Socket ip :" + socket.remoteAddress);

            socket.on("data", function(data: any) {
                console.log("~~~~~~~~~~~~~~~Data sent to server and output: " + data);

                output.write(data);
//                output.end();

            });

            socket.on("error", function(error: any) {
                console.log("~~~~~~~~~~~~~~~Error: " + error);
            });

            socket.on("end", function(data: any) {
                console.log("~~~~~~~~~~~~~~~End data: " + data);
            });

            socket.on("close", function(error: any) {
                console.log("~~~~~~~~~~~~~~~Socket closed!");
                if (error) {
                    console.log("~~~~~~~~~~~~~~~Socket was closed coz of transmission error");
                }
            });


        });

        server.listen(port, () => {
            console.log("~~~~~~~~~~~~~~~ Listenting at port: " + port);

        });
        servers.push(server);
    });

    return servers;
};
/**
 * @param _stream - input
 */
const mod: ReadableApp = async function(_stream: any) {

    const output = new PassThrough();

    createServers(output);

    return output;
};

export default mod;
