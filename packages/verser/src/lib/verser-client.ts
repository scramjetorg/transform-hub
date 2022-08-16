import { OutgoingHttpHeaders, Agent as HttpAgent, Agent } from "http";
import { Agent as HttpsAgent, request } from "https";
import { merge, TypedEmitter } from "@scramjet/utility";
import { IObjectLogger } from "@scramjet/types";
import { VerserClientOptions, VerserClientConnection, RegisteredChannels, RegisteredChannelCallback } from "../types";
import { Duplex } from "stream";
import { createConnection, Socket } from "net";
import { ObjLogger } from "@scramjet/obj-logger";
import { defaultVerserClientOptions } from "./verser-client-default-config";
import { URL } from "url";

const BPMux = require("bpmux").BPMux;

type Events = {
    error: (err: Error) => void;
}

/**
 * VerserClient class.
 *
 * Provides methods for connecting to Verser server and handling of incoming muxed duplex streams.
 */
export class VerserClient extends TypedEmitter<Events> {
    /**
     * BPMux instance.
     */
    private bpmux: any;

    /**
     * VerserClient options.
     *
     * @type {VerserClientOptions}
     */
    private opts: VerserClientOptions;

    /**
     * HTTP connection Agent.
     *
     * @type {http.Agent} @see https://nodejs.org/api/http.html#http_class_http_agent.
     */
    private httpAgent: HttpsAgent | HttpAgent;

    /**
     * HTTP Agent but on BPMux'ed stream.
     */
    private _verserAgent?: HttpAgent & { createConnection: typeof createConnection };

    /**
     * Connection socket.
     *
     * @type {Socket}
     */
    private socket?: Socket;

    /**
     * Map of registered channels.
     */
    private registeredChannels: RegisteredChannels = new Map<number, RegisteredChannelCallback>();

    /**
     * Logger instance.
     *
     * @type {IObjectLogger}
     */
    public logger: IObjectLogger = new ObjLogger(this);

    /**
     * Return BPMux instance.
     */
    get verserAgent() {
        return this._verserAgent;
    }

    get agent() {
        return this.httpAgent;
    }

    constructor(opts: VerserClientOptions = defaultVerserClientOptions) {
        super();

        this.opts = opts;
        this.httpAgent = this.opts.https ? new HttpsAgent({ keepAlive: true }) : new HttpAgent({ keepAlive: true });
    }

    /**
     * Connect to the Verser server using defined configuration.
     *
     * @returns {Promise<VerserClientConnection>} Promise that resolves to the connection object.
     */
    public async connect(): Promise<VerserClientConnection> {
        return new Promise((resolve, reject) => {
            const { hostname, port, pathname } = this.opts.verserUrl instanceof URL
                ? this.opts.verserUrl : new URL(this.opts.verserUrl);

            const connectRequest = request({
                agent: this.httpAgent,
                headers: this.opts.headers,
                hostname,
                method: "CONNECT",
                pathname,
                port,
                protocol: this.opts.https ? "https:" : "http:",
                ca: typeof this.opts.https === "object" ? this.opts.https.ca : undefined,
            });

            connectRequest.on("error", (err) => {
                this.logger.error("Connect error", err);
                reject(err);
            });

            connectRequest.on("connect", (req, socket) => {
                this.socket = socket;
                this.mux();

                resolve({ req, socket });
            });

            connectRequest.end();
        });
    }

    /**
     * Sets up the muxer on the connection and handles new channels created by the server.
     *
     * If channel is registered, callback will be called with the duplex stream,
     * otherwise stream will be passed to the server.
     */
    private mux() {
        this.bpmux = new BPMux(this.socket)
            .on("peer_multiplex", async (mSocket: Duplex & { _chan: number }) => {
                const registeredChannelCallback = this.registeredChannels.get(mSocket._chan);

                if (registeredChannelCallback) {
                    await registeredChannelCallback(mSocket);
                } else {
                    this.opts.server?.emit("connection", mSocket);
                }
            })
            .on("error", (err: Error) => {
                this.emit("error", err);
            });

        this._verserAgent = new HttpAgent() as HttpAgent & { createConnection: typeof createConnection }; // lack of types?
        this._verserAgent.createConnection = () => {
            try {
                const socket = this.bpmux!.multiplex() as Socket;

                socket.on("error", () => {
                    this.logger.error("Muxed stream error");
                });

                // some libs call it but it is not here, in BPMux.
                socket.setKeepAlive = (_enable?: boolean, _initialDelay?: number | undefined) => socket;

                this.logger.debug("Created new muxed stream with setKeepAlive");
                return socket;
            } catch (error) {
                const ret = new Socket();

                setImmediate(() => ret.emit("error", error));
                return ret;
            }
        };
    }

    /**
     * Sets up headers.
     *
     * @param headers {IncomingHttpHeaders} Headers to be sent to the server on the connection.
     */
    updateHeaders(headers: OutgoingHttpHeaders) {
        merge(this.opts.headers, headers);
    }

    /**
     * @deprecated
     * Registers a channel on the client.
     *
     * @param channelId {number} Channel id.
     * @param data {RegisteredChannelCallback} Callback to be called when channel is created.
     */
    registerChannel(channelId: number, data: RegisteredChannelCallback) {
        this.registeredChannels.set(channelId, data);
    }
}
