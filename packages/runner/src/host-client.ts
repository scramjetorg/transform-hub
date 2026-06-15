/* eslint-disable dot-notation */
import { ObjLogger } from "@scramjet/obj-logger";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import { IHostClient, IObjectLogger, UpstreamStreamsConfig } from "@scramjet/types";
import { defer } from "@scramjet/utility";
import { Agent } from "http";
import net, { Socket } from "net";
import { PassThrough } from "stream";

/** Default channel set: every host channel (legacy parity). */
export const ALL_CHANNELS: ReadonlySet<CC> = new Set<CC>([
    CC.STDIN, CC.STDOUT, CC.STDERR, CC.CONTROL, CC.MONITORING,
    CC.IN, CC.OUT, CC.LOG, CC.REQUESTS,
]);

/** Channels owned by the outer `packages/runner` process under split ownership. */
export const OUTER_RUNNER_CHANNELS: ReadonlySet<CC> = new Set<CC>([
    CC.STDIN, CC.STDOUT, CC.STDERR, CC.CONTROL, CC.MONITORING,
]);

/**
 * Connects to Host and exposes streams per channel (stdin, monitor etc.).
 *
 * Selective channel opening: when `channels` is provided to {@link init},
 * only the listed channel slots are populated; the rest stay `undefined`.
 * {@link disconnect} tolerates the gaps. This supports split ownership
 * between the outer runner (which owns launcher plumbing + STDIN/STDOUT/
 * STDERR/CONTROL/MONITORING) and runner-node (which owns the semantic
 * IN/OUT/LOG/REQUESTS channels).
 */
class HostClient implements IHostClient {
    private _streams?: Array<Socket | PassThrough | undefined>;
    logger: IObjectLogger;

    constructor(private instancesServerPort: number, private instancesServerHost: string) {
        this.logger = new ObjLogger(this);
    }

    private get streams(): Array<Socket | PassThrough | undefined> {
        if (!this._streams) {
            throw new Error("Accessing streams before initialization");
        }

        return this._streams;
    }

    getAgent(): Agent {
        throw new Error("No HTTP Agent set");
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
        this._streams = await this.connect(id, channels);

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
            const inputTarget = new PassThrough({ emitClose: false });

            input.on("end", async () => {
                await defer(500);

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
            //this._streams[CC.STDIN] = this._streams[CC.STDIN].pipe(new PassThrough({ emitClose: false }), { end: false });
        }

        this.logger.debug("Connected to host");
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

                    if ([CC.IN, CC.STDIN, CC.CONTROL].includes(i)) {
                        res();
                        return;
                    }

                    if ((stream as net.Socket).destroyed || (stream as net.Socket).closed) {
                        res();
                        return;
                    }

                    if (!hard && "writable" in stream) {
                        stream
                            .on("error", (e) => {
                                console.error("Error on stream", i, e.stack);
                            })
                            .on("close", () => {
                                res();
                            })
                            .end();
                    } else {
                        stream.destroy();
                        res();
                    }
                }
            ));

        await Promise.all(streamsExitedPromised);
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
