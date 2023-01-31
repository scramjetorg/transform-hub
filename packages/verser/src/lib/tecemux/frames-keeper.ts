import { ObjLogger } from "@scramjet/obj-logger";
import { IObjectLogger } from "@scramjet/types";

import { TransformOptions, Writable } from "stream";
import { parseFlags } from "./utils";
import { IFramesKeeper, FramesKeeperFrame } from "./types";

export class FramesKeeper extends Writable implements IFramesKeeper {
    logger: IObjectLogger;
    framesSent = new Map<number, FramesKeeperFrame>();
    lastSequenceSent: number = -1;
    lastSequenceReceived: number = -1;

    constructor(
        opts: TransformOptions = {},
        params: { name: string } = { name: "Keeper" }
    ) {
        super(Object.assign(opts, {
            readableObjectMode: true,
            writableObjectMode: true
        }));

        this.logger = new ObjLogger(params.name);
    }

    _write(chunk: any, encoding: BufferEncoding, cb: ((error: Error | null | undefined) => void)) {
        if (Buffer.isBuffer(chunk)) {
            this.logger.info("transform buffer");
            const sequenceNumber = chunk.readInt32LE(16);
            const destinationPort = chunk.readInt16LE(14);
            const flags = parseFlags(chunk.readInt8(25));

            this.framesSent.set(
                sequenceNumber, {
                    buffer: chunk, received: false, sequenceNumber, destinationPort, flags
                });

            this.lastSequenceSent = sequenceNumber;
            this.logger.debug(`lastSequenceSent ${sequenceNumber}, size: ${chunk.length} total frames sent ${this.framesSent.size}`,);
        }

        cb(undefined);
    }

    onACK(acknowledgeNumber: number,) {
        this.logger.debug("onACK", acknowledgeNumber);

        const storedFrame = this.framesSent.get(acknowledgeNumber);

        if (storedFrame) {
            this.framesSent.set(acknowledgeNumber, { ...storedFrame, received: true });
        }
    }

    isReceived(sequenceNumber: number) {
        const frame = this.framesSent.get(sequenceNumber);

        // received or not stored
        return frame === undefined || !!this.framesSent.get(sequenceNumber)?.received;
    }

    getFrame(sequenceNumber: number) {
        return this.framesSent.get(sequenceNumber);
    }

    getDestinationPort(sequenceNumber: number) {
        return this.framesSent.get(sequenceNumber)?.received;
    }
}
