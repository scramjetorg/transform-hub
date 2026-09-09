"use strict";

const test = require("ava").default;
const { readdirSync, readFileSync, statSync } = require("node:fs");
const { join, resolve } = require("node:path");

function sourceFiles(directory) {
    return readdirSync(directory).flatMap(name => {
        const file = join(directory, name);
        if (name === "dist") return [];
        if (statSync(file).isDirectory()) return sourceFiles(file);
        return file.endsWith(".ts") ? [file] : [];
    });
}

test("BDD runtime source does not couple to private source/test or root dist paths", t => {
    const forbidden = [
        /@scramjet\/[^"'`\s]+\/(?:src|test)(?:["'`\s]|\/)/,
        /(?:\.\.\/)+packages\/[^"'`\s]+\/src(?:["'`\s]|\/)/,
        /(?:from\s+|require\s*\(\s*)["'`](?:\.\.\/)+dist\//
    ];
    const bddRoot = resolve(__dirname, "..", "..", "bdd");
    for (const file of sourceFiles(bddRoot)) {
        const source = readFileSync(file, "utf8");
        for (const pattern of forbidden) t.false(pattern.test(source), `${file} violates ${pattern}`);
    }
});
