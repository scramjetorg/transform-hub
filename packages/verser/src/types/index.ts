import { ClientRequest, IncomingMessage, OutgoingHttpHeaders, Server } from "http";
import { NetConnectOpts, Socket } from "net";
import { Duplex } from "stream";
import { URL } from "url";
import { Agent as NodeAgent } from "http";

export interface AlmostSocket extends Duplex {
    setKeepAlive(enable: boolean, initialDelay?: number): void 
    setTimeout(timeout: number, callback?: () => void): void
    setNoDelay(noDelay: boolean): void
    unref(): void
}

export interface VerserAgent<X extends AlmostSocket = AlmostSocket> extends NodeAgent {
    createConnection(options: NetConnectOpts, connectionListener?: () => void): X
    createConnection(port: number, host?: string, connectionListener?: () => void): X
    createConnection(path: string, connectionListener?: () => void): X
}

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
    res: IncomingMessage;
};

export type VerserRequestResult = { incomingMessage: IncomingMessage; clientRequest: ClientRequest }

export type RegisteredChannelCallback = (duplex: Duplex) => void | Promise<void>;
export type RegisteredChannels = Map<number, RegisteredChannelCallback>;
