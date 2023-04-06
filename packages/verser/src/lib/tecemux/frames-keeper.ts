import { ObjLogger } from "@scramjet/obj-logger";
import { TypedEmitter } from "@scramjet/utility";
import { FramesKeeperEvents, FramesKeeperFrame, IFramesKeeper } from "./types";

export class FramesKeeper extends TypedEmitter<FramesKeeperEvents> implements IFramesKeeper {
    #MAX_FRAMES_DIFFERENCE = 5;

    #framesSent = new Map<number, FramesKeeperFrame>();

    lastSequenceSent: number = -1;
    lastSequenceReceived: number = -1;

    logger = new ObjLogger(this);

    generator: AsyncGenerator<number, never, unknown> = (async function* (this: FramesKeeper) {
        while (true) {
            if (this.lastSequenceSent - this.lastSequenceReceived < this.#MAX_FRAMES_DIFFERENCE) {
                this.logger.debug("Write allowed");
                yield Promise.resolve(this.lastSequenceReceived);
                continue;
            }

            this.logger.warn("Write NOT allowed");
            yield new Promise<number>((res) => {
                this.logger.info("waiting for ACK...");

                this.once("ack", (acknowledgeNumber: number) => {
                    this.logger.info("ACK processed");
                    res(acknowledgeNumber);
                });
            });
        }
    }).apply(this);

    handlePSH(sequenceNumber: number) {
        this.lastSequenceSent = sequenceNumber;
    }

    handleACK(acknowledgeNumber: number) {
        this.logger.debug("onACK", acknowledgeNumber);

        const storedFrame = this.#framesSent.get(acknowledgeNumber);

        if (storedFrame) {
            this.#framesSent.set(acknowledgeNumber, { ...storedFrame, received: true });
        }

        this.lastSequenceReceived = acknowledgeNumber;
        this.emit("ack", acknowledgeNumber);
    }

    isReceived(sequenceNumber: number) {
        const frame = this.#framesSent.get(sequenceNumber);

        // received or not stored
        return frame === undefined || !!frame.received;
    }

    getFrame(sequenceNumber: number) {
        return this.#framesSent.get(sequenceNumber);
    }
}

