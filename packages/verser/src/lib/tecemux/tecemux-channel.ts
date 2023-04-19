import { ObjLogger } from "@scramjet/obj-logger";
import { Duplex, PassThrough } from "stream";
import { IFrameEncoder, ITeCeMux } from "./types";
import { FrameEncoder } from "./codecs";

export class TeceMuxChannel extends Duplex {
    _id: number;
    logger: ObjLogger;
    allowHalfOpen: boolean;
    encoder: IFrameEncoder;
    closedByFIN = false;

    private __writable = new PassThrough();
    public __readable = new PassThrough();

    sendACK(sequenceNumber: number) {
        this.encoder.push(
            this.encoder.createFrame(undefined, {
                flagsArray: ["ACK"],
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

    constructor(duplexOptions: ConstructorParameters<typeof Duplex>[0], id: number, teceMux: ITeCeMux) {
        super(duplexOptions);

        this.logger = new ObjLogger(this);
        this.allowHalfOpen = true;
        this._id = id;
        this.encoder = new FrameEncoder(id, teceMux, { encoding: undefined });

        this.__writable.pipe(this.encoder);

        return Object.assign(
            Duplex.from({
                readable: this.__readable,
                writable: this.__writable
            } as unknown as AsyncIterable<any>, duplexOptions), {
                ...this,
                sendACK: this.sendACK,
                handlerFIN: this.handlerFIN
            }
        );
    }
}
