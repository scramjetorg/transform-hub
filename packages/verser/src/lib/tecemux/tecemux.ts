/* eslint-disable no-console */

import { TypedEmitter } from "@scramjet/utility";
import { FrameDecoder } from "./codecs";
import { Duplex } from "stream";
import { Socket } from "net";
import { ObjLogger } from "@scramjet/obj-logger";
import { FrameData, TeceMuxEvents } from "./types";
import { FramesKeeper } from "./frames-keeper";
import { TeceMuxChannel } from "./tecemux-channel";

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

    private createChannel(destinationPort?: number): TeceMuxChannel {
        const port = destinationPort !== undefined ? destinationPort : this.channelCount;

        this.logger.debug("Create Channel", port);

        const channel = new TeceMuxChannel({ allowHalfOpen: true }, port, this);


        channel.encoder.out
            .pipe(this.carrierSocket, { end: false });

        channel
            .on("error", (error) => {
                this.logger.error("CHANNEL ERROR", error);
                this.emit("error", { error, source: channel });
            })
            .on("close", () => {
                this.logger.info("CHANNEL close", channel._id);
                this.sendFIN(channel._id);
            })
            .on("finish", () => {
                this.logger.info("CHANNEL finish", channel._id);
                this.sendFIN(channel._id);
            });

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

        this.carrierDecoder.logger.updateBaseLog({ id: this.id });
        this.carrierDecoder.logger.pipe(this.logger);

        this.carrierSocket.pipe(this.carrierDecoder, { end: false });

        this.framesKeeper.logger.pipe(this.logger);

        this.main().catch((error) => {
            this.emit("error", error);
        });
    }

    async main() {
        for await (const chunk of this.carrierDecoder) {
            if (await this.handleDecodedFrame(chunk)) break;
        }
    }

    async handleDecodedFrame(chunk: any) {
        let frame: FrameData;

        try {
            frame = JSON.parse(chunk);
        } catch (err) {
            this.logger.error("error Parsing data from decoder", err, chunk, chunk.length, chunk.toString());
            this.emit("error", { chunk });
            return 1;
        }

        const { flags, sequenceNumber, dataLength, destinationPort, acknowledgeNumber, error } = frame;

        if (error) {
            this.emit("error", { frame, chunk });
            return 2;
        }

        if (flags.ACK) {
            this.logger.trace("Received ACK flag for sequenceNumber", acknowledgeNumber);
            this.framesKeeper.handleACK(acknowledgeNumber);

            return 0;
        }

        let channel = this.channels.get(destinationPort);

        if (flags.FIN) {
            this.logger.trace(`Received FIN flag [C: ${destinationPort}]`, dataLength, frame.chunk, !!channel, channel?._id);

            if (channel) {
                channel.handlerFIN();
                channel.sendACK(sequenceNumber);
            } else {
                this.logger.error("FIN for unknown channel");
            }

            return 0;
        }

        if (flags.PSH) {
            this.logger.trace(`Received PSH command [C: ${destinationPort}, SIZE: ${dataLength}]`);

            if (!channel) {
                this.logger.warn("Unknown channel");
                channel = this.createChannel(destinationPort);

                this.addChannel(channel, true);
            }

            if (dataLength) {
                this.logger.warn("writing to channel [channel, length]", channel._id, dataLength);
                this.logger.warn("writing to channel [flowing, isPaused]", channel.readableFlowing, channel.isPaused());

                channel.__readable.push(new Uint8Array((frame.chunk as any).data), undefined);
            }

            channel.sendACK(sequenceNumber);
        }

        return 0;
    }

    sendACK(sequenceNumber: number, channelId: number) {
        this.logger.debug("Write acknowledge frame for sequenceNumber", sequenceNumber);
        const channel = this.channels.get(channelId);

        channel?.encoder.push(
            channel.encoder.createFrame(undefined, {
                flagsArray: ["ACK"],
                acknowledgeNumber: sequenceNumber,
                destinationPort: channelId
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

    sendFIN(channelId: number) {
        this.logger.debug("Write FIN frame for channel", channelId);

        const channel = this.channels.get(channelId)!;

        channel.encoder.push(
            channel.encoder.createFrame(undefined, {
                flagsArray: ["FIN"],
                destinationPort: channelId
            })
        );
    }

    multiplex(opts: { channel?: number } = {}): TeceMuxChannel {
        const id = opts.channel !== undefined ? opts.channel : this.channelCount;
        const channel = this.createChannel(id);

        this.logger.trace("Multiplex", id);

        this.addChannel(channel, true);
        channel.encoder.establishChannel(id);

        this.logger.trace("Multiplex ready", channel._id);
        return channel;
    }
}

export { TeceMuxChannel };
