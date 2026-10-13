const { Readable } = require("stream");

module.exports = function(stream) {
    const output = Readable.from(stream);
    output.contentType = "text/plain";
    return output;
};
