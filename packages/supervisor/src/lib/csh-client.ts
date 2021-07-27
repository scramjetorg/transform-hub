/* eslint-disable dot-notation */
import { SupervisorError } from "@scramjet/model";
import { ICommunicationHandler, ICSHClient, UpstreamStreamsConfig, PassThoughStream, DuplexStream, ReadableStream } from "@scramjet/types";
import { addLoggerOutput, getLogger } from "@scramjet/logger";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import * as net from "net";
import { Writable } from "stream";

const { BPMux } = require("bpmux");

class CSHClient implements ICSHClient {
    private socketPath: string;

    private streams?: UpstreamStreamsConfig;

    private connection?: net.Socket;

    /**
     * BPMux instance.
     */
    private mux: any;

    logger: Console;

    constructor(socketPath: string) {
        this.socketPath = socketPath;
        this.logger = getLogger(this);
        addLoggerOutput(process.stdout, process.stderr);
    }

    async init(id: string): Promise<void> {
        return new Promise((resolve) => {
            this.logger.info("Connecting to", this.socketPath);

            this.connection = net.createConnection({
                path: this.socketPath
            });

            this.connection.once("connect", () => {
                this.logger.log("Sending id: ", id);

                this.connection?.write(id);

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

                let i = 0;

                connectionChannels.forEach(
                    (channel) => {
                        channel.on("error", (e) => this.logger.warn(e.stack));
                        channel.on("pipe", () => this.logger.debug(`stream ${i++} piped to output`));
                    }
                );

                this.connection?.on("error", (e) => {
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
                    connectionChannels[CC.PACKAGE] as unknown as PassThoughStream<Buffer>
                ];
                connectionChannels[CC.MONITORING].resume();
                resolve();

            });
        });
    }

    async disconnect() {
        if (this.streams) {
            const streams = this.streams;

            await Promise.all([
                CC.STDOUT,
                CC.STDERR,
                CC.MONITORING,
                CC.OUT,
                CC.LOG
            ]
                .map(streamIndex => streams[streamIndex] as Writable)
                .map(stream => new Promise(
                    (res, rej) => stream
                        .on("error", rej)
                        .on("end", res)
                        .end()
                ))
            );
        }
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

        this.logger.log("Log hooked up.");
    }
}

export { CSHClient };
