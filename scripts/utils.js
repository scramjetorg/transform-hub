"use strict";

const merge = (target, source = {}, strict = false) => Object.keys(source)
    .forEach((key) => {
        if (typeof source[key] === "object" && !Array.isArray(source[key])) {
            if (target[key] === undefined) target[key] = {};
            merge(target[key], source[key]);
        } else if (source[key] !== undefined) {
            target[key] = source[key];
        } else if (strict) {
            throw new Error(`Unkown option ${String(key)} in config`);
        }
    });

module.exports = {
    merge
};
