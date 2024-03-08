import { Server } from "http";

import { VerserConnection } from "./verser-connection";
import { TypedEmitter } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";
import { Socket } from "net";

type Events = {
    connect: (connection: VerserConnection) => void;
}

/**
 * Verser class.
 *
 * When instanced it sets up a listener for incoming "CONNECT" connections on the provided server.
 * When a new connection is received it emits "connect" event with VerserConnection instance
 */
export class Verser extends TypedEmitter<Events> {
    private server: Server;
    private connections: VerserConnection[] = [];
    logger = new ObjLogger(this);

    constructor(server: Server) {
        super();
        this.server = server;

        this.server.on("connect", (req, socket: Socket) => {
            socket.setNoDelay(true);
            this.logger.info("New connection:", req.url);

            const connection = new VerserConnection(req, socket);

            this.connections.push(connection);
            this.logger.info("Total connections:", this.connections.length);

            this.emit("connect", connection);

            socket.once("close", () => {
                this.logger.info("Connect request closed");
            });
        });
    }

    async disconnect() {
        this.connections.map(connection => connection.close());

        this.connections = [];
    }

    async stop() {
        await this.disconnect();

        await new Promise<void>(res => {
            this.server.once("close", res).close();
        });
    }
}
