import { ObjLogger } from "@scramjet/obj-logger";
import { Duplex, Transform, TransformCallback, TransformOptions } from "stream";
import { FrameData, parseFlags } from "../utils";
import { HEADER_LENGTH } from "../constants";
import { calculateChecksum, getChecksum } from "./utils";

export class FrameDecoder extends Transform {
    buffer: Buffer;
    logger: ObjLogger;

    _streams = new Map<number, Duplex>();

    constructor(opts: TransformOptions = {}, params: { name: string } = { name: "FrameDecoder" }) {
        super(Object.assign({}, opts, { readableObjectMode: true }));

        this.buffer = Buffer.alloc(0);
        this.logger = new ObjLogger(params.name);

        this.on("pipe", () => {
            this.logger.debug("onPipe");
        }).on("close", () => {
            this.logger.debug("onClose");
        });
    }

    _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
        try {
            if (!Buffer.isBuffer(chunk)) {
                this.push(JSON.stringify({ error: "not  a buffer" }), undefined);

                callback();
                return;
            }

            if (Buffer.isBuffer(chunk)) {
                this.buffer = Buffer.concat([this.buffer, chunk]);
            } else {
                this.logger.error("Decoding buffer...", chunk);
                this.emit("error", "Chunk is not a buffer");

                callback();
                return;
            }

            let frameSize = 0;

            this.logger.trace("Decoding buffer...", /* toHex(this.buffer) */ "Size:", this.buffer.length);

            if (this.buffer.length === 0) {
                callback(null);
                return;
            }

            if (this.buffer.length >= HEADER_LENGTH) {
                frameSize = this.buffer.readInt32LE(10);
            } else {
                this.logger.trace("To few data");
                callback(null);
                return;
            }

            if (this.buffer.length < frameSize) {
                this.logger.trace("To few data");
                callback(null);
                return;
            }

            const checksum = getChecksum(this.buffer.subarray(0, frameSize));

            this.logger.debug("getChecksum", checksum.toString());

            const payload = {
                sourceAddress: [
                    this.buffer.readInt8(0), this.buffer.readInt8(1), this.buffer.readInt8(2), this.buffer.readInt8(3)
                ],
                destinationAddress: [
                    this.buffer.readInt8(4), this.buffer.readInt8(5), this.buffer.readInt8(6), this.buffer.readInt8(7)
                ],
                chunk: this.buffer.subarray(32, this.buffer.readInt32LE(10)),
                flags: parseFlags(this.buffer.readInt8(25)),
                sourcePort: this.buffer.readInt16LE(12),
                destinationPort: this.buffer.readInt16LE(14),
                dataLength: frameSize - HEADER_LENGTH,
                chunkLength: frameSize,
                sequenceNumber: this.buffer.readInt32LE(16),
                acknowledgeNumber: this.buffer.readInt32LE(20),
                checksum
                //stringified: this.buffer.subarray(32, frameSize).toString()
            } as Partial<FrameData>;

            const expectedChecksum = calculateChecksum(this.buffer.subarray(0, frameSize));

            if (checksum !== expectedChecksum) {
                this.emit("error", { code: "INVALID_CHECKSUM", payload, expectedChecksum });
                payload.error = "checksum";
            } else {
                this.logger.info("Checksum match!", expectedChecksum);
            }

            if (payload.dataLength && payload.dataLength < 0) {
                this.emit("error", "Data length incorrect");
                return;
            }

            this.push(JSON.stringify(payload), "utf-8");

            this.buffer = this.buffer.subarray(frameSize);

            this.logger.trace("Decoded", { ...payload, stringified: "N/A" });//payload.chunk?.toString() });

            if (this.buffer.length === 0) {
                this.logger.info("No remaining data!");
                callback();
                return;
            }

            this.logger.trace("More than one frame in chunk. processing", this.buffer.length);
            this._transform(Buffer.alloc(0), encoding, callback);
        } catch (error) {
            this.logger.error("ERROR", error);
            this.emit("error", error);
        }
    }
}
