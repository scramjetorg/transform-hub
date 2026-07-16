"use strict";

const crypto = require("crypto");
const { PassThrough } = require("stream");

module.exports = function (input) {
    const hash = crypto.createHash("md5");
    const output = new PassThrough();

    input.on("data", (chunk) => hash.update(chunk));
    input.once("end", () => output.end(hash.digest("hex")));
    input.once("error", (error) => output.destroy(error));

    return output;
};
