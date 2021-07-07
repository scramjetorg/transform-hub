/* eslint-disable no-loop-func */
import { InertApp } from "@scramjet/types";

/**
 * An inert app that is just a function (not wrapped)
 *
 * @type {InertApp}
 * @param {Readable} _stream - dummy input stream
 * @param {number} kbytes - size of data to write in kb
 * @param {number} timeout - time to keep Instance running after exceeding the buffer size.
 */
module.exports = async function(_stream: any, kbytes: number, timeout: number) {

    this.logger.info("Sequence called with: ", kbytes, timeout);

    this.on("test-event", () =>
        this.emit("test-event-response", "message from sequence")
    );

    let i = 0;

    while (i < +kbytes) {
        const isPlaceInBuffer = process.stdout.write(Buffer.alloc(1024, 0xdeadbeef));

        if (!isPlaceInBuffer) {
            this.emit("test-event-response", "message from sequence");

            await new Promise(res => setTimeout(res, +timeout));
        }
        i++;
    }

} as InertApp;
