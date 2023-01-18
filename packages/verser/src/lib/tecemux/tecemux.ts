import { TypedEmitter } from "@scramjet/utility";
import { FrameDecoder, FrameEncoder, TeceMuxEvents } from "./codecs";
import { Duplex, PassThrough } from "stream";
import { Socket } from "net";
import { ObjLogger } from "@scramjet/obj-logger";
import { FrameData } from "./utils";

export type TeceMuxChannel = Duplex & { _id: number, encoder: FrameEncoder };

export class TeceMux extends TypedEmitter<TeceMuxEvents>{
    id: string;
    carrierSocket: Duplex;
    channelCount = 1;
    decoder: FrameDecoder;

    channels: TeceMuxChannel[] = [];

    logger: ObjLogger;
    commonEncoder = new FrameEncoder(0);

    private createChannel(destinationPort?: number, emit?: boolean): TeceMuxChannel {
        this.logger.debug("Create Channel", destinationPort || this.channelCount);

        const encoder = new FrameEncoder(this.channelCount, { encoding: undefined });

        encoder.logger.updateBaseLog({ id: this.id });
        encoder.logger.pipe(this.logger);

        const w = new PassThrough({ encoding: undefined })

        process.nextTick(() => {
            w.on("data", (d) => { this.logger.warn("channel writeable on DATA", d); });
        });

        w.pipe(encoder).out.pipe(this.carrierSocket);

        const duplex = new Duplex({
            write: (chunk, encoding, next) => {
                this.logger.trace("WRITE channel", channel._id, chunk );
                w.write(chunk);
                next();
            },
            read: (size) => {
                this.logger.trace("READ channel", channel._id );
                //setTimeout(() => (channel as unknown as Duplex).write("a"), 1000);
            }
        });
        const channel: TeceMuxChannel = Object.assign(
            // Duplex.from({
            //     readable: new PassThrough({ encoding: undefined }).on("data", (d) => { this.logger.warn("channel readable on DATA", d); }),
            //     writable: w,
            // } as unknown as Iterable<any>) as TeceMuxChannel,
            duplex,
            {
                _id: destinationPort || this.channelCount,
                encoder
            }
        );

        channel.on("error", (error) => {
            this.logger.error("CHANNEL ERROR", error)
            //this.emit("error", { error, source: channel })
        }).on("destroy", () => {
                this.logger.trace("channel on DESTROY ", channel._id );
            })
            .on("abort", () => {
                this.logger.trace("channel on DESTROY ", channel._id );
            })

        if (emit) {
            encoder.setChannel(destinationPort || this.channelCount);
        }

        return channel;
    }

    constructor(socket: Socket, id = "") {
        super();
        this.id = id;
        this.logger = new ObjLogger(this, { id: this.id })
        this.carrierSocket = socket;

        this.decoder = new FrameDecoder({ emitClose: false })
            .on("pause", () => {
                this.logger.warn("Decoder paused");
            })
            .on("close", () => {
                this.logger.warn("Decoder closed");
            })
            .on("end", () => {
                this.logger.warn("Decoder ended");
            })
            .on("error", (error) => {
                this.logger.error("Decoder error", error);
                //debugger;
            })
            .on("abort", (error) => {
                this.logger.error("Decoder abort", error);
                //debugger;
            })
            .on("destroy", (error) => {
                this.logger.error("Decoder destroy", error);
                //debugger;
            });

        this.decoder.logger.updateBaseLog({ id: this.id });
        this.decoder.logger.pipe(this.logger);

        this.carrierSocket.pipe(this.decoder, { end: false });

        this.commonEncoder.out.pipe(this.carrierSocket, { end: false });

        this.main().catch((error) => {
            this.emit("error", error);
        });
    }

    async main() {
        this.commonEncoder.logger.updateBaseLog({ id: "CMN " + this.logger.baseLog.id })
        this.commonEncoder.logger.pipe(this.logger);

        for await (const chunk of this.decoder) {
            this.logger.debug("Decoded", JSON.parse(chunk));

            const frame = JSON.parse(chunk) as FrameData;
            const { flags, sequenceNumber, dataLength, destinationPort } = frame;

            if (flags.ACK) {
                this.logger.trace("ACKNOWLEDGE frame received for sequenceNumber", sequenceNumber);
                // acknowledge received (confirm packet)
                continue;
            }

            if (flags.PSH) {
                this.logger.trace(`Received PSH command [C: ${destinationPort}]`, dataLength, frame.chunk, !!this.channels[destinationPort]);
                let channel = this.channels[destinationPort]

                if (!channel) {
                    this.logger.warn("Unknown channel");
                    channel = this.createChannel(destinationPort, false);

                    this.addChannel(channel, true);
                }

                if (dataLength) {
                    this.logger.warn("writing to channel [channel, length]", channel._id, dataLength);

                    const written = channel.push(new Uint8Array(((frame.chunk as any).data) as any));

                    this.logger.info("Bytes written to channel [writeResult, channel, length]", written, destinationPort, dataLength);
                }
            }

            this.logger.debug("Write acknowledge frame for sequenceNumber", sequenceNumber);
            this.commonEncoder.push(
                this.commonEncoder.createFrame(undefined, {
                    flagsArray: ["ACK"],
                    sequenceNumber,
                    destinationPort
                })
            );
        }
    }

    addChannel(channel: TeceMuxChannel, emit: boolean) {
        this.logger.debug("adding channel", channel._id);
        this.channels[channel._id] = channel; // wait for SYN reply?

        if (emit) {
            this.emit("channel", channel);
            this.logger.debug("channel event emitted", channel._id);
        }

        this.channelCount++;
    }

    multiplex(): TeceMuxChannel {
        this.logger.trace("Multiplex");

        const channel = this.createChannel(this.channelCount, true);

        this.addChannel(channel, false);

        this.logger.trace("Multiplex ready", channel._id);
        return channel;
    }
}
