"use strict";

const fs = require("fs");

function append(label) {
    return function(input, outPath) {
        if (typeof input !== "object" || input === null) throw new TypeError("expected input stream");
        fs.appendFileSync(outPath, label + "\n");
    };
}

module.exports = [append("first"), append("second"), append("third")];
