import { Transform, TransformCallback, TransformOptions } from "stream";
import { FrameData, FrameTarget, HEADER_LENGTH, toHex as getHexString } from "../utils";
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

        /*const orgPush = this.push;
        this.push = (chunk: any, encoding: BufferEncoding | undefined) => {
            this.logger.debug("Pushing", chunk)
            //return orgPush.call(this, chunk, encoding);
            return true;
        }
        */
    }

    setFlags(flag: (keyof typeof binaryFlags)[] = [], flags: Uint8Array = new Uint8Array([0])) {
        for (const f in flag) {
            this.logger.debug("settingFlag", flag);
            flags[0] |= 1 << frameFlags.indexOf(flag[f]);
        }

        return flags;
    }

    setChannel(channelCount: number) {
        this.logger.debug("Set channel command", channelCount);

        //const checksum = this.getChecksum();

        this.push(this.createFrame([], {
            flagsArray: ["PSH"],
            destinationPort: channelCount
        }));
    }

    getChecksum() {
        return 255;
    }

    createFrame(chunk: any = new Uint8Array([]), frame: Partial<FrameData>) {
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
            new Uint8Array(new Uint16Array([0, frame.destinationPort || this.frameTarget]).buffer),

            // 128: sequenceNumber(32 bit, acnowledge number) 16 - 19
            new Uint8Array(new Uint32Array([frame.sequenceNumber || this.sequenceNumber++]).buffer),

            // 160: Acknowledgement number 20-23
            new Uint8Array(new Uint32Array([frame.acknowledgeNumber || 0]).buffer),

            // 192: data offset (4bit), reserved (4bit), 24
            new Uint8Array([0b00000000]),

            // 224: flags (8bit), 25
            this.setFlags(frame.flagsArray, new Uint8Array([0b00000000])),
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
            this.setFlags(["PSH"]),
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
        //const buffer = this.createChunkFrame(chunk);
        this.logger.debug("TRANSFORM IN", chunk, chunk.length);
        const buffer = this.createFrame(chunk, { destinationPort: this.frameTarget, flagsArray: ["PSH"] });

        this.logger.trace("Encoded frame", getHexString(buffer), "Size: ", buffer.length, "Pushing");

        //this.push(buffer, undefined);
        this.logger.debug("TRANSFORM OUT", getHexString(buffer), buffer.length);
        this.push(buffer);
        callback();
    }
}
