"use strict";

const { PassThrough } = require("stream");

module.exports = function(_stream, ...args) {
    const out = new PassThrough();

    out.write("config: ");
    out.write(JSON.stringify(this.config));
    out.write("\n");
    for (const arg of args) {
        out.write(`${typeof arg}, ${JSON.stringify(arg)}\n`);
    }
    out.end();

    if (this.config.exit) {
        this.exitTimeout = 500;
    }
    return out;
};
exports.default = exp;
