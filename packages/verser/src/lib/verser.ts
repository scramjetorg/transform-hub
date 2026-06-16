import { Server } from "http";

import { VerserConnection } from "./verser-connection";
import { TypedEmitter } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";
import { Socket } from "net";

type Events = {
    connect: (connection: VerserConnection) => void;
    close: (connection: VerserConnection) => void;
}

/**
 * Verser class.
 *
 * When instanced it sets up a listener for incoming "CONNECT" connections on the provided server.
 * When a new connection is received it emits "connect" event with VerserConnection instance
 */
export class Verser extends TypedEmitter<Events> {
    private server: Server;
    private connections: Set<VerserConnection> = new Set<VerserConnection>();
    logger = new ObjLogger(this);

    constructor(server: Server) {
        super();
        this.server = server;

        this.server.on("connect", (req, socket: Socket) => {
            socket.setNoDelay(true);
            const sthTags = req.headers["x-sth-tags"];
            const managerId = req.headers["x-manager-id"];
            const sthId = req.headers["x-sth-id"];
            const orgId = req.headers["x-org-id"];

            this.logger.info("New connection:", req.url, {
                orgId,
                managerId,
                sthId,
                sthTags
            });

            const connection = new VerserConnection(req, socket);

            this.connections.add(connection);
            this.logger.info("Total connections:", this.connections.size);

            this.emit("connect", connection);

            socket.once("close", () => {
                this.emit("close", connection);
                this.connections.delete(connection);
                this.logger.debug("Connect request closed, total connections:", this.connections.size);
            });
        });
    }

    async disconnect() {
        [...this.connections].map(connection => connection.close());

        this.connections = new Set<VerserConnection>();
    }

    async stop() {
        await this.disconnect();

        await new Promise<void>(res => {
            this.server.once("close", res).close();
        });
    }
}
