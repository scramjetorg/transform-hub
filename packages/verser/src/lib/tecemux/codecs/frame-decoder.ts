import { ObjLogger } from "@scramjet/obj-logger";
import { Duplex, Transform, TransformCallback, TransformOptions } from "stream";
import { HEADER_LENGTH, toHex } from "../utils";
import { frameFlags } from ".";

export class FrameDecoder extends Transform {
    buff: Buffer;
    size = 0;
    logger: ObjLogger;

    _streams = new Map<number, Duplex>();


    constructor(opts: TransformOptions = {}, params: { name: string } = { name: "FrameDecoder" }) {
        super(Object.assign({}, { readableObjectMode: true, emitClose: false }, opts));

        this.buff = Buffer.alloc(64 * 1024, 0, undefined); //@TODO: optimize
        this.logger = new ObjLogger(params.name);

        this.on("pipe", () => {
            this.logger.debug("onPipe");
        });
    }

    parseFlags(byte: number) {
        return frameFlags.filter((_flag, index) => byte >>> index & 1)
            .reduce((p, c) => ({ ...p, [c]: true }), {});
    }

    _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
        this.logger.trace("Decoding frame...", toHex(chunk), "Size:", chunk.length);

        if (!Buffer.isBuffer(chunk)) {
            this.push(JSON.stringify({ error: "not a buffer" }), undefined);
            callback();

            return;
        }

        chunk.copy(this.buff, this.size, 0, chunk.length);

        this.size += chunk.length;

        if (this.size >= 10 && this.buff.readInt32LE(10) === this.size) {
            const frameSize = this.buff.readInt32LE(10);

            const payload = {
                sourceAddress: [this.buff.readInt8(0), this.buff.readInt8(1), this.buff.readInt8(2), this.buff.readInt8(3)],
                destinationAddress: [this.buff.readInt8(4), this.buff.readInt8(5), this.buff.readInt8(6), this.buff.readInt8(7)],
                chunk: this.buff.subarray(32, this.buff.readInt32LE(10)),
                flags: this.parseFlags(this.buff.readInt8(25)),
                sourcePort: this.buff.readInt16LE(12),
                destinationPort: this.buff.readInt16LE(14),
                dataLength: frameSize - HEADER_LENGTH,
                chunkLength: frameSize,
                stringified: this.buff.subarray(32, frameSize).toString()
            };

            this.push(JSON.stringify(payload) + "\n");

            this.size = 0;
            this.buff.fill(0);
        } else {
            this.logger.error("too few data", this.size, this.buff.readInt32LE(10));
        }

        callback();
    }
}
