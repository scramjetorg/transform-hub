import { ObjLogger } from "@scramjet/obj-logger";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import { IHostClient, IObjectLogger, UpstreamStreamsConfig } from "@scramjet/types";
import { defer } from "@scramjet/utility";
import { createVerserBroker } from "@signicode/verser2-guest-node";
import { Agent } from "http";
import net, { Socket, createConnection } from "net";
import { PassThrough } from "stream";
import { RunnerNodeBootConfig } from "./boot-config";

type AgentWithCreateConnection = Agent & { createConnection: typeof createConnection };
type Verser2RuntimeConfig = NonNullable<RunnerNodeBootConfig["verser2Runtime"]>;
type Verser2BrokerLike = {
    connect(): Promise<void>;
    close(reason?: string): Promise<void>;
    createAgent(): Agent;
};
type Verser2BrokerFactory = (options: {
    hostUrl: string;
    brokerId: string;
    leaseAcquireTimeoutMs?: number;
    tls?: Record<string, unknown>;
}) => Verser2BrokerLike;

/** Default channel set: every host channel (legacy parity). */
export const ALL_CHANNELS: ReadonlySet<CC> = new Set<CC>([
    CC.STDIN, CC.STDOUT, CC.STDERR, CC.CONTROL, CC.MONITORING,
    CC.IN, CC.OUT, CC.LOG, CC.REQUESTS,
]);

/**
 * Connects to Host and exposes streams per channel (stdin, monitor etc.).
 *
 * Owned by runner-node: the child runtime is responsible for opening sockets,
 * wrapping the IN channel with a PassThrough. Sequence-local API client
 * transport is provided by verser2 runtime configuration.
 *
 * Selective channel opening: when `channels` is provided to {@link init} or
 * {@link initWithStreams}, only the listed channel slots are populated; the
 * rest stay `undefined`. {@link disconnect} tolerates the gaps.
 */
class HostClient implements IHostClient {
    private _streams?: Array<Socket | PassThrough | undefined>;
    public agent?: Agent;
    logger: IObjectLogger;
    verser2Broker?: Verser2BrokerLike;
    public inputEndDeferMs = 500;
    private inputSource?: Socket;

    constructor(
        private instancesServerPort: number,
        private instancesServerHost: string,
        private requestsUnsupported?: string,
        private verser2Runtime?: Verser2RuntimeConfig,
        private createBroker: Verser2BrokerFactory = createVerserBroker as unknown as Verser2BrokerFactory
    ) {
        this.logger = new ObjLogger(this);
    }

    private get streams(): Array<Socket | PassThrough | undefined> {
        if (!this._streams) {
            throw new Error("Accessing streams before initialization");
        }

        return this._streams;
    }

    getAgent() {
        if (this.agent) {
            return this.agent;
        }

        if (this.requestsUnsupported) {
            this.agent = this.createUnsupportedRequestsAgent(this.requestsUnsupported);
            return this.agent;
        }

        throw new Error("No HTTP Agent set");
    }

    getApiBase(): string {
        return this.verser2Runtime?.hubTargetDomain
            ? `http://${this.verser2Runtime.hubTargetDomain}/api/v1`
            : "http://scramjet-host/api/v1";
    }

    getV2ApiBase(): string {
        return this.verser2Runtime?.hubTargetDomain
            ? `http://${this.verser2Runtime.hubTargetDomain}/api/v2`
            : "http://scramjet-host/api/v2";
    }

    private async connectOne(i: number): Promise<Socket> {
        return new Promise<Socket>((res, rej) => {
            try {
                const connection = net.createConnection(this.instancesServerPort, this.instancesServerHost);

                connection.setNoDelay(true);
                connection.on("error", rej);
                connection.on("connect", () => {
                    res(connection);
                    connection.removeAllListeners("error");
                    connection.on("error", () => {
                        this.logger.warn(`${i} Stream error`);
                    });
                });
            } catch (e) {
                rej(e);
            }
        });
    }

    private async connect(id: string, channels: ReadonlySet<CC>): Promise<Array<Socket | undefined>> {
        const slots: Array<Socket | undefined> = new Array(9).fill(undefined);
        const opened = await Promise.all(
            Array.from(channels.values()).map(async (channelIdx) => {
                const conn = await this.connectOne(channelIdx);

                // Assuming id is exactly 36 bytes
                conn.write(id);
                // Channel index 0-8 fits one ASCII byte
                conn.write(channelIdx.toString());
                return [channelIdx, conn] as const;
            })
        );

        for (const [channelIdx, conn] of opened) {
            slots[channelIdx] = conn;
        }

        return slots;
    }

    async init(id: string, channels: ReadonlySet<CC> = ALL_CHANNELS): Promise<void> {
        const streams = await this.connect(id, channels);

        this.initWithStreams(streams as unknown as UpstreamStreamsConfig);
        await this.initVerser2BrokerAgent();
    }

    initWithStreams(streams: UpstreamStreamsConfig): void {
        // Tolerate sparse arrays for selective channel opening. Cast through
        // a private union so the rest of the file can branch on undefined.
        this._streams = streams as unknown as Array<Socket | PassThrough | undefined>;

        const outStream = this._streams[CC.OUT];

        if (outStream) {
            outStream.on("end", () => {
                this.logger.info(
                    "Total data written to instance output",
                    (outStream as net.Socket).bytesWritten
                );
            });
        }

        const input = this._streams[CC.IN];

        if (input) {
            this.inputSource = input as Socket;
            const inputTarget = new PassThrough({ emitClose: false });

            input.on("end", async () => {
                await defer(this.inputEndDeferMs);

                const control = this._streams![CC.CONTROL] as net.Socket | undefined;

                if (control && control.readableEnded) {
                    this.logger.info("Input end. Control is also ended... We are disconnected.");
                } else if (control) {
                    this.logger.info("Input end. Control not ended. We are online. Desired input end.");
                    inputTarget.end();
                } else {
                    // No CONTROL channel owned by this client - just propagate.
                    inputTarget.end();
                }
            });

            input.pipe(inputTarget, { end: false });

            this._streams[CC.IN] = inputTarget;
        }

        this.logger.debug("Connected to host");
    }

    private async initVerser2BrokerAgent(): Promise<void> {
        if (!this.verser2Runtime) {
            return;
        }

        this.verser2Broker = this.createBroker({
            hostUrl: this.verser2Runtime.hostUrl,
            brokerId: this.verser2Runtime.hubBrokerId,
            leaseAcquireTimeoutMs: this.verser2Runtime.leaseAcquireTimeoutMs,
            tls: this.verser2Runtime.tls
        });
        await this.verser2Broker.connect();
        this.agent = this.verser2Broker.createAgent();
    }

    private createUnsupportedRequestsAgent(message: string): Agent {
        const agent = new Agent() as AgentWithCreateConnection;

        agent.createConnection = () => {
            const socket = new Socket();

            setImmediate(() => socket.emit("error", new Error(message)));
            return socket;
        };

        return agent;
    }

    async disconnect(hard: boolean) {
        this.logger.trace("Disconnecting from host");

        const streamsExitedPromised: Promise<void>[] = this.streams.map((stream, i) =>
            new Promise<void>(
                (res) => {
                    if (!stream) {
                        // Channel was not opened by this client (split ownership).
                        res();
                        return;
                    }

                    if (i === CC.IN) {
                        this.inputSource?.destroy();
                        stream.destroy();
                        res();
                        return;
                    }

                    if ([CC.STDIN, CC.CONTROL].includes(i)) {
                        res();
                        return;
                    }

                    if ((stream as net.Socket).destroyed || (stream as net.Socket).closed) {
                        res();
                        return;
                    }

                    if (!hard && "writable" in stream) {
                        let done = false;
                        const finish = () => {
                            if (!done) {
                                done = true;
                                res();
                            }
                        };

                        stream
                            .on("error", (e) => {
                                console.error("Error on stream", i, e.stack);
                            })
                            .on("close", finish)
                            .end(finish);
                    } else {
                        stream.destroy();
                        res();
                    }
                }
            ));

        await Promise.all(streamsExitedPromised);
        await this.verser2Broker?.close(hard ? "hard-disconnect" : "disconnect");
        this.verser2Broker = undefined;
    }

    private requireStream<T>(idx: CC): T {
        const s = this.streams[idx];

        if (!s) {
            throw new Error(`Channel ${CC[idx]} not opened on this HostClient`);
        }

        return s as unknown as T;
    }

    get stdinStream() {
        return this.requireStream<UpstreamStreamsConfig[CC.STDIN]>(CC.STDIN);
    }

    get stdoutStream() {
        return this.requireStream<UpstreamStreamsConfig[CC.STDOUT]>(CC.STDOUT);
    }

    get stderrStream() {
        return this.requireStream<UpstreamStreamsConfig[CC.STDERR]>(CC.STDERR);
    }

    get controlStream() {
        return this.requireStream<UpstreamStreamsConfig[CC.CONTROL]>(CC.CONTROL);
    }

    get monitorStream() {
        return this.requireStream<UpstreamStreamsConfig[CC.MONITORING]>(CC.MONITORING);
    }

    get inputStream() {
        return this.requireStream<UpstreamStreamsConfig[CC.IN]>(CC.IN);
    }

    get outputStream() {
        return this.requireStream<UpstreamStreamsConfig[CC.OUT]>(CC.OUT);
    }

    get logStream() {
        return this.requireStream<UpstreamStreamsConfig[CC.LOG]>(CC.LOG);
    }

    get requestsStream() {
        return this.streams[CC.REQUESTS] as UpstreamStreamsConfig[CC.REQUESTS] | undefined;
    }
}

export { HostClient };
