import { Duplex, Writable } from "stream";
import {
    request as httpRequest,
    Agent,
    IncomingHttpHeaders,
    IncomingMessage,
    RequestOptions,
    ServerResponse,
} from "http";
import { ObjLogger } from "@scramjet/obj-logger";
import { createConnection, Socket } from "net";
import { VerserRequestResult } from "../types";

const BPMux = require("bpmux").BPMux;

/**
 * VerserConnection class.
 *
 * Provides methods for handling connection to Verser server and streams in connection socket.
 */
export class VerserConnection {
    logger = new ObjLogger(this);

    private request: IncomingMessage;
    private bpmux?: { [key: string]: any };

    private _socket: Duplex;
    private agent?: Agent & { createConnection: typeof createConnection };
    private channelListeners: ((socket: Duplex, data?: any) => any)[] = [];

    get connected() {
        return !(this._socket.destroyed && this.bpmux);
    }

    get socket(): Duplex {
        return this._socket;
    }

    constructor(request: IncomingMessage, socket: Duplex) {
        this.request = request;
        this._socket = socket;

        this.socket.on("error", (error: Error) => {
            this.logger.error("Socket request error:", error);
            // TODO: handle error.
        });

        this.request.on("error", (error: Error) => {
            this.logger.error("Request error:", error);
            // TODO: handle error.
        });
    }

    addChannelListener(cb: (socket: Duplex, data?: Buffer) => any) {
        this.channelListeners.push(cb);
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
     * @param {number} httpStatusCode HTTP status code.
     * @param {string} httpStatus HTTP status message.
     */
    end(httpStatusCode: number, httpStatus: string = "") {
        this._socket.end(`HTTP/1.1 ${httpStatusCode} ${httpStatus}\r\n\r\n`);
    }

    /**
     * @deprecated Use makeRequest instead.
     * Forwards data from the request to the new duplex stream multiplexed in the socket.
     *
     * @param req {IncomingMessage} Request object.
     * @param res {ServerResponse} Response object.
     */
    async forward(req: IncomingMessage, res: ServerResponse) {
        if (!this.connected) throw new Error("BPMux not connected");

        const channel = this.bpmux?.multiplex() as Duplex;

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
                const chunked = Buffer.concat([Buffer.from(chunk.length.toString(16)), eol, chunk, eol]);

                await whenWrote(chunked, "binary", channel);
            }

            await whenWrote("0\r\n\r\n", "utf-8", channel);
        } catch (err) {
            this.logger.error("Error while forwarding request", err);
        }
    }

    /**
     * Creates new HTTP request to VerserClient over VerserConnection.
     *
     * @param {RequestOptions} options Request options.
     * @returns {Promise<VerserRequestResult>} Promise resolving to Response and Request objects.
     */
    public async makeRequest(options: RequestOptions): Promise<VerserRequestResult> {
        if (!this.connected) throw new Error("Not connected");

        return new Promise((resolve, reject) => {
            let expectedEvent = "response";

            if (options.headers?.Expect) {
                expectedEvent = "continue";
            }

            this.logger.debug("making request and waiting for event", options, expectedEvent);

            const clientRequest = httpRequest({ ...options, agent: this.agent })
                .on(expectedEvent, (incomingMessage: IncomingMessage) => {
                    this.logger.debug(`Got event ${expectedEvent}`);
                    resolve({ incomingMessage, clientRequest });
                })
                .on("error", (error: Error) => {
                    this.logger.error("Request error", options, error);
                    reject(error);
                });

            clientRequest.setSocketKeepAlive(true);
            clientRequest.flushHeaders();

            this.logger.debug("makeRequest headers sent", options);
        });
    }

    /**
     * @deprecated
     * Creates new multiplexed duplex stream in the socket.
     * Created channel has id to be identified in VerserClient.
     *
     * @param id {number} Channel id.
     * @returns Duplex stream.
     */
    createChannel(id: number): Duplex {
        if (!this.bpmux) throw new Error("BPMux not connected");

        return this.bpmux.multiplex({ channel: id });
    }

    reconnect() {
        this.logger.debug("Reconnecting...");
        this.bpmux = this.bpmux = new BPMux(this.socket).on("error", (error: Error) => {
            this.logger.error("BPMux Error", error.message);
            // TODO: Error handling?
        });

        this.agent = new Agent() as Agent & { createConnection: typeof createConnection }; // lack of types?
        this.agent.createConnection = () => {
            try {
                const socket = this.bpmux!.multiplex() as Socket;

                socket.on("error", () => {
                    this.logger.error("Muxed stream error");
                });

                // some libs call it but it is not here, in BPMux.
                socket.setKeepAlive ||= (_enable?: boolean, _initialDelay?: number | undefined) => socket;
                socket.unref ||= () => socket;
                socket.setTimeout ||= (_timeout: number, _callback?: () => void) => socket;

                this.logger.debug("Created new muxed stream");
                return socket;
            } catch (e) {
                const ret = new Socket();

                setImmediate(() => ret.emit("error", e));
                return ret;
            }
        };

        this.bpmux!.on("peer_multiplex", (socket: Duplex, data: any) => {
            this.channelListeners.forEach((listener) => {
                listener(socket, data);
            });
        });
    }

    /**
     * Closes the connection by sending FIN packet.
     */
    close() {
        this.logger.trace("Closing VerserConnection...");

        this.socket.destroy();
        this.logger.trace("VerserConnection closed");
    }

    getAgent() {
        return this.agent as Agent;
    }
}
