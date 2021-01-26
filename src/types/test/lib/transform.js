const { Transform } = require("stream")

/**
 * Simple js transform example.
 * @param {import("stream").Readable} stream 
 * @returns {import("../../wrapper").ReadableStream<{x: 1}>}
 */
module.exports = (stream) => {
    return stream.pipe(new Transform({
        transform: ({y}, _enc, cb) => (this.push({x:y}), cb())
    }));
}