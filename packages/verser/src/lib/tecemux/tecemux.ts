import { TypedEmitter } from "@scramjet/utility";
import { FrameDecoder, FrameEncoder, TeceMuxEvents } from "./codecs";
import { Duplex, PassThrough, pipeline } from "stream";
import { Socket } from "net";
import { ObjLogger } from "@scramjet/obj-logger";
import { FrameData } from "./utils";
import { IObjectLogger } from "@scramjet/types";

export type TeceMuxChannel = Duplex & { _id: number };

export class TeceMux extends TypedEmitter<TeceMuxEvents>{
    id: string;
    carrierSocket: Duplex;
    channelCount = 0;
    decoder = new FrameDecoder();

    channels: Duplex[] = [];

    logger: IObjectLogger;
    commonEncoder = new FrameEncoder(0);

    private createChannel(): TeceMuxChannel {
        this.logger.debug("Create Channel", this.channelCount);

        const encoder = new FrameEncoder(this.channelCount);
        encoder.logger.updateBaseLog({ id: this.id });
        encoder.logger.pipe(this.logger);

        const w = new PassThrough().on("data", (d) => { this.logger.warn("writeable DATA", d); }).pause();
        //w.pipe(process.stdout).pause()

        w.pipe(encoder);

        const channel: TeceMuxChannel = Object.assign(
            Duplex.from({
                readable: new PassThrough().on("data", (d) => { this.logger.warn("readable DATA", d); }).pause(),
                writable: w,
            } as unknown as Iterable<any>) as TeceMuxChannel,
            { _id: this.channelCount }
        );


        //channel.pipe(encoder).pipe(this.carrierSocket);
        //channel.pipe(process.stdout);

        channel.on("error", (error) => {
            this.emit("error", { error, source: channel })
        });

        encoder.setChannel(this.channelCount);
        //channel.pipe(w);
        //channel.pipe(this.carrierSocket);
        encoder.pipe(this.carrierSocket);

        return channel;
    }

    constructor(socket: Socket, id = "") {
        super();
        this.id = id;
        this.logger = new ObjLogger(this, { id: this.id })
        this.carrierSocket = socket;

        this.decoder.logger.pipe(this.logger);

        this.carrierSocket.pipe(this.decoder);
        this.commonEncoder.pipe(this.carrierSocket);

        this.carrierSocket.on("data", (d) => { console.warn("carrier socket ", d); });
        this.commonEncoder.on("data", (d) => { this.logger.warn("to socket", d); });

        this.main();//.catch((error) => {
            //this.emit("error", error);
        //});
        //this.carrierSocket.pipe(process.stdout);
    }

    async main() {
        this.commonEncoder.logger.updateBaseLog({ id: "Commn" + this.commonEncoder.logger.baseLog.id })
        this.commonEncoder.logger.pipe(this.logger);

        for await (const chunk of this.decoder) {
            this.logger.debug("Decoded", JSON.parse(chunk));

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
                    this.channels[destinationPort].write(new Uint8Array((frame.chunk) as any));
                }
            }
        }
    }

    addChannel(channel: TeceMuxChannel) {
        this.logger.debug("adding channel", channel._id);
        this.channels[this.channelCount] = channel; // wait for SYN reply?
        this.channelCount++;
        this.commonEncoder.createFrame(undefined, {
            flagsArray: ["PSH"],
            destinationPort: channel._id
        })
        //this.emit("channel", channel);
    }

    multiplex(): TeceMuxChannel {
        this.logger.trace("Multiplex")
        const channel = this.createChannel();

        this.addChannel(channel);

        return channel;
    }
}
