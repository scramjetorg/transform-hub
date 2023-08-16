/* eslint-disable dot-notation */
import { IHostClient, IObjectLogger, UpstreamStreamsConfig, } from "@scramjet/types";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import net, { createConnection, Socket } from "net";
import { ObjLogger } from "@scramjet/obj-logger";
import { Agent } from "http";
import { TeceMux, TeceMuxChannel } from "@scramjet/verser";

type HostOpenConnections = [
    TeceMuxChannel, TeceMuxChannel, TeceMuxChannel, TeceMuxChannel, TeceMuxChannel, TeceMuxChannel, TeceMuxChannel, TeceMuxChannel, TeceMuxChannel
]

/**
 * Connects to Host and exposes streams per channel (stdin, monitor etc.)
 */
class HostClient implements IHostClient {
    private _streams?: UpstreamStreamsConfig;
    public agent?: Agent;
    logger: IObjectLogger;
    hubTunnel!: TeceMux;

    constructor(private instancesServerPort: number, private instancesServerHost: string) {
        this.logger = new ObjLogger(this);
    }

    private get streams(): UpstreamStreamsConfig {
        if (!this._streams) {
            throw new Error("Accessing streams before initialization");
        }

        return this._streams;
    }

    getAgent() {
        if (this.agent) {
            return this.agent;
        }

        throw new Error("No HTTP Agent set");
    }

    async init(id: string): Promise<void> {
        const hostSocket = net.createConnection(this.instancesServerPort, this.instancesServerHost);
        const protocol = new TeceMux(hostSocket);

        //protocol.logger.pipe(this.logger);
        hostSocket.setNoDelay(true);

        const openConnections = await Promise.all(
            Array.from(Array(9)).map((_c, index) => protocol.multiplex({ channel: index }))
        ).then(async res => {
            return Promise.all(
                res.map(async (channel, index) => {
                    // Assuming id is exactly 36 bytes + Assuming number is from 0-8, sending 1 byte
                    channel.write(id + "" + index);

                    return channel;
                })
            );
        });

        this._streams = openConnections as HostOpenConnections;

        const agent = new Agent() as Agent & {
            createConnection: typeof createConnection
        }; // lack of types?;

        agent.createConnection = () => {
            try {
                const socket = protocol.multiplex() as unknown as Socket;

                socket.on("error", () => {
                    this.logger.error("Muxed stream error");
                });

                // mock Socket's setKeepAlive in TeceMuxChannel.
                socket.setKeepAlive ||= (_enable?: boolean, _initialDelay?: number | undefined) => socket;

                this.logger.info("Creating connection to verser server");

                return socket;
            } catch (error) {
                const ret = new Socket();

                setImmediate(() => ret.emit("error", error));
                return ret;
            }
        };

        this.agent = agent;

        this.logger.debug("Connected to host");
    }

    async disconnect() {
        this.logger.trace("Disconnecting from host");

        const streamsExitedPromised: Promise<void>[] = this.streams.map((stream, _i) =>
            new Promise(
                (res) => {
                    // now we have readable and writable always
                    stream!.destroy();
                    res();
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
