import { getLogger } from "@scramjet/logger";

import { Duplex, Writable } from "stream";
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";

const BPMux = require("bpmux").BPMux;

export class VerserConnection {
    private logger = getLogger("VerserConnection");

    private request: IncomingMessage;
    private bpmux: any;

    private _socket: Duplex;

    get socket(): Duplex {
        return this._socket;
    }

    constructor(request: IncomingMessage, socket: Duplex) {
        this.request = request;
        this._socket = socket;

        this.request.on("error", (error: Error) => {
            this.logger.error("Request error:", error);
            // TODO: handle error.
        });
    }

    getHeader(name: string): string | string[] | undefined {
        return this.request.headers[name];
    }

    getHeaders(): IncomingHttpHeaders {
        return this.request.headers;
    }

    respond(httpStatusCode: number) {
        this._socket.write(`HTTP/1.1 ${httpStatusCode} \r\n\r\n`);
    }

    end(httpStatusCode: number) {
        this._socket.end(`HTTP/1.1 ${httpStatusCode} \r\n\r\n`);
    }

    async forward(req: IncomingMessage, res: ServerResponse) {
        const channel = this.bpmux.multiplex() as Duplex;

        channel
            .on("error", (error: Error) => {
                this.logger.error("Channel error, id:", error.message);
            })
            .on("end", () => {
                this.logger.log("Request ended.", req.method, req.url);
            });

        this.logger.debug("Forwarding request", req.method, req.url);

        channel.write(
            `${req.method} ${req.url} HTTP/1.1\r\n` +
                Object.keys(req.headers)
                    .filter((header) => header !== "host")
                    .map((header) => `${header}: ${req.headers[header]}`)
                    .join("\r\n") +
                "\r\n\r\n"
        );

        const whenWrote = (chunk: Buffer | string, encoding: BufferEncoding, stream: Duplex) =>
            new Promise<void>((resolve) => {
                if (stream.write(chunk, encoding) === false) {
                    stream.once("drain", resolve);
                } else {
                    resolve();
                }
            });

        channel.pipe(res.socket as Writable);

        // if transfer encoding is not chunked simply pipe the request
        if (req.headers["transfer-encoding"] !== "chunked") {
            req.pipe(channel);
            return;
        }

        // if transfer encoding is chunked we need to encode each chunk and catch errors for each write
        try {
            for await (const chunk of req) {
                await whenWrote(chunk.length.toString(16) + "\r\n", "utf-8", channel);
                await whenWrote(chunk, "binary", channel);
                await whenWrote("\r\n", "utf-8", channel);
            }

            await whenWrote("0\r\n\r\n", "utf-8", channel);
        } catch (err) {
            this.logger.error("Error while forwarding STH request ", err);
        }
    }

    createChannel(id: number): Duplex {
        return this.bpmux.multiplex({ channel: id });
    }

    reconnect() {
        this.bpmux = new BPMux(this.socket).on("error", (error: Error) => {
            this.logger.error(error.message);
            // TODO: Error handling?
        });
    }
}
