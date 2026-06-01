"use strict";

module.exports = function bootfileDriven(input, outPath, message) {
    if (typeof input !== "object" || input === null) throw new TypeError("expected input stream");
    require("fs").writeFileSync(outPath, String(message) + "\n");
};
