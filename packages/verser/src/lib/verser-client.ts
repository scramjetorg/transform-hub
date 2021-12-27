import { OutgoingHttpHeaders, request, Agent } from "http";
import { merge } from "@scramjet/utility";
import { VerserClientOptions, VerserClientConnection, RegisteredChannels, RegisteredChannelCallback } from "../types";
import { Duplex, EventEmitter } from "stream";
import { Socket } from "net";
import { getLogger } from "@scramjet/logger";
import { defaultVerserClientOptions } from "./verser-client-default-config";
import { Logger } from "@scramjet/types";

const BPMux = require("bpmux").BPMux;

/**
 * VerserClient class.
 *
 * Provides methods for connecting to Verser server and handling of incoming muxed duplex streams.
 */
export class VerserClient extends EventEmitter {
    /**
     * VerserClient options.
     *
     * @type {VerserClientOptions}
     */
    private opts: VerserClientOptions;

    /**
     * HTTP connection Agent
     *
     * @type {http.Agent} @see https://nodejs.org/api/http.html#http_class_http_agent.
     */
    private agent: Agent;

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
     * @type {Logger}
     */
    public logger: Logger = getLogger(this);

    constructor(opts: VerserClientOptions = defaultVerserClientOptions) {
        super();
        this.opts = opts;
        this.agent = new Agent({ keepAlive: true });
    }

    /**
     * Connect to the Verser server using defined configuration.
     *
     * @returns {Promise<VerserClientConnection>} Promise that resolves to the connection object.
     */
    public async connect(): Promise<VerserClientConnection> {
        return new Promise((resolve, reject) => {
            const connectRequest = request({
                agent: this.agent,
                headers: this.opts.headers,
                host: this.opts.remoteHost,
                method: "CONNECT",
                port: this.opts.remotePort
            });

            connectRequest.on("error", (err) => {
                this.logger.log("Connect error", err);
                reject(err);
            });

            connectRequest.on("connect", (_req, socket) => {
                this.socket = socket;
                this.mux();
                resolve({ req: _req, socket });
            });

            connectRequest.end();
        });
    }

    /**
     * Sets up the muxer on the connection and handles new channels created by the server.
     *
     * If channel is registered, callback will be called with the duplex stream,
     * otherwise stream will be passed to the server.
     *
     * @param {VerserClientConnection} connection Connection object.
     */
    private mux() {
        new BPMux(this.socket)
            .on("handshake", async (mSocket: Duplex & { _chan: number }) => {
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
     * Registers a channel on the client.
     *
     * @param channelId {number} Channel id.
     * @param data {RegisteredChannelCallback} Callback to be called when channel is created.
     */
    registerChannel(channelId: number, data: RegisteredChannelCallback) {
        this.registeredChannels.set(channelId, data);
    }
}
