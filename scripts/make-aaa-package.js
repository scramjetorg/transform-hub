#!/usr/bin/env node

const semver = require("semver");
const { glob } = require("glob");
const { readFileSync, writeFileSync } = require("fs");
const { resolve } = require("path");
const cwd = resolve(__dirname, "../");
const options = {};

/* const [] = */
process.argv.slice(2).reduce((acc, x) => {
    if (x.startsWith("--")) options[x.substr(2)] = true;
    else if (x.startsWith("-")) x.substr(1).split("").forEach(y => { options[y] = true; });
    else acc.push(x);
    return acc;
}, []);

if (options.help || options.h || options["?"]) {
    console.error(`Usage: ${process.argv[1]} [-o path/to/output.json] # default: aaa/package.json`);
    process.exit(1);
}

const out = resolve(cwd, "aaa/package.json");
const packages = glob.sync("packages/**/package.json", {
    cwd,
    ignore: "**/node_modules/**"
});
const package = {
    name: "@scramjet/info",
    version: "",
    install: "exit 0",
    dependencies: {},
    devDependencies: {},
    peerDependencies: {},
    optiopnalDependencies: {}
};
const deps = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optiopnalDependencies"
];

function older(v1, v2) {
    return !v1 || semver.valid(v2) && semver.gt(v2, v1);
}

for (const file of packages) {
    try {
        const str = readFileSync(resolve(cwd, file), { encoding: "utf-8" });
        const contents = JSON.parse(str);

        if (typeof contents.name === "string" && contents.name.startsWith("@scramjet/")) {
            if (older(package.version, contents.version))
                package.version = contents.version;
        }

        for (const n of deps) {
            if (contents[n]) {
                for (const dep of Object.keys(contents[n])) {
                    if (older(package[n][dep], contents[n][dep]))
                        package[n][dep] = contents[n][dep];
                }
            }
        }
    } catch (e) {
        console.error(file, "ERR", e.message);
    }
}

for (const n of deps) {
    const unsorted = package[n];

    package[n] = Object.keys(unsorted)
        .sort()
        // eslint-disable-next-line no-return-assign, no-sequences
        .reduce((acc, key) => (acc[key] = unsorted[key], acc), {});
}

writeFileSync(out, `${JSON.stringify(package, null, 2)}\n`, "utf-8");

