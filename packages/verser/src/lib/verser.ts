import { Server } from "http";
import { EventEmitter } from "events";

import { VerserConnection } from "./verser-connection";

export class Verser extends EventEmitter {
    private server: Server;

    constructor(server: Server) {
        super();
        this.server = server;

        this.server.on("connect", (req, socket) => {
            this.emit("connect", new VerserConnection(req, socket));
        });
    }
}
