import { Server } from "http";
import { EventEmitter } from "events";

export class Verser extends EventEmitter {
    private server: Server;

    constructor(server: Server) {
        super();
        this.server = server;
    }

    start() {
        this.server.on("connect", (req, res) => {
            // eslint-disable-next-line no-console
            console.log("connect");
            this.emit("connect", req, res);
        });
    }
}
