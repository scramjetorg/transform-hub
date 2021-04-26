/* eslint-disable dot-notation */
import { CommunicationChannel as CC, SupervisorError } from "@scramjet/model";
import { ICommunicationHandler, ICSHClient, UpstreamStreamsConfig, PassThoughStream, DuplexStream, ReadableStream } from "@scramjet/types";
import { addLoggerOutput, getLogger } from "@scramjet/logger";
import * as net from "net";
import { Writable } from "stream";

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

            connectionChannels.forEach((channel) => channel.on("error", (e) => {
                this.logger.warn(e.stack);
            }));

            this.connection.on("error", (e) => {
                this.logger.error("Connection error: ", e.stack);
            });

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

    async disconnect() {
        //this.connection?.end();

        // eslint-disable-next-line no-extra-parens
        await Promise.all([1, 2, 4, 6, 7]
            // eslint-disable-next-line no-extra-parens
            .map(i => (this.streams as Writable[])[i] as unknown as Writable).map((s: Writable) => {
                return new Promise((res, reject) => {
                    s.end(res);
                    s.on("error", reject);
                });
            })
        );
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
        const { out, err } = communicationHandler.getLogOutput();

        communicationHandler.hookUpstreamStreams(this.streams);
        addLoggerOutput(out, err);
        this.logger.log("Log hooked up");
    }
}

export { CSHClient };
