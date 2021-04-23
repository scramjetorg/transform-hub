/* eslint-disable dot-notation */
import { CommunicationChannel as CC, SupervisorError } from "@scramjet/model";
import { ICommunicationHandler, ICSHClient, UpstreamStreamsConfig, PassThoughStream, DuplexStream, ReadableStream } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import * as net from "net";

const { BPMux } = require("bpmux");

class CSHClient implements ICSHClient {
    private socketPath: string;

    private streams?: UpstreamStreamsConfig;

    // private connectionChannels?: DuplexStream<string, string>[];
    private connection?: net.Socket;

    private mux: any;

    logger: Console;

    constructor(socketPath: string) {
        this.socketPath = socketPath;
        this.logger = getLogger(this);
    }

    async init(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.streams) {
                throw new SupervisorError("UNINITIALIZED_STREAMS");
            }
            this.logger.info("Connecting to", this.socketPath);

            this.connection = net.createConnection({
                path: this.socketPath
            });

            this.mux = new BPMux(this.connection);

            const connectionChannels: DuplexStream<string, string>[] = [
                this.mux.multiplex({ channel: CC.STDIN }),
                this.mux.multiplex({ channel: CC.STDOUT }),
                this.mux.multiplex({ channel: CC.STDERR }),
                this.mux.multiplex({ channel: CC.CONTROL }),
                this.mux.multiplex({ channel: CC.MONITORING }),
                this.mux.multiplex({ channel: CC.IN }),
                this.mux.multiplex({ channel: CC.OUT }),
                this.mux.multiplex({ channel: CC.LOG }),
                this.mux.multiplex({ channel: CC.PACKAGE })
            ];

            connectionChannels.forEach((channel) => channel.on("error", (/*e*/) => {
                // TODO: this.logger.warn(e);
            }));

            this.streams = [
                connectionChannels[CC.STDIN],
                connectionChannels[CC.STDOUT],
                connectionChannels[CC.STDERR],
                connectionChannels[CC.CONTROL],
                connectionChannels[CC.MONITORING],
                connectionChannels[CC.IN],
                connectionChannels[CC.OUT],
                connectionChannels[CC.LOG],
                connectionChannels[CC.PACKAGE] as unknown as PassThoughStream<Buffer> // this was checked.
            ];

            resolve();
        });
    }

    disconnect() {
        this.connection?.end();
    }

    getPackage() {
        if (typeof this.streams === "undefined" || typeof this.streams[CC.PACKAGE] === "undefined") {
            throw new SupervisorError("UNINITIALIZED_STREAMS", { details: "CSHClient" });
        }

        return this.streams[CC.PACKAGE] as ReadableStream<Buffer>;
    }

    hookCommunicationHandler(communicationHandler: ICommunicationHandler) {
        if (typeof this.streams === "undefined") {
            throw new SupervisorError("UNINITIALIZED_STREAMS", { details: "CSHClient" });
        }

        communicationHandler.hookUpstreamStreams(this.streams as unknown as UpstreamStreamsConfig<true>);
    }
}

export { CSHClient };
