const { Transform } = require("stream")

/**
 * Simple js transform example.
 */
module.exports = (stream) => {
    return stream.pipe(new Transform({
        transform: ({x, y}, _enc, cb) => (this.push({z:x||y||0}), cb())
    }));
}