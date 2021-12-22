import { IncomingMessage, OutgoingHttpHeaders, Server } from "http";
import { Socket } from "net";

export type VerserClientOptions = {
    headers: OutgoingHttpHeaders,
    remoteHost: string,
    remotePort: number,
    server?: Server
};

export type VerserClientConnection = { socket: Socket, req: IncomingMessage };
