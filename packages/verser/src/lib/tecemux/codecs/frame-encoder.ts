import { PassThrough, Transform, TransformCallback, TransformOptions } from "stream";
import { FrameData, FrameTarget, HEADER_LENGTH, toHex as getHexString, toHex } from "../utils";
import { ObjLogger } from "@scramjet/obj-logger";
import { binaryFlags, frameFlags } from ".";
import { TeceMux } from "../tecemux";

export class FrameEncoder extends Transform {
    tecemux: TeceMux;
    logger = new ObjLogger("FrameEncoder",);
    out = Object.assign(new PassThrough({ readableObjectMode: true })
        .on("data", (data) => {
            this.logger.trace("output to socket: " + (data.length == HEADER_LENGTH ? "HEADER ONLY" : ""), toHex(data), data.length, this.readableFlowing);
        })
        .on("pause", () => {
            this.logger.trace("output to socket paused!");
        })
        .on("end", () => {
            this.logger.trace("output to socket ended!", this.frameTarget);
            //this.tecemux.sendFIN(this.frameTarget);
        })
        .on("resume", () => {
            this.logger.trace("output to socket resumed");
        })
        .on("error", (error) => {
            this.logger.error("output to socket error", error);
        }).pause()
    ,{
        _id: this.frameTarget
    });

    constructor(private frameTarget: FrameTarget, tecemux: TeceMux, opts: TransformOptions = {}, params: { name: string } = { name: "FrameEncoder" }) {
        //opts.emitClose = false;
        //opts.readableObjectMode = true;
        super(Object.assign(opts, {
            writableObjectMode: true,
            readableObjectMode: true,
            readableHighWaterMark: 0
        }));

        this.tecemux = tecemux;
        this.logger = new ObjLogger(params.name, { id: this.frameTarget.toString() });

        this
            .on("pipe", () => {
                this.logger.debug("onPipe");
            })
            .on("end", () => {
                this.logger.debug("onEnd");
            })


        this.pipe(this.out);
    }

    setFlags(flag: (keyof typeof binaryFlags)[] = [], flags: Uint8Array = new Uint8Array([0])) {
        for (const f in flag) {
            flags[0] |= 1 << frameFlags.indexOf(flag[f]);
        }

        this.logger.debug("settingFlag", flag, flags[0].toString(2).padStart(8, "0"));

        return flags;
    }

    setChannel(channelCount: number) {
        this.logger.debug("Set channel command", channelCount);

        //const checksum = this.getChecksum();

        this.out.write(this.createFrame([], {
            flagsArray: ["PSH"],
            destinationPort: channelCount
        }));
    }

    onChannelEnd(channelId: number) {
        this.logger.debug("sending FIN for channel", channelId);
        this.out.write(this.createFrame([], {
            flagsArray: ["FIN"],
            destinationPort: channelId
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
            new Uint8Array(new Uint32Array([this.tecemux.sequenceNumber++]).buffer),

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

    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        //const buffer = this.createChunkFrame(chunk);
        this.logger.debug("TRANSFORM IN", toHex(chunk), chunk.length);
        const buffer = this.createFrame(chunk, { destinationPort: this.frameTarget, flagsArray: ["PSH"] });

        this.logger.debug("TRANSFORM OUT", getHexString(buffer), "Size: ", buffer.length);

        if (!this.push(buffer, undefined)) {
            this.once("drain", () => {
                this.push(buffer, undefined);
            });
        };
        this.read(0);

        callback();
    }


}
