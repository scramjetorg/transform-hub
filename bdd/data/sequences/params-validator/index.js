"use strict";

module.exports = function(input, params) {
    if (!params || typeof params !== "object" || typeof params.requiredName !== "string") {
        throw new Error("INVALID_PARAMS expected first argument to be an object with requiredName string");
    }

    return input;
};
