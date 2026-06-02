"use strict";

module.exports = function directMarker(input, outPath) {
    if (typeof input !== "object" || input === null) throw new TypeError("expected input stream");
    require("fs").writeFileSync(outPath, "marker\n");
};
