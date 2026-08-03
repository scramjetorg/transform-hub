import { Duplex, Writable } from "stream";
import {
    request as httpRequest,
    IncomingHttpHeaders,
    IncomingMessage,
    OutgoingHttpHeaders,
    RequestOptions,
    ServerResponse,
    Agent } from "http";
import { ObjLogger } from "@scramjet/obj-logger";
import { Socket } from "net";
import { VerserRequestResult, VerserAgent } from "../types";
import { BPDuplex, BPMux } from "@scramjet/bpmux";
import { IObjectLogger } from "@scramjet/runtime-types";
import { once } from "events";

/**
 * VerserConnection class.
 *
 * Provides methods for handling connection to Verser server and streams in connection socket.
 */
export class VerserConnection {
    logger: IObjectLogger = new ObjLogger(this);

    private bpmux?: BPMux;

    private agent?: VerserAgent;
    private channelListeners: ((socket: Duplex, data?: any) => any)[] = [];

    get connected() {
        return !(this._socket.destroyed && this.bpmux);
    }

    get socket(): Duplex {
        return this._socket;
    }

    constructor(private request: IncomingMessage, private _socket: Duplex) {
        this.socket.on("error", (error: any) => {
            this.logger.debug("Socket request error:", { code: error.code, message: error.message });
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

    getHeaderFromRequestOptions({ headers }: RequestOptions, header: string): number | string | string[] | undefined {
        if (!headers) return undefined;

        if (Array.isArray(headers)) {
            return headers.find((h) => h.toLowerCase() === header.toLowerCase());
        }

        if (typeof headers === "object") {
            const ret = (headers as OutgoingHttpHeaders)[header.toLowerCase()];

            if (Array.isArray(ret)) {
                return ret[0];
            }
            return ret;
        }

        return undefined;
    }

    /**
     * Creates new HTTP request to VerserClient over VerserConnection.
     *
     * @param {RequestOptions} options Request options.
     * @returns {Promise<VerserRequestResult>} Promise resolving to Response and Request objects.
     */
    public async makeRequest(options: RequestOptions): Promise<VerserRequestResult> {
        if (!this.connected) throw new Error("Not connected");

        let expectedEvent = "response";

        if (this.getHeaderFromRequestOptions(options, "expect") === "100-continue") {
            expectedEvent = "continue";
        }

        this.logger.debug("making request and waiting for event", options, expectedEvent);

        const clientRequest = httpRequest({ ...options, agent: this.agent });

        clientRequest.setSocketKeepAlive(true);
        clientRequest.flushHeaders();

        clientRequest.on("error", (error: Error & { code?: string }) => {
            if (error.code === "ECONNRESET") {
                this.logger.debug("Carrier disconnected", (clientRequest.socket as any as BPDuplex)._chan);
                return;
            }
            this.logger.error("Client request error", { url: options.path, message: error.message });
        });

        return once(clientRequest, expectedEvent)
            .then(([response]) => {
                return { incomingMessage: response as IncomingMessage, clientRequest };
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

    connect() {
        this.logger.debug("Connecting...");

        // TODO: remove all listeners from the old BPMux instance
        // TODO: remove all listeners from the old socket instance
        // TODO: Remove all consumers from the streams

        this.bpmux = new BPMux(this.socket).on("error", (error: any) => {
            if (error.code !== "ECONNRESET")
                this.logger.debug("BPMux Error", error.message);
            // TODO: Error handling?
        });

        this.agent = Object.assign(
            new Agent(),
            {
                createConnection: () => {
                    try {
                        const socket = Object.assign(
                            this.bpmux!.multiplex(),
                            {
                                setKeepAlive: (_enable: boolean, _initialDelay?: number) => {},
                                setTimeout: (_timeout: number, _callback?: () => void) => {},
                                setNoDelay: (_noDelay: boolean) => {},
                                unref: () => {}
                            }
                        );

                        socket.on("error", () => {
                            this.logger.trace("Muxed stream error");
                        });
                        return socket;
                    } catch (e) {
                        const ret = new Socket();

                        setImmediate(() => ret.emit("error", e));
                        return ret;
                    }
                }
            }
        );

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
        return this.agent as VerserAgent;
    }
}
