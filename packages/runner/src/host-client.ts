/* eslint-disable dot-notation */
import { IHostClient, UpstreamStreamsConfig, } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import * as net from "net";

type HostOpenConnections = [
    net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket
]

/**
 * Connects to Host and exposes streams per channel (stdin, monitor etc.)
 */
class HostClient implements IHostClient {
    private _streams?: UpstreamStreamsConfig;

    logger: Console;

    constructor(private instancesServerPort: number, private instancesServerIp: string) {
        this.logger = getLogger(this);

        // eslint-disable-next-line no-console
        console.log(`Will connect to ${instancesServerIp}:${instancesServerPort}`);
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
                    // Error handling for each connection is process crash for now
                    const connection = net.createConnection(this.instancesServerPort, this.instancesServerIp);

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

                        return connection;
                    });
                })
        );

        this._streams = openConnections as HostOpenConnections;
    }

    async disconnect() {
        this.logger.log("Disconnecting from host");

        const streamsExitedPromised = this.streams.map(stream =>
            new Promise(
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

export { HostClient };
