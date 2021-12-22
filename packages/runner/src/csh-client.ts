/* eslint-disable dot-notation */
import { ICSHClient, UpstreamStreamsConfig, } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import * as net from "net";

type HostOpenConnections = [
    net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket
]

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
                        // Assuming number is from 0-7, sending 1 byte
                        connection.write(index.toString());

                        connection.on("error", (err) => {
                            this.logger.error(`Connection on instance ${id} from channel ${index} error`, err);
                        });

                        return connection;
                    });
                })
        );

        this._streams = openConnections as HostOpenConnections;
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
