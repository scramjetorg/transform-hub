import { TypedEmitter } from "@scramjet/utility";
import { FrameDecoder, FrameEncoder } from "./codecs";
import { Duplex, PassThrough, Readable, ReadableOptions } from "stream";
import { Socket } from "net";
import { ObjLogger } from "@scramjet/obj-logger";
import { FrameData } from "./utils";
import { TeceMuxChannel, TeceMuxEvents } from "./types";
import { FramesKeeper } from "./frames-keeper";

export class TeceMux extends TypedEmitter<TeceMuxEvents> {
    id: string;
    carrierSocket: Duplex;
    channelCount = 1;
    decoder: FrameDecoder;
    framesKeeper = new FramesKeeper();
    sequenceNumber = 0;
    channels: TeceMuxChannel[] = [];

    logger: ObjLogger;
    commonEncoder = new FrameEncoder(0, this);

    private createChannel(destinationPort?: number, emit?: boolean): TeceMuxChannel {
        this.logger.debug("Create Channel", destinationPort || this.channelCount);

        const encoder = new FrameEncoder(this.channelCount, this, { encoding: undefined });

        encoder.logger.updateBaseLog({ id: this.id });
        encoder.logger.pipe(this.logger);

        //const w = new PassThrough().on("error", (error) => { this.logger.error("W error", error)});

        //w.pipe(encoder)

        const channel: TeceMuxChannel = Object.assign(
            new Duplex({
                write: (chunk, encoding, next) => {
                    this.logger.trace("WRITE channel", channel._id, chunk);

                    return encoder.write(chunk, encoding, next);
                },
                read: (_size) => {
                    this.logger.trace("READ channel", channel._id);
                },
                allowHalfOpen: true
            }),
            {
                _id: destinationPort || this.channelCount,
                encoder,
                closedByFIN: false
            }
        );

        encoder.out
            .pipe(this.carrierSocket, { end: false });

        channel
            .on("error", (error) => {
                this.logger.error("CHANNEL ERROR", error);

                debugger;
                //this.emit("error", { error, source: channel })
            })
            .on("destroy", () => {
                this.logger.trace("channel on DESTROY ", channel._id);
            })
            .on("abort", () => {
                this.logger.trace("channel on ABORT ", channel._id);
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
        this.logger = new ObjLogger(this, { id: this.id });
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
            /*.on("error", (error) => {
                this.logger.error("Decoder error", error);
            })*/
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

        this.commonEncoder.logger.updateBaseLog({ id });
        this.commonEncoder.logger.pipe(this.logger);

        this.framesKeeper.logger.pipe(this.logger);

        this.main().catch((error) => {
            this.emit("error", error);
        });
    }

    async main() {
        let t = 0;
        for await (const chunk of this.decoder) {
            //console.log(chunk);
            let frame: FrameData;

            try {
                frame = JSON.parse(chunk) as FrameData;
            } catch (error) {
                console.debug( chunk.toString())
                this.logger.error("error Parsing data from decoder", error, chunk, chunk.length, chunk.toString());
                continue;
            }

            //this.logger.debug("Decoded", { ...frame, stringified: "--not-displayed--" });

            const { flags, sequenceNumber, dataLength, destinationPort, acknowledgeNumber } = frame;

            let channel = this.channels[destinationPort];

            if (flags.ACK) {
                this.logger.trace("ACK frame received for sequenceNumber", acknowledgeNumber);
                //this.framesKeeper.onACK(sequenceNumber);
                continue;
            }

            if (flags.FIN) {
                this.logger.trace(`Received FIN command [C: ${destinationPort}]`, dataLength, frame.chunk, !!this.channels[destinationPort]);

                if (channel) {
                    //channel.end();
                    channel.closedByFIN = true;
                    channel.push(null);
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
                    channel = this.createChannel(destinationPort, false);

                    this.addChannel(channel, true);
                }

                if (dataLength) {
                    this.logger.warn("writing to channel [channel, length]", channel._id, dataLength);
                    this.logger.warn("writing to channel [flowing, isPaused]", channel.readableFlowing, channel.isPaused());

                    //Readable.from(chunk).pipe(channel, { end: false });//channel.write(new Uint8Array(((frame.chunk as any).data) as any));
                    //channel.push(frame.chunk, undefined);
                    channel.push(new Uint8Array((frame.chunk as any).data), undefined);

                    t += (frame.chunk as any).data.length;
                    this.logger.info("Writen", t)


                    /*
                        await new Promise<void>((resolve, reject) => {
                            this.logger.debug("waiting for drain!")
                            channel.on("drain", () => {
                                //channel.push(new Uint8Array(((frame.chunk as any).data) as any));
                                this.logger.debug("Drained!")
                                resolve();
                            });
                        });
                    }*/

                    //this.logger.info("Bytes written to channel [writeResult, channel, length]", written, destinationPort, dataLength);
                }

                this.sendACK(sequenceNumber, destinationPort);
            }
        }
    }

    sendACK(sequenceNumber: number, channel: number) {
        this.logger.debug("Write acknowledge frame for sequenceNumber", sequenceNumber);
        this.commonEncoder.push(
            this.commonEncoder.createFrame(undefined, {
                flagsArray: ["ACK"],
                acknowledgeNumber: sequenceNumber,
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
        this.logger.debug("Write FIN frame for channel", channel);
        this.commonEncoder.push(
            this.commonEncoder.createFrame(undefined, {
                flagsArray: ["FIN"],
                destinationPort: channel
            })
        );
    }

    multiplex(opts: { channel?: number } = {}): TeceMuxChannel {
        this.logger.trace("Multiplex");

        const channel = this.createChannel(opts.channel || this.channelCount, true);

        this.addChannel(channel, false);

        this.logger.trace("Multiplex ready", channel._id);
        return channel;
    }
}
export { TeceMuxChannel };

