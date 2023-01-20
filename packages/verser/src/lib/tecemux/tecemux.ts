import { TypedEmitter } from "@scramjet/utility";
import { FrameDecoder, FrameEncoder, TeceMuxEvents } from "./codecs";
import { Duplex, PassThrough } from "stream";
import { Socket } from "net";
import { ObjLogger } from "@scramjet/obj-logger";
import { FrameData } from "./utils";

export type TeceMuxChannel = Duplex & {
    _id: number,
    encoder: FrameEncoder,
    closedByFIN: boolean
};

export class TeceMux extends TypedEmitter<TeceMuxEvents>{
    id: string;
    carrierSocket: Duplex;
    channelCount = 1;
    decoder: FrameDecoder;
    sequenceNumber = 0;
    channels: TeceMuxChannel[] = [];

    logger: ObjLogger;
    commonEncoder = new FrameEncoder(0, this);

    private createChannel(destinationPort?: number, emit?: boolean): TeceMuxChannel {
        this.logger.debug("Create Channel", destinationPort || this.channelCount);

        const encoder = new FrameEncoder(this.channelCount, this, { encoding: undefined });

        encoder.logger.updateBaseLog({ id: this.id });
        encoder.logger.pipe(this.logger);

        const w = new PassThrough({ encoding: undefined, allowHalfOpen: true });

        w.pipe(encoder, { end: false }).out.pipe(this.carrierSocket, { end: false });

        const duplex = new Duplex({
            write: (chunk, encoding, next) => {
                this.logger.trace("WRITE channel", channel._id, chunk, chunk.toString() );

                if (!w.push(chunk)) {
                    w.once("drain", next);
                } else {
                    next();
                }
            },
            read: (size) => {
                this.logger.trace("READ channel", channel._id );
            },
            allowHalfOpen: true
        });
        const channel: TeceMuxChannel = Object.assign(
            duplex,
            {
                _id: destinationPort || this.channelCount,
                encoder,
                closedByFIN: false
            }
        );

        process.nextTick(() => {
            w.on("data", (d) => { this.logger.warn("channel writeable on DATA", d); });
        });

        channel
            .on("error", (error) => {
                this.logger.error("CHANNEL ERROR", error)
                //this.emit("error", { error, source: channel })
            })
            .on("destroy", () => {
                this.logger.trace("channel on DESTROY ", channel._id );
            })
            .on("abort", () => {
                this.logger.trace("channel on ABORT ", channel._id );
            })
            .on("end", () => {
                this.logger.info("CHANNEL end", channel._id);
                if (!channel.closedByFIN) {
                    this.sendFIN(channel._id);
                }
            });

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
            })
            .on("abort", (error) => {
                this.logger.error("Decoder abort", error);
            })
            .on("destroy", (error) => {
                this.logger.error("Decoder destroy", error);
            });

        this.decoder.logger.updateBaseLog({ id: this.id });
        this.decoder.logger.pipe(this.logger);

        this.carrierSocket.pipe(this.decoder, { end: false });

        this.commonEncoder.out.pipe(this.carrierSocket, { end: false });

        this.commonEncoder.logger.updateBaseLog({ id })
        this.commonEncoder.logger.pipe(this.logger);

        this.main().catch((error) => {
            this.emit("error", error);
        });
    }

    async main() {
        for await (const chunk of this.decoder) {
            this.logger.debug("Decoded", JSON.parse(chunk));

            const frame = JSON.parse(chunk) as FrameData;
            const { flags, sequenceNumber, dataLength, destinationPort } = frame;

            let channel = this.channels[destinationPort]

            if (flags.ACK) {
                this.logger.trace("ACK frame received for sequenceNumber", sequenceNumber);
                continue;
            }

            if (flags.FIN) {
                this.logger.trace(`Received FIN command [C: ${destinationPort}]`, dataLength, frame.chunk, !!this.channels[destinationPort]);

                if (channel) {
                    //channel.end();
                    channel.closedByFIN = true;
                    channel.push(null)
                } else {
                    this.logger.error("FIN for unknown channel");
                }
            }

            if (flags.PSH) {
                this.logger.trace(`Received PSH command [C: ${destinationPort}]`, dataLength, frame.chunk, !!this.channels[destinationPort]);

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

            this.sendACK(sequenceNumber, destinationPort);
        }
    }

    sendACK(sequenceNumber: number, channel: number) {
        this.logger.debug("Write acknowledge frame for sequenceNumber", sequenceNumber);
        this.commonEncoder.push(
            this.commonEncoder.createFrame(undefined, {
                flagsArray: ["ACK"],
                sequenceNumber,
                destinationPort: channel
            })
        );
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

    sendFIN(channel: number) {
        this.logger.debug("Write acknowledge frame for sequenceNumber");
        this.commonEncoder.push(
            this.commonEncoder.createFrame(undefined, {
                flagsArray: ["FIN"],
                destinationPort: channel
            })
        );
    }

    multiplex(opts: { channel?: number } = {} ): TeceMuxChannel {
        this.logger.trace("Multiplex");

        const channel = this.createChannel(opts.channel || this.channelCount, true);

        this.addChannel(channel, false);

        this.logger.trace("Multiplex ready", channel._id);
        return channel;
    }
}
