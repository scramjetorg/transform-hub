/* eslint-disable dot-notation */
import { ICSHClient, UpstreamStreamsConfig, PassThoughStream, DuplexStream } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import * as net from "net";

const { BPMux } = require("bpmux");

class CSHClient implements ICSHClient {
    private _streams?: UpstreamStreamsConfig;

    private connection?: net.Socket;

    /**
     * BPMux instance.
     */
    private mux: any;

    logger: Console;

    constructor(private instancesServerPort: number) {
        this.logger = getLogger(this);
    }

    private get streams(): UpstreamStreamsConfig {
        if (!this._streams) {
            throw new Error("Accessing streams before initialization");
        }

        return this._streams;
    }

    async init(id: string): Promise<void> {
        return new Promise((resolve) => {
            this.logger.info(`Connecting to localhost:${this.instancesServerPort}`);

            this.connection = net.createConnection({
                port: this.instancesServerPort
            });

            this.connection.once("connect", () => {
                this.logger.log("Sending id: ", id);

                this.connection?.write(id);

                this.mux = new BPMux(this.connection);

                this.mux.on("error", (e: any) => {
                    this.logger.error(e);
                });
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

                connectionChannels.forEach(
                    (channel, i) => {
                        channel.on("error", (e) => this.logger.warn(e));
                        channel.on("pipe", () => this.logger.debug(`Stream ${i} piped to output.`));
                    }
                );

                this.connection?.on("error", (e) => {
                    this.logger.error("Connection error: ", e.stack);
                });

                this._streams = [
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
        const streamsExitedPromised = this.streams
            .map(stream => new Promise(
                (res, rej) => {
                stream!
                    .on("error", rej)
                    .on("end", res);

                if ("writable" in stream!) {
                    stream.end();
                } else {
                    stream!.destroy();
                }
                }
            ));

        this.connection?.end();

        await Promise.all(streamsExitedPromised);
    }

    get stdinStream() {
        return this.streams[CC.STDIN];
    }

    get stdoutStream() {
        return this.streams[CC.STDOUT];
    }

    get stderrStream() {
        return this.streams[CC.STDERR];
    }

    get controlStream() {
        return this.streams[CC.CONTROL];
    }

    get monitorStream() {
        return this.streams[CC.MONITORING];
    }

    get inputStream() {
        return this.streams[CC.IN];
    }

    get outputStream() {
        return this.streams[CC.OUT];
    }

    get logStream() {
        return this.streams[CC.LOG];
    }

    get packageStream() {
        return this.streams[CC.PACKAGE];
    }
}

export { CSHClient };
