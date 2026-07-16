"use strict";

const { PassThrough } = require("stream");

module.exports = function (_stream, arg1, arg2, arg3, arg4) {
    const output = new PassThrough();

    output.write(`${arg1}\n`);
    output.write(`${arg2}\n`);
    output.write(`${arg3.abc}\n`);
    output.write(`${arg4[0]}\n`);
    output.end();
    return output;
};
