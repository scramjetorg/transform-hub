/* eslint-disable dot-notation */
import { ICommunicationHandler } from "@scramjet/types";
import { ICSHClient, SocketChannel, UpstreamStreamsConfig } from "@scramjet/types";
import * as net from "net";
import { Duplex } from "stream";
import { PassThrough, Readable } from "stream";

const { BPMux } = require("bpmux");

class CSHClient implements ICSHClient {
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
            new PassThrough()
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
                this.mux.multiplex({ channel: SocketChannel.FROM_SEQ }),
                this.mux.multiplex({ channel: SocketChannel.LOG })
            ];

            this.connectionChannels.forEach((channel: Duplex) => {
                channel.on("error", () => {});
            });

            /**
             * @analyze-how-to-pass-in-out-streams
             * In UpstreamStreamsConfig streams:
             * input?: WritableStream - an input stream transporting data for processing to the Sequence
             * output?: ReadableStream - an output stream transporting data processed by the Sequence
             * Both of these steams must be piped here to the corresponding socket channels.
             * Additional stream is added to transport the package.
             * This stream should be closed when the package is received.
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
            // eslint-disable-next-line no-extra-parens
            (this.streams[8] as unknown as Readable).pipe(this.connectionChannels[8]); // log

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

    hookCommunicationHandler(communicationHandler: ICommunicationHandler) {
        if (typeof this.upstreamStreamsConfig === "undefined") {
            throw new Error("Upstreams not initated.");
        }

        communicationHandler.hookUpstreamStreams(this.upstreamStreamsConfig());
    }
}

export { CSHClient };
