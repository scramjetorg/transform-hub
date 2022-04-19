"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const exp = function (_stream, ...args) {
    const out = new stream_1.PassThrough();
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
//# sourceMappingURL=index.js.map