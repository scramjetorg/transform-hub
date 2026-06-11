import { IncomingMessage, ServerResponse } from "http";
import { Duplex, Readable } from "stream";
import { StringStream } from "scramjet";
import { VerserConnection } from "@scramjet/verser";
import { ObjLogger } from "@scramjet/obj-logger";

/**
 * MultiHostController class which manages connection between MultiManager Verser server
 * and MultiHost Verser client (MultiManagerClient instance).
 */
export class MultiHostController {
    /**
     * MultiHostController logger instance.
     */
    private logger = new ObjLogger("MultiHostController");

    /**
     * MultiHostController id (which is the as same connected MultiHost id).
     */
    private multiHostId: string;

    /**
     * Connection to MultiHost instance.
     */
    private verserConnection: VerserConnection;

    /**
     * Stream of logs passed from MultiHost.
     */
    private hostLogStream?: Readable;

    constructor(id: string, verserConnection: VerserConnection) {
        this.multiHostId = id;
        this.verserConnection = verserConnection;
    }

    /**
     * MultiHostController id.
     */
    get id() {
        return this.multiHostId;
    }

    /**
     * Stream of logs passed from MultiHost.
     */
    get logStream() {
        return this.hostLogStream;
    }

    /**
     * Whether connection is active.
     */
    get isConnectionActive() {
        return !this.verserConnection.socket.destroyed;
    }

    /**
     * Establishes connection channel to MultiManagerClient.
     */
    connect() {
        this.attachSocketEventHandlers();
        this.verserConnection.connect();

        const channel = this.verserConnection.createChannel(0);

        this.attachChannelEventHandlers(channel, 0);

        this.hostLogStream = StringStream
            .from(this.verserConnection.createChannel(1))
            // .each(msg => { this.logger.debug(msg); })
            .catch((err: Error) => {
                this.logger.error(err.message);
            });
    }

    /**
     * Establishes connection channel to MultiManagerClient using passed connection instance.
     *
     * @param {VerserConnection} verserConnection New verser connection instance.
     */
    reconnect(verserConnection: VerserConnection) {
        this.verserConnection = verserConnection;
        this.connect();
    }

    /**
     * Forwards given request to MultiManagerClient.
     *
     * @param {IncomingMessage} req Request to forward.
     * @param {ServerResponse} res Response to forward.
     */
    async forward(req: IncomingMessage, res: ServerResponse) {
        await this.verserConnection.forward(req, res);
    }

    private attachSocketEventHandlers() {
        this.verserConnection.socket.on("error", err => {
            this.logger.error("Socket connection errored:", err.message);
        });

        this.verserConnection.socket.on("end", () => {
            this.logger.trace("Socket connection end request received.");
        });

        this.verserConnection.socket.on("close", () => {
            this.logger.trace("Socket connection closed.");
        });
    }

    private attachChannelEventHandlers(channel: Duplex, channelId: number) {
        channel.on("error", err => {
            this.logger.error("Communication channel error", channelId, err.message);
        });

        channel.on("end", () => {
            this.logger.debug("Communication channel ended", channelId);
        });
    }

}
