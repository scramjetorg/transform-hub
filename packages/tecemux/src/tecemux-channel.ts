import { ObjLogger } from "@scramjet/obj-logger";
import { Duplex } from "stream";
import { IFrameEncoder, ITeCeMux } from "./types";
import { FrameEncoder } from "./codecs";

export class TeceMuxChannel extends Duplex {
    _id: number;
    logger: ObjLogger;
    allowHalfOpen: boolean;
    encoder: IFrameEncoder;
    closedByFIN = false;

    constructor(duplexOptions: ConstructorParameters<typeof Duplex>[0], id: number, teceMux: ITeCeMux) {
        super(duplexOptions);
        this.logger = new ObjLogger(this);
        this.allowHalfOpen = true;
        this._id = id;
        this.encoder = new FrameEncoder(id, teceMux, { encoding: undefined });
    }

    _write(chunk: any, encoding: BufferEncoding, next: (error?: Error | null | undefined) => void) {
        this.logger.debug("WRITE channel", this._id, chunk);

        if (chunk === null) {
            this.logger.info("NULL ON CHANNEL");

            this.end();
            return false;
        }

        return this.encoder.write(chunk, encoding, next);
    }

    _read(_size?: number) {
        this.logger.debug("READ channel", this._id);
    }

    sendACK(sequenceNumber: number) {
        this.encoder.push(
            this.encoder.createFrame(undefined, {
                flagsArray: ["ACK"],
                acknowledgeNumber: sequenceNumber,
                destinationPort: this._id
            })
        );
    }

    sendPauseACK(sequenceNumber: number) {
        //console.log("Cant write more. Send pause command");
        this.encoder.push(
            this.encoder.createFrame(undefined, {
                flagsArray: ["ACK", "SYN"],
                acknowledgeNumber: sequenceNumber,
                destinationPort: this._id
            })
        );
    }

    handlerFIN() {
        this.closedByFIN = true;

        if (!this.writableEnded) {
            this.push(null);
        }

        if (this.writableEnded && this.readableEnded) {
            this.destroy();
            this.logger.info("Channel destroy");
        }
    }
}
