"use strict";

const { PassThrough } = require("stream");

const exp = function(_stream, arg1, arg2, arg3, arg4) {
    const out = new PassThrough();

    out.write(arg1 + "\n");
    out.write(arg2.toString() + "\n");
    out.write(arg3.abc + "\n");
    out.write(arg4[0] + "\n");

    return out;
};

export default exp;
