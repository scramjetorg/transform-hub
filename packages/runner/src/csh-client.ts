/* eslint-disable dot-notation */
import { ICSHClient, UpstreamStreamsConfig, ReadableStream, WritableStream } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import * as net from "net";

type RunnerOpenConnections = [
    net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket
]

function mapHostConnectionToStreams(connections: RunnerOpenConnections): UpstreamStreamsConfig<true> {
    const stdin = connections[0] as ReadableStream<string>;
    const stdout = connections[1] as WritableStream<string>;
    const stderr = connections[2] as WritableStream<string>;
    const control = connections[3] as ReadableStream<string>;
    const monitor = connections[4] as WritableStream<string>;
    const input = connections[5] as ReadableStream<any>;
    const output = connections[6] as WritableStream<any>;
    const log = connections[7] as WritableStream<string>;

    return [
        stdin,
        stdout,
        stderr,
        control,
        monitor,
        input,
        output,
        log
    ];
}

class CSHClient implements ICSHClient {
    private _streams?: UpstreamStreamsConfig;
    private connection?: net.Socket;

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
        const openConnections = await Promise.all(
            Array.from(Array(8))
                .map(() => {
                    const connection = net.createConnection({
                        port: this.instancesServerPort
                    });

                    return new Promise<net.Socket>(res => {
                        connection.on("connect", () => res(connection));
                    });
                })
                .map((connPromised, index) => {
                    return connPromised.then((connection) => {
                        // Assuming id is exactly 36 bytes
                        connection.write(id);
                        // Assuming number is from 0-8, sending 1 byte
                        connection.write(index.toString());

                        connection.on("error", (err) => {
                            this.logger.error(err);
                        });

                        return connection;
                    });
                })
        );

        this._streams = mapHostConnectionToStreams(openConnections as RunnerOpenConnections);
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
