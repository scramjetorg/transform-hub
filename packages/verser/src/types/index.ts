import { ClientRequest, IncomingMessage, OutgoingHttpHeaders, Server } from "http";
import { Socket } from "net";
import { Duplex } from "stream";
import { URL } from "url";

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
     * @type {URL | string}
     */
    verserUrl: URL | string;

    /**
     * HTTP server to handle connections from Verser server.
     * @type {Server}
     */
    server?: Server;

    https?: false | true | { ca: (string | Buffer)[] }
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
    response: IncomingMessage;
};

export type VerserRequestResult = { incomingMessage: IncomingMessage; clientRequest: ClientRequest }

export type RegisteredChannelCallback = (duplex: Duplex) => void | Promise<void>;
export type RegisteredChannels = Map<number, RegisteredChannelCallback>;
