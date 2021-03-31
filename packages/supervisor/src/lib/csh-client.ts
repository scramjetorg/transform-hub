/* eslint-disable dot-notation */
import { CommunicationHandler } from "@scramjet/model";
import { CSHConnector, SocketChannel, UpstreamStreamsConfig } from "@scramjet/types";
import * as net from "net";
import { Duplex } from "node:stream";
import { PassThrough, Readable } from "stream";

const { BPMux } = require("bpmux");

class CSHClient implements CSHConnector {
    private socketPath: string;
    private packageStream: PassThrough;
    private streams: UpstreamStreamsConfig;
    private connectionChannels?: any[];
    private connection?: net.Socket;

    private mux: any;

    constructor(socketPath: string) {
        this.socketPath = socketPath;
        this.packageStream = new PassThrough();

        this.streams = [
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            this.packageStream,
            new PassThrough(),
            new PassThrough(),
        ];
    }

    async init(): Promise<void> {
        await this.connect();
    }

    connect(): Promise<void> {
        return new Promise((resolve) => {
            this.connection = net.createConnection({
                path: this.socketPath
            });

            this.mux = new BPMux(this.connection);

            this.connectionChannels = [
                this.mux.multiplex({ channel: SocketChannel.STDIN }),
                this.mux.multiplex({ channel: SocketChannel.STDOUT }),
                this.mux.multiplex({ channel: SocketChannel.STDERR }),
                this.mux.multiplex({ channel: SocketChannel.CONTROL }),
                this.mux.multiplex({ channel: SocketChannel.MONITORING }),
                this.mux.multiplex({ channel: SocketChannel.PACKAGE }),
                this.mux.multiplex({ channel: SocketChannel.TO_SEQ }),
                this.mux.multiplex({ channel: SocketChannel.FROM_SEQ })
            ];

            this.connectionChannels.forEach((channel: Duplex) => {
                channel.on("error", () => {});
            });

            /**
             * @analyze-how-to-pass-in-out-streams
             * In DownstreamStreamsConfig streams:
             * input?: WritableStream<any> - an input stream transporting data for processing to the Sequence
             * output?: ReadableStream<any> - an output stream transporting data processed by the Sequence 
             * Additional stream should be added to transport the package.
             * This stream should be closed when package is received.
             */

            // from host-one
            this.connectionChannels[0].pipe(this.streams[0]); // stdin
            this.connectionChannels[3].pipe(this.streams[3]); // control
            this.connectionChannels[5].pipe(this.packageStream); // package
            this.connectionChannels[6].pipe(this.streams[6]); // sequence input

            // to host-one
            this.streams[1].pipe(this.connectionChannels[1]); // stdout
            this.streams[2].pipe(this.connectionChannels[2]); // stderr
            // eslint-disable-next-line no-extra-parens
            (this.streams[4] as unknown as Readable).pipe(this.connectionChannels[4]); // monitor
            // eslint-disable-next-line no-extra-parens
            (this.streams[7] as unknown as Readable).pipe(this.connectionChannels[7]); // sequence output

            resolve();
        });
    }

    disconnect() {
        this.connection?.end();
    }

    upstreamStreamsConfig() {
        return this.streams as unknown as UpstreamStreamsConfig;
    }

    getPackage(): Readable {
        return this.packageStream;
    }

    hookCommunicationHandler(communicationHandler: CommunicationHandler) {
        if (typeof this.upstreamStreamsConfig === "undefined") {
            throw new Error("Upstreams not initated.");
        }

        communicationHandler.hookClientStreams(this.upstreamStreamsConfig());
    }
}

export { CSHClient };
