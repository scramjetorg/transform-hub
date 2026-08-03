"use strict";

module.exports = {
    default: function defaultExport(input, outPath) {
        if (typeof input !== "object" || input === null) throw new TypeError("expected input stream");
        require("fs").writeFileSync(outPath, "default-export\n");
    }
};
