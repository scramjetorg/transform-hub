import { ReadableApp } from "@scramjet/types";
import { StringStream } from "scramjet";

/**
 * An inert app that is just a function (not wrapped)
 *
 * @type {ReadableApp}
 * @param {Readable} _stream - dummy input stream
 * @param {number} count - how many random numbers to generate
 */
module.exports = async function(_stream: any, count: any) {
    const stream = new StringStream();

    this.logger.info("Sequence called with argument: " + count);

    for (let i = 0; i < +count; i++) {
        const random = Math.floor(Math.random());

        this.logger.log("iteration " + random);

        process.stdout.write(random + ",");
        process.stderr.write(random + ",");
        stream.write(random + ",");
    }

    return stream;
} as ReadableApp;
