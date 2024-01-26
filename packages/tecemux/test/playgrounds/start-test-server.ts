#!/usr/bin/env ts-node
/* eslint-disable no-console */

import net, { Socket, createConnection } from "net";

import { TeceMux, TeceMuxChannel } from "../../src";
import { Agent, createServer, request } from "http";

const httpServer = createServer((req, res) => {
    console.log("Headers", req.headers);

    res.writeHead(200);
    res.write("OK");
    res.end();
});

const connectServer = net.createServer()
    .on("connection", async (conn: net.Socket) => {
        conn.setNoDelay(true);
        conn.on("error", (err) => {
            console.error("Error on connection from runner", err);
        });

        const protocol = new TeceMux(conn);

        protocol.on("channel", async (channel: TeceMuxChannel) => {
            httpServer.emit("connection", channel);
        });
    })
    .listen(9000, "0.0.0.0", () => {
        console.log("SocketServer on", connectServer.address());
    })
    .on("error", (error) => { console.error(error); });

const connectionSocket = createConnection({
    host: "0.0.0.0",
    port: 9000
});

const multiplexer = new TeceMux(connectionSocket);

class CustomAgent extends Agent {
    createConnection = () => {
        try {
            const socket = multiplexer.multiplex() as unknown as Socket;

            socket.on("error", () => {
                console.error("Muxed stream error");
            });

            socket.setKeepAlive ||= (_enable?: boolean, _initialDelay?: number | undefined) => socket;
            socket.unref ||= () => socket;
            socket.setTimeout ||= (_timeout: number, _callback?: () => void) => socket;

            console.log("Creating muxed channel in verser connection");

            return socket;
        } catch (error) {
            const ret = new Socket();

            setImmediate(() => ret.emit("error", error));
            return ret;
        }
    };
}

request({
    method: "get",
    host: "scramjet",
    port: "9999",
    agent: new CustomAgent(),
    path: "/get"
}).on("response", (response) => {
    response.on("data", (d) => { console.log("1 Req response", d.toString()); });
}).flushHeaders();

request({
    method: "post",
    host: "scramjet",
    port: "9999",
    agent: new CustomAgent(),
    path: "/get"
}).on("response", (response) => {
    response.on("data", (d) => { console.log("2 Req response", d.toString()); });
}).flushHeaders();

