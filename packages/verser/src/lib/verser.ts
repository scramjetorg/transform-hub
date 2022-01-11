import { Server } from "http";

import { VerserConnection } from "./verser-connection";
import { TypedEmitter } from "@scramjet/utility";

type Events = {
    connect: (connection: VerserConnection) => void;
}

/**
 * Verser class.
 *
 * When instanced it sets up a listener for incoming "CONNECT" connections on the provided server.
 * When a new connection is received it emits "connect" event with  VerserConnection instance
 */
export class Verser extends TypedEmitter<Events> {
    private server: Server;

    constructor(server: Server) {
        super();
        this.server = server;

        this.server.on("connect", (req, socket) => {
            this.emit("connect", new VerserConnection(req, socket));
        });
    }
}
