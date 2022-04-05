/* eslint-disable dot-notation */
import { IHostClient, IObjectLogger, UpstreamStreamsConfig, } from "@scramjet/types";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import net from "net";
import { ObjLogger } from "@scramjet/obj-logger";

type HostOpenConnections = [
    net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket
]

/**
 * Connects to Host and exposes streams per channel (stdin, monitor etc.)
 */
class HostClient implements IHostClient {
    private _streams?: UpstreamStreamsConfig;

    logger: IObjectLogger;

    constructor(private instancesServerPort: number, private instancesServerHost: string) {
        this.logger = new ObjLogger(this);
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
                    const connection = net.createConnection(this.instancesServerPort, this.instancesServerHost);

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
        this.logger.debug("Connected to host");
    }

    async disconnect() {
        this.logger.trace("Disconnecting from host");

        const streamsExitedPromised: Promise<void>[] = this.streams.map(stream =>
            new Promise(
                (res) => {
                    if ("writable" in stream!) {
                        stream
                            .on("close", () => {
                                console.error("END");
                                res();
                            })
                            .end();
                    } else {
                        stream!.destroy();
                        res();
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
