import { OutgoingHttpHeaders, request, Agent } from "http";
import { merge } from "@scramjet/utility";
import { VerserClientOptions, VerserClientConnection } from "../types/index";
import { Duplex } from "stream";

const defaultVerserClientOptions: VerserClientOptions = {
    headers: {},
    remoteHost: "localhost",
    remotePort: 8080
};

export class VerserClient {
    private opts: VerserClientOptions;
    private agent: Agent;

    constructor(opts: VerserClientOptions = defaultVerserClientOptions) {
        this.opts = opts;
        this.agent = new Agent({ keepAlive: true });
    }

    async connect(): Promise<VerserClientConnection> {
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
                resolve({ req, socket });
            });

            req.end();
        });
    }

    handleConnection(socket: Duplex) {
        this.opts.server?.emit("connection", socket);
    }

    updateHeaders(headers: OutgoingHttpHeaders) {
        merge(this.opts.headers, headers);
    }
}
