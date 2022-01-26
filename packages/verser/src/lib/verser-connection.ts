import { Duplex, Writable } from "stream";
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";
import { ObjLogger } from "@scramjet/obj-logger";

const BPMux = require("bpmux").BPMux;

/**
 * VerserConnection class.
 *
 * Provides methods for handling connection to Verser server and streams in connection socket.
 */
export class VerserConnection {
    private logger = new ObjLogger(this)

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

    /**
     * Returns header value.
     *
     * @param {string} name header name
     * @returns {string | string[] | undefined} Header value
     */
    getHeader(name: string): string | string[] | undefined {
        return this.request.headers[name];
    }

    /**
     * Returns request headers.
     *
     * @returns request headers
     */
    getHeaders(): IncomingHttpHeaders {
        return this.request.headers;
    }

    /**
     * Writes HTTP head to the socket with provided HTTP status code.
     *
     * @param {number} httpStatusCode HTTP status code
     */
    respond(httpStatusCode: number) {
        this._socket.write(`HTTP/1.1 ${httpStatusCode} \r\n\r\n`);
    }

    /**
     * Ends response with provided HTTP status code.
     *
     * @param {number} httpStatusCode HTTP status code
     */
    end(httpStatusCode: number) {
        this._socket.end(`HTTP/1.1 ${httpStatusCode} \r\n\r\n`);
    }

    /**
     * Forwards data from the request to the new duplex stream multiplexed in the socket.
     *
     * @param req {Incomingmessage} Request object.
     * @param res {ServerResponse} Response object.
     */
    async forward(req: IncomingMessage, res: ServerResponse) {
        const channel = this.bpmux.multiplex() as Duplex;

        channel
            .on("error", (error: Error) => {
                this.logger.error("Channel error, id:", error.message);
            })
            .on("end", () => {
                this.logger.trace("Request ended.", req.method, req.url);
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

        // If transfer encoding is not chunked simply pipe the request.
        if (req.headers["transfer-encoding"] !== "chunked") {
            req.pipe(channel);

            return;
        }

        // If transfer encoding is chunked we need to encode each chunk and catch errors for each write.
        try {
            for await (const chunk of req) {
                const eol = Buffer.from("\r\n");
                const chunked = Buffer.concat([
                    Buffer.from(chunk.length.toString(16)), eol,
                    chunk, eol
                ]);

                await whenWrote(chunked, "binary", channel);
            }

            await whenWrote("0\r\n\r\n", "utf-8", channel);
        } catch (err) {
            this.logger.error("Error while forwarding request", err);
        }
    }

    /**
     * Creates new multiplexed duplex stream in the socket.
     * Created channel has id to be identified in VerserClient.
     *
     * @param id {number} Channel id.
     * @returns Duplex stream.
     */
    createChannel(id: number): Duplex {
        return this.bpmux.multiplex({ channel: id });
    }

    reconnect() {
        this.bpmux = new BPMux(this.socket).on("error", (error: Error) => {
            this.logger.error(error.message);
            // TODO: Error handling?
        });
    }

    /**
     * Closes the connection by sending FIN packet.
     *
     * @returns Promise resolving when connection is ended.
     */
    async close() {
        this.logger.trace("Closing VerserConnection");

        return new Promise<void>(res => {
            this.socket.end(() => {
                this.logger.trace("VerserConnection closed");
                res();
            });
        });
    }
}
