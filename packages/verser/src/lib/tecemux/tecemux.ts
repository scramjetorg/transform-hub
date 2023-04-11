/* eslint-disable no-console */

import { TypedEmitter } from "@scramjet/utility";
import { FrameDecoder, FrameEncoder } from "./codecs";
import { Duplex } from "stream";
import { Socket } from "net";
import { ObjLogger } from "@scramjet/obj-logger";
import { FrameData, TeceMuxChannel, TeceMuxEvents } from "./types";
import { FramesKeeper } from "./frames-keeper";

export class TeceMux extends TypedEmitter<TeceMuxEvents> {
    id: string;
    carrierSocket: Duplex;
    channelCount = 1;
    framesSent = 0;
    carrierDecoder: FrameDecoder;
    framesKeeper = new FramesKeeper();
    sequenceNumber = Math.abs((Math.random() * (2 ** 32)) / 2 | 0);
    channels = new Map<number, TeceMuxChannel>();

    logger: ObjLogger;
    commonEncoder = new FrameEncoder(0, this);

    private async createChannel(destinationPort?: number, emit?: boolean): Promise<TeceMuxChannel> {
        const port = destinationPort !== undefined ? destinationPort : this.channelCount;

        this.logger.debug("Create Channel", port);

        const encoder = new FrameEncoder(port, this, { encoding: undefined });

        encoder.logger.updateBaseLog({ id: this.id });
        encoder.logger.pipe(this.logger);

        const channel: TeceMuxChannel = Object.assign(
            new Duplex({
                write: (chunk, encoding, next) => {
                    this.logger.debug("WRITE channel", channel._id, chunk);

                    if (chunk === null) {
                        this.logger.info("NULL ON CHANNEL");

                        channel.end();
                        return false;
                    }

                    return encoder.write(chunk, encoding, next);
                },
                read: (_size) => {
                    this.logger.debug("READ channel", channel._id);
                },
                allowHalfOpen: true
            }),
            {
                _id: port,
                encoder,
                closedByFIN: false
            }
        );

        encoder.out
            .pipe(this.carrierSocket, { end: false });

        channel
            .on("error", (error) => {
                this.logger.error("CHANNEL ERROR", error);
                this.emit("error", { error, source: channel });
            })
            // .on("destroy", () => {
            //     this.logger.trace("channel on DESTROY ", channel._id);
            // })
            // .on("abort", () => {
            //     this.logger.trace("channel on ABORT ", channel._id);
            // })
            .on("close", () => {
                this.logger.info("CHANNEL close", channel._id);
                this.sendFIN(channel._id);
            })
            // .on("end", () => {
            //     this.logger.info("CHANNEL end", channel._id);
            // })
            .on("finish", () => {
                this.logger.info("CHANNEL finish", channel._id);
                this.sendFIN(channel._id);
            });
            // .on("data", (d) => {
            //     if (d === null) {
            //         this.logger.info("CHANNEL end", channel._id);
            //     }
            // });

        if (emit) {
            await encoder.establishChannel(channel._id);
        }

        return channel;
    }

    constructor(socket: Socket, id = "") {
        super();
        this.id = id;
        this.logger = new ObjLogger(this, { id: this.id });
        this.carrierSocket = socket;

        this.carrierDecoder = new FrameDecoder({ emitClose: false })
            .on("error", (error) => {
                this.logger.error("Decoder error", error);
            });
            // .on("pause", () => {
            //     this.logger.warn("Decoder paused");
            // })
            // .on("close", () => {
            //     this.logger.warn("Decoder closed");
            // })
            // .on("end", () => {
            //     this.logger.warn("Decoder ended");
            // })
            // .on("abort", (error) => {
            //     this.logger.error("Decoder abort", error);
            // })
            // .on("destroy", (error) => {
            //     this.logger.error("Decoder destroy", error);
            // });

        this.carrierDecoder.logger.updateBaseLog({ id: this.id });
        this.carrierDecoder.logger.pipe(this.logger);

        this.carrierSocket.pipe(this.carrierDecoder, { end: false });

        this.commonEncoder.out.pipe(this.carrierSocket, { end: false });

        this.commonEncoder.logger.updateBaseLog({ id });
        this.commonEncoder.logger.pipe(this.logger);

        this.framesKeeper.logger.pipe(this.logger);

        this.main().catch((error) => {
            this.emit("error", error);
        });
    }

    async main() {
        let t = 0;

        for await (const chunk of this.carrierDecoder) {
            let frame: FrameData;

            try {
                frame = JSON.parse(chunk);
            } catch (err) {
                this.logger.error("error Parsing data from decoder", err, chunk, chunk.length, chunk.toString());
                continue;
            }

            const { flags, sequenceNumber, dataLength, destinationPort, acknowledgeNumber, error } = frame;

            if (error) {
                this.emit("error", frame);
                break;
            }

            let channel = this.channels.get(destinationPort);

            if (flags.ACK) {
                this.logger.trace("Received ACK flag for sequenceNumber", acknowledgeNumber);
                this.framesKeeper.handleACK(acknowledgeNumber);
                continue;
            }

            if (flags.FIN) {
                this.logger.trace(`Received FIN flag [C: ${destinationPort}]`, dataLength, frame.chunk, !!channel, channel?._id);

                if (channel) {
                    channel.closedByFIN = true;
                    if (!channel.writableEnded) {
                        channel.push(null);
                    }

                    if (channel.writableEnded && channel.readableEnded) {
                        channel.destroy();
                        this.logger.info("Channel destroy");
                    }
                } else {
                    this.logger.error("FIN for unknown channel");
                }

                this.sendACK(sequenceNumber, destinationPort);
                continue;
            }

            if (flags.PSH) {
                this.logger.trace(`Received PSH command [C: ${destinationPort}, SIZE: ${dataLength}]`);

                if (!channel) {
                    this.logger.warn("Unknown channel");
                    channel = await this.createChannel(destinationPort, false);

                    this.addChannel(channel, true);
                    //this.emit("peer", { channelId: destinationPort})
                }

                if (dataLength) {
                    this.logger.warn("writing to channel [channel, length]", channel._id, dataLength);
                    this.logger.warn("writing to channel [flowing, isPaused]", channel.readableFlowing, channel.isPaused());

                    channel.push(new Uint8Array((frame.chunk as any).data), undefined);

                    t += (frame.chunk as any).data.length;
                    this.logger.info("Writen", t);
                }

                this.sendACK(sequenceNumber, destinationPort);
            }
        }
    }

    sendACK(sequenceNumber: number, channel: number) {
        this.logger.debug("Write acknowledge frame for sequenceNumber", sequenceNumber);
        this.channels.get(channel)?.encoder?.push(
            this.commonEncoder.createFrame(undefined, {
                flagsArray: ["ACK"],
                acknowledgeNumber: sequenceNumber,
                destinationPort: channel
            })
        );
    }

    addChannel(channel: TeceMuxChannel, emit: boolean) {
        this.logger.debug("adding channel", channel._id);
        this.channels.set(channel._id, channel);

        if (emit) {
            this.emit("channel", channel);
            this.logger.debug("channel event emitted", channel._id);
        }

        this.channelCount++;
    }

    sendFIN(channel: number) {
        this.logger.debug("Write FIN frame for channel", channel);

        this.commonEncoder.push(
            this.commonEncoder.createFrame(undefined, {
                flagsArray: ["FIN"],
                destinationPort: channel
            })
        );
    }

    async multiplex(opts: { channel?: number } = {}): Promise<TeceMuxChannel> {
        const id = opts.channel !== undefined ? opts.channel : this.channelCount;
        const channel = await this.createChannel(id);

        this.logger.trace("Multiplex", id);

        await channel.encoder.establishChannel(id);

        this.addChannel(channel, true);

        this.logger.trace("Multiplex ready", channel._id);
        return channel;
    }
}

export { TeceMuxChannel };
