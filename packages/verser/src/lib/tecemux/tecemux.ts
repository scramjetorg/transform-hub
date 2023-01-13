import { TypedEmitter } from "@scramjet/utility";
import { FrameDecoder, FrameEncoder, TeceMuxEvents } from "./codecs";
import { Duplex } from "stream";
import { Socket } from "net";
import { ObjLogger } from "@scramjet/obj-logger";
import { FrameData } from "./utils";

export type TeceMuxChannel = Duplex & { _id: number };

export class TeceMux extends TypedEmitter<TeceMuxEvents>{
    carrierSocket: Duplex;
    channelCount = 0;
    decoder = new FrameDecoder();

    channels: Duplex[] = [];

    logger = new ObjLogger(this);
    commonEncoder = new FrameEncoder(0);

    private createChannel(): TeceMuxChannel {
        const channel: TeceMuxChannel = Object.assign(new Duplex({ }), { _id: this.channelCount });

        const encoder = new FrameEncoder(this.channelCount);

        channel.pipe(encoder).pipe(this.carrierSocket);
        channel.on("error", (error) => {
            this.emit("error", { error, source: channel })
        });

        encoder.setChannel();

        return channel;
    }

    constructor(socket: Socket) {
        super();
        this.carrierSocket = socket;

        this.main().catch((error) => {
            this.emit("error", error);
        });

        socket.pipe(this.decoder);
    }

    async main() {
        for await (const chunk of this.decoder) {
            const frame = JSON.parse(chunk) as FrameData;
            const { flags, sequenceNumber, dataLength, destinationPort } = frame;

            if (flags.ACK) {
                this.logger.trace("ACKNOWLEDGE", sequenceNumber);
                // acknowledge received (confirm packet)
                return;
            }

            if (flags.PSH) {
                if (!this.channels[destinationPort]) {
                    const channel = this.createChannel();

                    this.addChannel(channel);
                    this.commonEncoder.createFrame(undefined, {
                        flagsArray: ["ACK"],
                        destinationPort,
                        acknowledgeNumber: sequenceNumber
                    })
                }

                if (dataLength) {
                    this.channels[destinationPort].write(frame.chunk);
                }
            }
        }
    }

    addChannel(channel: TeceMuxChannel) {
        this.channels[this.channelCount] = channel; // wait for SYN reply?
        this.channelCount++;

        this.emit("channel", channel);
    }

    multiplex(): TeceMuxChannel {
        const channel = this.createChannel();

        this.addChannel(channel);

        return channel;
    }
}
