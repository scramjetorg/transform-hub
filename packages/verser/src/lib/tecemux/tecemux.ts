import { TypedEmitter } from "@scramjet/utility";
import { FrameDecoder, FrameEncoder, TeceMuxEvents } from "./codecs";
import { Duplex, PassThrough } from "stream";
import { Socket } from "net";
import { ObjLogger } from "@scramjet/obj-logger";
import { FrameData } from "./utils";
import { IObjectLogger } from "@scramjet/types";

export type TeceMuxChannel = Duplex & { _id: number, encoder: FrameEncoder };

export class TeceMux extends TypedEmitter<TeceMuxEvents>{
    id: string;
    carrierSocket: Duplex;
    channelCount = 1;
    decoder = new FrameDecoder().resume();

    channels: TeceMuxChannel[] = [];

    logger: IObjectLogger;
    commonEncoder = new FrameEncoder(0).resume();

    private createChannel(destinationPort?: number, emit?: boolean): TeceMuxChannel {
        this.logger.debug("Create Channel", destinationPort || this.channelCount);

        const encoder = new FrameEncoder(this.channelCount, { encoding: undefined });

        encoder.logger.updateBaseLog({ id: this.id });
        encoder.logger.pipe(this.logger);

        const w = new PassThrough({ encoding: undefined }).on("data", (d) => { this.logger.warn("channel writeable on DATA", d); });
        //w.pipe(process.stdout).pause()

        w.pipe(encoder);

        const channel: TeceMuxChannel = Object.assign(
            Duplex.from({
                readable: new PassThrough({ encoding: undefined }).on("data", (d) => { this.logger.warn("channel readable on DATA", d); }),
                writable: w,
            } as unknown as Iterable<any>) as TeceMuxChannel,
            {
                _id: destinationPort || this.channelCount,
                encoder
            }
        );

        //channel.pipe(encoder).pipe(this.carrierSocket);
        //channel.pipe(process.stdout);

        channel.on("error", (error) => {
            this.emit("error", { error, source: channel })
        });

        if (emit) {
            encoder.setChannel(destinationPort || this.channelCount);
        }

        //channel.pipe(w);
        //channel.pipe(this.carrierSocket);
        encoder.out.pipe(this.carrierSocket);

        return channel;
    }

    constructor(socket: Socket, id = "") {
        super();
        this.id = id;
        this.logger = new ObjLogger(this, { id: this.id })
        this.carrierSocket = socket;

        this.decoder.logger.updateBaseLog({ id: this.id });
        this.decoder.logger.pipe(this.logger);

        this.carrierSocket.pipe(this.decoder);
        this.commonEncoder.out.pipe(this.carrierSocket);

        this.main().catch((error) => {
            this.emit("error", error);
        });
    }

    async main() {
        this.commonEncoder.logger.updateBaseLog({ id: "Commn" + this.commonEncoder.logger.baseLog.id })
        this.commonEncoder.logger.pipe(this.logger);

        for await (const chunk of this.decoder) {
            this.logger.debug("Decoded", JSON.parse(chunk));

            const frame = JSON.parse(chunk) as FrameData;
            const { flags, sequenceNumber, dataLength, destinationPort } = frame;

            if (flags.ACK) {
                this.logger.trace("ACKNOWLEDGE frame received for sequenceNumber", sequenceNumber);
                // acknowledge received (confirm packet)
                return;
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
                    channel.push(new Uint8Array(((frame.chunk as any).data) as any));
                }
            }

            this.logger.debug("Write acknowledge frame for sequenceNumber", sequenceNumber);
            this.commonEncoder.out.write(
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
            this.channelCount++;
        }
    }

    multiplex(): TeceMuxChannel {
        this.logger.trace("Multiplex");

        const channel = this.createChannel(this.channelCount, true);

        this.addChannel(channel, false);

        this.logger.trace("Multiplex ready", channel._id);
        this.channelCount++;
        return channel;
    }
}
