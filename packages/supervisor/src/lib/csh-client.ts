/* eslint-disable dot-notation */
import { ICommunicationHandler, ICSHClient, UpstreamStreamsConfig } from "@scramjet/types";
import { CommunicationChannel, SupervisorError } from "@scramjet/model";
import * as net from "net";
import { Duplex, PassThrough, Readable } from "stream";
import { getLogger } from "@scramjet/logger";

const { BPMux } = require("bpmux");

class CSHClient implements ICSHClient {
    private socketPath: string;
    private packageStream: PassThrough;
    private streams?: UpstreamStreamsConfig;
    private connectionChannels?: any[];
    private connection?: net.Socket;

    private mux: any;

    logger: Console;

    constructor(socketPath: string) {
        this.socketPath = socketPath;
        this.logger = getLogger(this);
        this.packageStream = new PassThrough();
    }

    async init(): Promise<void> {
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

        await this.connect();
    }

    connect(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.streams) {
                throw new SupervisorError("UNINITIALIZED_STREAMS");
            }
            this.logger.info("Connecting to", this.socketPath);

            this.connection = net.createConnection({
                path: this.socketPath
            });

            this.mux = new BPMux(this.connection);

            this.connectionChannels = [
                this.mux.multiplex({ channel: CommunicationChannel.STDIN }),
                this.mux.multiplex({ channel: CommunicationChannel.STDOUT }),
                this.mux.multiplex({ channel: CommunicationChannel.STDERR }),
                this.mux.multiplex({ channel: CommunicationChannel.CONTROL }),
                this.mux.multiplex({ channel: CommunicationChannel.MONITORING }),
                this.mux.multiplex({ channel: CommunicationChannel.PACKAGE }),
                this.mux.multiplex({ channel: CommunicationChannel.LOG })
            ];

            this.connectionChannels.forEach((channel: Duplex) => {
                channel.on("error", (e) => this.logger.warn(e.stack));
            });

            this.connectionChannels[CommunicationChannel.STDIN].pipe(this.streams[CommunicationChannel.STDIN]);
            this.connectionChannels[CommunicationChannel.CONTROL].pipe(this.streams[CommunicationChannel.CONTROL]);
            this.connectionChannels[CommunicationChannel.PACKAGE].pipe(this.packageStream);
            this.connectionChannels[CommunicationChannel.IN_DOWN_STR]
                .pipe(this.streams[CommunicationChannel.IN_DOWN_STR]);

            this.streams[CommunicationChannel.STDOUT].pipe(this.connectionChannels[CommunicationChannel.STDOUT]);
            this.streams[CommunicationChannel.STDERR].pipe(this.connectionChannels[CommunicationChannel.STDERR]);
            // eslint-disable-next-line no-extra-parens
            (this.streams[CommunicationChannel.MONITORING] as unknown as Readable)
                .pipe(this.connectionChannels[CommunicationChannel.MONITORING]);
            // eslint-disable-next-line no-extra-parens
            (this.streams[CommunicationChannel.LOG] as unknown as Readable)
                .pipe(this.connectionChannels[CommunicationChannel.LOG]);
            // eslint-disable-next-line no-extra-parens
            (this.streams[CommunicationChannel.OUT_DOWN_STR] as unknown as Readable)
                .pipe(this.connectionChannels[CommunicationChannel.OUT_DOWN_STR]);

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
        if (typeof this.upstreamStreamsConfig() === "undefined") {
            throw new SupervisorError("UNINITIALIZED_STREAMS", { details: "CSHClient" });
        }
        communicationHandler.hookUpstreamStreams(this.upstreamStreamsConfig());

        //const { out, err } = communicationHandler.getLogOutput();

        //addLoggerOutput(out, err);
    }
}

export { CSHClient };
