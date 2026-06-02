"use strict";

module.exports = function throwing(input) {
    if (typeof input !== "object" || input === null) throw new TypeError("expected input stream");
    throw new Error("fixture boom");
};
