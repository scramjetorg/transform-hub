import { createServer, request, Agent, Server, ClientRequest } from "http";
import { Socket } from "net";

const BPMux = require("bpmux").BPMux;
const defaultTunnelServerConfig = {
    host: "0.0.0.0",
    port: 11000
};
//const bpmuxes: { [key: string]: any } = {};

export type GetMuxKey = {
    (req: ClientRequest): string;
};

export type TunnelServerConfig = {
    host?: string,
    port?: number
    head?: string
};

export function setServerTunnel(
    sourceServer: Server,
    tunnelServerConfig: TunnelServerConfig
) {
    tunnelServerConfig = { ...defaultTunnelServerConfig, ...tunnelServerConfig };

    let mux: any;

    sourceServer.on("request", (req, res) => {
        console.log("CPM API: request");

        const muxedStream = mux.multiplex();

        muxedStream.pipe(res.socket);
        muxedStream.write(`${req.method} ${req.url || "/"} HTTP/1.1\r\n\r\n`);
        req.socket.pipe(muxedStream);
    });

    createServer()
        .on("connect", (req, clientSocket, head) => {
            console.log("CPM STH Server: STH Connected - Tunnel ready, head:", head.toString());

            clientSocket.write("HTTP/1.1 200 \r\n\r\n");

            mux = new BPMux(clientSocket);
        })
        .listen(tunnelServerConfig.port, tunnelServerConfig.host, () => {
            console.log(`Tunnel Server on ${tunnelServerConfig.host}:${tunnelServerConfig.port}`);
        });
}

export function setClientTunnel(targetServer: Server, tunnelServerConfig: TunnelServerConfig) {
    console.log("Establishing tunnel - Sending connect");

    tunnelServerConfig = { ...defaultTunnelServerConfig, ...tunnelServerConfig };

    const req = request({
        port: tunnelServerConfig.port,
        host: tunnelServerConfig.host,
        method: "CONNECT",
        agent: new Agent({ keepAlive: true })
    }).on("connect", (_response, socket, head) => {
        console.log("Tunnel established, head: ", head.toString());

        new BPMux(socket)
            .on("handshake", (mSocket: Socket) => {
                console.log("handshake");
                targetServer.emit("connection", mSocket);
            });
    });

    req.write(tunnelServerConfig.head);
    req.end();
}
