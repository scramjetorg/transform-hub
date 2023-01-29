import { ObjLogger } from "@scramjet/obj-logger";
import { TransformOptions, Writable } from "stream";
import { IObjectLogger } from "@scramjet/types";

export class FramesKeeper extends Writable {
    logger: IObjectLogger;
    framesSent = new Map<number, { buffer: Buffer, received: boolean, sequenceNumber: number }>();
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

            this.framesSent.set(sequenceNumber, { buffer: chunk, received: false, sequenceNumber });

            this.lastSequenceSent = sequenceNumber;
            this.logger.debug(`lastSequenceSent ${sequenceNumber}, size: ${chunk.length}`);
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
}
