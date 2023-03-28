import { PassThrough, Transform, TransformCallback, TransformOptions } from "stream";
import { ObjLogger } from "@scramjet/obj-logger";

import { FrameTarget, HEADER_LENGTH, binaryFlags, frameFlags } from "../constants";
import { FrameData, ITeCeMux } from "../types";
import { calculateChecksum } from "./utils";

export class FrameEncoder extends Transform {
    MAX_CHUNK_SIZE = 10 * 1024 - HEADER_LENGTH;

    tecemux: ITeCeMux;
    total = 0;
    logger = new ObjLogger("FrameEncoder");
    out = Object.assign(new PassThrough({ readableObjectMode: true })
        /*.on("data", (data) => {
            this.logger.trace(
                "output to socket: " + (data.length === HEADER_LENGTH ? "HEADER ONLY" : ""),
                toHex(data), data.length, this.readableFlowing);
        })*/
        .on("pause", () => {
            this.logger.trace("OUT paused!");
        })
        .on("end", () => {
            this.logger.trace("OUT ended!", this.frameTarget);
        })
        .on("resume", () => {
            this.logger.trace("OUT resumed");
        })
        .on("error", (error) => {
            this.logger.error("OUT error", error);
        })//.pause()
    , {
        _id: this.frameTarget
    });

    constructor(
        private frameTarget: FrameTarget,
        tecemux: ITeCeMux,
        opts: TransformOptions = {},
        params: { name: string } = { name: "FrameEncoder" }
    ) {
        super(Object.assign(opts, {
            readableObjectMode: true,
            writableObjectMode: true
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
            .on("pause", () => {
                this.logger.debug("onPause");
            })
            .on("resume", () => {
                this.logger.debug("onResume");
            });

        this.pipe(this.out);
    }

    setFlags(flag: (keyof typeof binaryFlags)[] = [], flags: Uint8Array = new Uint8Array([0])) {
        for (const f in flag) {
            if (Object.prototype.hasOwnProperty.call(flag, f)) {
                flags[0] |= 1 << frameFlags.indexOf(flag[f]);
            }
        }

        this.logger.debug("settingFlag", flag, flags[0].toString(2).padStart(8, "0"));

        return flags;
    }

    async setChannel(channelCount: number) {
        this.logger.debug("Set channel command", channelCount);

        const frame = this.createFrame([], {
            flagsArray: ["PSH"],
            destinationPort: channelCount
        });

        this.out.write(frame);

        const sn = +this.tecemux.sequenceNumber;

        return await new Promise<void>((resolve, _reject) => {
            const waiter = (sequenceNumber: number) => {
                if (sequenceNumber === sn) {
                    this.tecemux.framesKeeper.off("ack", waiter);
                    resolve();
                }
            };

            this.tecemux.framesKeeper.on("ack", waiter);
        });
    }

    onChannelEnd(channelId: number) {
        this.logger.debug("sending FIN for channel", channelId);
        this.out.write(
            this.createFrame([], {
                flagsArray: ["FIN"],
                destinationPort: channelId
            })
        );
    }

    getChecksum() {
        return 255;
    }

    createFrame(chunk: any = new Uint8Array([]), frame: Partial<FrameData>) {
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
            new Uint8Array(new Uint32Array([this.tecemux.sequenceNumber]).buffer),

            // 160: Acknowledgement number 20-23
            new Uint8Array(new Uint32Array([frame.acknowledgeNumber || 0]).buffer),

            // 192: data offset (4bit), reserved (4bit), 24
            new Uint8Array([0b00000000]),

            // 224: flags (8bit), 25
            this.setFlags(frame.flagsArray, new Uint8Array([0b00000000])),
            // window(16bit) 26 - 27, ZEROes before calculation
            new Uint8Array(new Uint16Array([0]).buffer),

            // checksum(16bit) 28 - 29
            new Uint8Array(new Uint16Array([0]).buffer),
            // pointer (16bit) 30 - 31
            new Uint8Array(new Uint16Array([0]).buffer),

            // 256: data 32 -
            new Uint8Array(chunk)
        ]);

        buffer.writeUInt16LE(
            calculateChecksum(buffer), 28
        );

        return buffer;
    }

    async _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): Promise<void> {
        this.total += chunk.length;

        this.logger.debug("TRANSFORM IN", /* toHex(chunk), */ chunk.length, this.total);

        let remaining = Buffer.alloc(0);

        if (chunk.length > this.MAX_CHUNK_SIZE) {
            this.logger.debug("TRANSFORM big chunk, splitting", chunk.length);

            remaining = (chunk as Buffer).subarray(this.MAX_CHUNK_SIZE);
            chunk = chunk.subarray(0, this.MAX_CHUNK_SIZE);

            this.logger.debug("TRANSFORM processing part/remaining", chunk.length, remaining.length);
        }

        const buffer = this.createFrame(chunk, { destinationPort: this.frameTarget, flagsArray: ["PSH"] });

        this.logger.debug("Awaiting keeper");
        await this.tecemux.framesKeeper.generator.next(this.tecemux.sequenceNumber);
        this.logger.debug("Awaiting keeper DONE");

        this.tecemux.framesKeeper.handlePSH(this.tecemux.sequenceNumber);

        this.tecemux.framesSent++;
        this.tecemux.sequenceNumber++;
        this.logger.debug("TRANSFORM OUT", /*getHexString(buffer),  */ "Size: ", buffer.length);

        if (remaining.length) {
            this.push(buffer);
            await this._transform(remaining, encoding, callback);
        } else {
            callback(null, buffer);
        }
    }
}
