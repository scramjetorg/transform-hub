#!/usr/bin/env node

const { glob } = require("glob");
const { readFileSync, writeFileSync } = require("fs");
const { resolve } = require("path");
const cwd = resolve(__dirname, "../");
const packages = glob.sync("packages/**/package.json", {
    cwd,
    ignore: "**/node_modules/**"
});
const options = {};
const [path, value] = process.argv.slice(2).reduce((acc, x) => {
    if (x.startsWith("--")) options[x.substr(2)] = true;
    else if (x.startsWith("-")) x.substr(1).split("").forEach(y => { options[y] = true; });
    else acc.push(x);
    return acc;
}, []);
// const [,, path, value, ...opts] = process.argv;
const chunks = path.split(".");
const key = chunks.pop();

if (!path || options.help || options.h || options["?"]) {
    console.error(`Usage: ${process.argv[1]} [--override|-o] <key-path> [<value>]`);
    process.exit(1);
}

for (const file of packages) {
    try {
        const str = readFileSync(resolve(cwd, file), { encoding: "utf-8" });
        // eslint-disable-next-line import/no-dynamic-require
        const contents = JSON.parse(str);

        if (value) {
            const obj2 = chunks.reduce((acc, k) => {
                if (typeof acc[k] === "object") return acc[k];

                if (k in acc) throw new Error("Traversal into non-object");

                acc[k] = {};
                return acc[k];
            }, contents);

            if (obj2 && typeof obj2 === "object") {
                if (!(key in obj2) || options.override || options.o) {
                    obj2[key] = value;
                    writeFileSync(resolve(cwd, file), JSON.stringify(contents, null, 2), "utf-8");
                }
            }
        }

        const obj = chunks.reduce((acc, k) => acc && acc[k], contents);

        if (obj && typeof obj === "object" && key in obj) console.log(file, obj[key]);
        else console.error(file, "<no key>");

    } catch (e) {
        console.error(file, "ERR", e.message);
    }
}
