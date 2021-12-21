import { OutgoingHttpHeaders, request, Agent } from "http";
import { merge } from "@scramjet/utility";
import { VerserClientOptions, VerserClientConnection } from "../types";
import { Duplex, EventEmitter } from "stream";
import { Socket } from "net";

type RegisteredChannelData = { duplex?: Duplex, cb?: Function };
type RegisteredChannels = Map<number, RegisteredChannelData>;

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
    private registeredChannels: RegisteredChannels = new Map();

    constructor(opts: VerserClientOptions = defaultVerserClientOptions) {
        super();
        this.opts = opts;
        this.agent = new Agent({ keepAlive: true });
    }

    public async connect(): Promise<VerserClientConnection> {
        return new Promise((resolve, reject) => {
            const req = request({
                agent: this.agent,
                headers: this.opts.headers,
                host: this.opts.remoteHost,
                method: "CONNECT",
                port: this.opts.remotePort
            });

            req.on("error", (err) => {
                reject(err);
            });

            req.on("connect", (_req, socket) => {
                this.socket = socket;
                this.mux();
                resolve({ req, socket });
            });

            req.end();
        });
    }

    private mux() {
        new BPMux(this.socket)
            .on("handshake", async (mSocket: Duplex & { _chan: number }) => {
                const registeredChannel = this.registeredChannels.get(mSocket._chan);

                if (registeredChannel) {
                    if (registeredChannel.duplex) {
                        mSocket.pipe(registeredChannel.duplex).pipe(mSocket);
                    }

                    if (registeredChannel.cb) {
                        registeredChannel.cb(registeredChannel.duplex);
                    }
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

    registerChannel(channelId: number, data: RegisteredChannelData) {
        this.registeredChannels.set(channelId, data);
    }
}
