const { PassThrough } = require("stream");

module.exports = function(input) {
    const out = new PassThrough();

    input.on("data", data => out.write("Hello " + data + "!"));

    return out;
};
