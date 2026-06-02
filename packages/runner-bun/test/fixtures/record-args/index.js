"use strict";

module.exports = function recordArgs(input, outPath) {
    if (typeof input !== "object" || input === null) throw new TypeError("expected input stream");
    const args = Array.prototype.slice.call(arguments, 2);
    require("fs").writeFileSync(outPath, JSON.stringify(args));
};
