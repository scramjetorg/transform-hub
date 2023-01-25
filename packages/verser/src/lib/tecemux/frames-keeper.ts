import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

export class FramesKeeper extends PassThrough {
    logger = new ObjLogger(this);
    archive = new Map<number, Buffer>();
    lastSequenceNumberSent: number = -1;

    _write(chunk: any, encoding: BufferEncoding, cb: ((error: Error | null | undefined) => void) | undefined) {
        const sequenceNumber = chunk.readInt32LE(16);

        this.archive.set(sequenceNumber, chunk);
        this.logger.debug(`sequenceNumber ${sequenceNumber} stored, size: ${chunk.length}`);

        this.push(chunk, encoding);
        if (cb) cb(undefined);

        this.lastSequenceNumberSent = sequenceNumber;

        // await new Promise<void>((resolve, reject) => {
        //     while (this.archive.get(sequenceNumber)) {
        //         this.logger.debug("wait for ack for", sequenceNumber)
        //     }
        //     resolve();
        // });

        return true;
    }

    _read(_size: number) {
    }

    onACK(sequenceNumber: number) {
        this.logger.debug("onACK", sequenceNumber);
        this.archive.delete(sequenceNumber);
    }
}
