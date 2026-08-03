"use strict";
exports.__esModule = true;
var stream_1 = require("stream");
var exp = function (_stream, arg1, arg2, arg3, arg4) {
    var out = new stream_1.PassThrough();
    out.write(arg1 + "\n");
    out.write(arg2.toString() + "\n");
    out.write(arg3.abc + "\n");
    out.write(arg4[0] + "\n");
    return out;
};
exports["default"] = exp;
