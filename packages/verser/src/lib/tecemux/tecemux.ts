import { TypedEmitter } from "@scramjet/utility";
import { FrameDecoder, FrameEncoder, TeceMuxEvents } from "./codecs";
import { Duplex } from "stream";
import { Socket } from "net";

export type TeceMuxChannel = Duplex & { _id: number };

export class TeceMux extends TypedEmitter<TeceMuxEvents>{
    carrierSocket: Duplex;
    channelCount = 0;
    decoder = new FrameDecoder();

    channels: Duplex[] = [];

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
            const frame = JSON.parse(chunk);
            const channel = frame.destinationPort;

            if (!this.channels[channel]) {
                const channel = this.createChannel();

                this.addChannel(channel);
            }

            this.channels[channel].write(frame.chunk.data);
        }
    }

    addChannel(channel: TeceMuxChannel) {
        this.channels[this.channelCount] = channel;
        this.channelCount++;

        this.emit("channel", channel);
    }

    multiplex(): TeceMuxChannel {
        const channel = this.createChannel();

        this.addChannel(channel);

        return channel;
    }
}
