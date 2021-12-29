import { IncomingMessage, OutgoingHttpHeaders, Server } from "http";
import { Socket } from "net";
import { Duplex } from "stream";

/**
 * VerserClient options type.
 */
export type VerserClientOptions = {
    /**
     * HTTP headers to be sent on connect.
     * @type {OutgoingHttpHeaders}
     */
    headers: OutgoingHttpHeaders;

    /**
     * Verser url.
     * @type {string}
     */
    verserUrl: string;

    /**
     * HTTP server to handle connections from Verser server.
     * @type {Server}
     */
    server?: Server;
};

/**
 * VerserClient connection type.
 */
export type VerserClientConnection = {
    /**
     * Connection socket.
     */
    socket: Socket;

    /**
     * Connection request object.
     */
    req: IncomingMessage;
};

export type RegisteredChannelCallback = (duplex: Duplex) => void | Promise<void>;
export type RegisteredChannels = Map<number, RegisteredChannelCallback>;
