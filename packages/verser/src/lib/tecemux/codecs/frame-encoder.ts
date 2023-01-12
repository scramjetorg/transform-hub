import { Transform, TransformCallback, TransformOptions } from "stream";
import { FrameTarget, HEADER_LENGTH, toHex as getHexString } from "../utils";
import { ObjLogger } from "@scramjet/obj-logger";
import { binaryFlags, frameFlags } from ".";
export class FrameEncoder extends Transform {
    sequenceNumber = 0;
    logger = new ObjLogger("FrameEncoder",);

    constructor(private frameTarget: FrameTarget, opts: TransformOptions = {}, params: { name: string } = { name: "FrameEncoder" }) {
        opts.emitClose = false;

        super(opts);

        this.logger = new ObjLogger(params.name, { id: this.frameTarget.toString() });

        this.on("pipe", () => {
            this.logger.debug("onPipe");
        });
    }

    setFlag(flag: keyof typeof binaryFlags, flags: Uint8Array = new Uint8Array([0])) {
        this.logger.debug("settingFlag", flag);
        flags[0] |= 1 << frameFlags.indexOf(flag);

        return flags;
    }

    setChannel() {
        const checksum = this.getChecksum();
        const buffer = Buffer.concat([
            // 0: source address 0 - 3
            new Uint8Array([10, 0, 0, 1]),
            // 32: destination address 4 - 7
            new Uint8Array([10, 0, 0, 2]),

            // 64: zeroes (8bit), protocol (8bit), 8 - 9
            new Uint8Array([0, 1]),
            // tcp length (16bit) 10 - 11
            new Uint8Array(new Uint16Array([0 + HEADER_LENGTH]).buffer),

            // 96: Source port,	destination port 12 - 15
            new Uint8Array(new Uint16Array([0, this.frameTarget]).buffer),

            // 128: sequenceNumber(32 bit, acnowledge number) 16 - 19
            new Uint8Array(new Uint32Array([this.sequenceNumber++]).buffer),

            // 160: Acknowledgement number 20-23
            new Uint8Array([0, 0, 0, 0]),

            // 192: data offset (4bit), reserved (4bit), 24
            new Uint8Array([0b00000000]),
            // 224: flags (8bit), 25
            this.setFlag("ECE"),
            // window(16bit) 26 - 27
            new Uint8Array(new Uint16Array([0]).buffer),

            // checksum(16bit) 28 - 29
            new Uint8Array(new Uint16Array([checksum]).buffer),
            // pointer (16bit) 30 - 31
            new Uint8Array(new Uint16Array([checksum]).buffer),

            // 256: data 32 -
            new Uint8Array([])
        ]);

        this.push(buffer, undefined);
    }

    getChecksum() {
        return 255;
    }

    createChunkFrame(chunk: any) {
        const checksum = this.getChecksum();
        const buffer = Buffer.concat([
            // 0: source address 0 - 3
            new Uint8Array([10, 0, 0, 1]),
            // 32: destination address 4 - 7
            new Uint8Array([10, 0, 0, 2]),

            // 64: zeroes (8bit), protocol (8bit), 8 - 9
            new Uint8Array([0, 1]),
            // tcp length (16bit) 10 - 11
            new Uint8Array(new Uint16Array([chunk.length + HEADER_LENGTH]).buffer),

            // 96: Source port,	destination port 12 - 15
            new Uint8Array(new Uint16Array([0, this.frameTarget]).buffer),

            // 128: sequenceNumber(32 bit, acnowledge number) 16 - 19
            new Uint8Array(new Uint32Array([this.sequenceNumber++]).buffer),

            // 160: Acknowledgement number 20-23
            new Uint8Array([0, 0, 0, 0]),

            // 192: data offset (4bit), reserved (4bit), 24
            new Uint8Array([0b00000000]),
            // 224: flags (8bit), 25
            this.setFlag("PSH"),
            // window(16bit) 26 - 27
            new Uint8Array(new Uint16Array([0]).buffer),

            // checksum(16bit) 28 - 29
            new Uint8Array(new Uint16Array([checksum]).buffer),
            // pointer (16bit) 30 - 31
            new Uint8Array(new Uint16Array([checksum]).buffer),

            // 256: data 32 -
            new Uint8Array(chunk)
        ]);

        return buffer;
    }

    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        const buffer = this.createChunkFrame(chunk);

        this.logger.trace("Encoded frame", getHexString(buffer), "Size: ", buffer.length, "Pushing");

        this.push(buffer, undefined);
        callback(null);
    }
}
