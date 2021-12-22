import { OutgoingHttpHeaders, request, Agent } from "http";
import { merge } from "@scramjet/utility";
import { VerserClientOptions, VerserClientConnection } from "../types";
import { Duplex, EventEmitter } from "stream";
import { Socket } from "net";

type RegisteredChannelCallback = (duplex: Duplex) => void | Promise<void>;
type RegisteredChannels = Map<number, RegisteredChannelCallback>;

const defaultVerserClientOptions: VerserClientOptions = {
    headers: {},
    remoteHost: "localhost",
    remotePort: 8080
};

const BPMux = require("bpmux").BPMux;

export class VerserClient extends EventEmitter {
    private opts: VerserClientOptions;
    private agent: Agent;
    private socket?: Socket;
    private registeredChannels: RegisteredChannels = new Map<number, RegisteredChannelCallback>();

    constructor(opts: VerserClientOptions = defaultVerserClientOptions) {
        super();
        this.opts = opts;
        this.agent = new Agent({ keepAlive: true });
    }

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
                // eslint-disable-next-line no-console
                console.log("Connect error", err);
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

    updateHeaders(headers: OutgoingHttpHeaders) {
        merge(this.opts.headers, headers);
    }

    registerChannel(channelId: number, data: RegisteredChannelCallback) {
        this.registeredChannels.set(channelId, data);
    }
}
