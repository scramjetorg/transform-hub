import { Socket } from "net";
import { Duplex } from "stream";
import { FrameEncoder } from "./frame-encoder";
import { FrameTarget } from "../utils";
import { TypedEmitter } from "@scramjet/utility";
import { FrameDecoder } from "./frame-decoder";

export * from "./frame-decoder";
export * from "./frame-encoder";

type TeceMuxEvents = {
    channel(socket: Duplex): void;
}

export class TeceMux extends TypedEmitter<TeceMuxEvents>{
    socket: Duplex;
    socketCount = 0;
    decoder = new FrameDecoder();

    channels: Duplex[] = [];

    constructor(socket: Socket) {
        super();
        this.socket = socket;

        this.decoder.on("data", (chunk) => {
            const frame = JSON.parse(chunk);

            const channel = frame.destinationPort;

            if (!this.channels[channel]) {
                this.channels[channel] = new Duplex({ });
                this.channels[channel].pipe(new FrameEncoder(channel).pipe(this.socket)); // ? lot of encoders / encoder.writeToChannel ?;
                this.emit("channel", this.channels[channel]);
            }

            this.channels[channel].write(frame.chunk.data);
        });

        socket.pipe(this.decoder);
    }

    multiplex() {
        const multiplex = new Socket();

        multiplex.pipe(new FrameEncoder(FrameTarget.API)).pipe(this.socket);

        return multiplex;
    }
}
