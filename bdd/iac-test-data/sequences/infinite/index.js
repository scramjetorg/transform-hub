const { Readable } = require("stream");

function incrementLE(buffer) {
    for (var i = 0; i < buffer.length; i++) {
        if (buffer[i]++ !== 255) break;
    }
}

module.exports = function(/** @this {import("@scramjet/types").AppContext} */) {
    const buf = Buffer.alloc(16, 0);

    return Readable
        .from(
            (async function*(/** @type {import("stream").Readable} */ _stream) {
                while (true) {
                    yield buf.toString("hex");
                    incrementLE(buf);
                }
            })()
        )
        .on("pause", () => this.logger.info("Output paused at buf", buf.toString("hex")))
        .on("resume", () => this.logger.info("Output resumed at buf", buf.toString("hex")));
};
