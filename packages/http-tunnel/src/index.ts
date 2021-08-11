import * as http from "http";
import { Agent, Server, ClientRequest } from "http";
import { Socket } from "net";

const BPMux = require("bpmux").BPMux;
const bpmuxes: { [key: string]: any } = { };

export type GetMuxKey = {
    (req: ClientRequest): string;
};

export type ServerConfiguration = {
    host: string,
    port: number
};

export function handleTunnelConnectRequest(apiServer: Server, server: Server, getMuxKey: GetMuxKey) {

    apiServer.on("request", (req, res) => {
        console.log("CPM API: request", req.headers);

        const mux = bpmuxes[getMuxKey(req)];
        const muxedStream = mux.multiplex();

        muxedStream.pipe(res.socket);
        muxedStream.write(`${req.method} ${req.url || "/"} HTTP/1.1\r\n\r\n`);
        req.socket.pipe(muxedStream);
    });

    server.on("connect", (req, clientSocket, head) => {
        console.log("CPM STH Server: STH Connected - Tunnel ready");

        clientSocket.write("HTTP/1.1 200 \r\n\r\n");

        bpmuxes[getMuxKey(req)] = new BPMux(clientSocket);
    });

}

export function sendConnectRequest(server: Server, serverConfig: ServerConfiguration) {
    console.log("Establishing tunnel - Sending connect");

    const agent = new Agent({ keepAlive: true });
    const req = http.request({
        port: serverConfig.port,
        host: serverConfig.host,
        method: "CONNECT",
        agent
    }, () => {
        console.log("Connection handler");
    });

    req.on("connect", (response, socket, head) => {
        console.log("Tunnel: connect event");

        new BPMux(socket)
            .on("handshake", (mSocket: Socket) => {
                console.log("handshake");
                server.emit("connection", mSocket);
            });
    });

    req.end();
}


