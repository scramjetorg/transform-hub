#!/usr/bin/env node
/* eslint-disable padding-line-between-statements */

const { glob } = require("glob");
const { readFileSync, writeFileSync } = require("fs");
const { resolve } = require("path");
const cwd = resolve(__dirname, "../");
const options = {};
const [path, _value, match] = process.argv.slice(2).reduce((acc, x) => {
    if (x.startsWith("--"))
        if (x.includes("=")) {
            const [k, v] = x.substr(2).split("="); options[k] = v;
        } else options[x.substr(2)] = true;
    else if (x.startsWith("-")) x.substr(1).split("").forEach(y => { options[y] = true; });
    else acc.push(x);
    return acc;
}, []);

if (!path || options.help || options.h || options["?"]) {
    console.error(`Usage: ${process.argv[1]} [--pattern=<json-glob>] [--delete|-d] [--override|-o] <key-path> [<value>] [<name-match>]`);
    process.exit(1);
}

const chunks = path.split(".");
const key = chunks.pop();
const re = match ? require("globrex")(match).regex : "";
const del = options.d || options.delete;
const pattern = options.pattern || "packages/**/package.json";
const override = del || options.override || options.o;
const value = del ? undefined : _value;
const packages = glob.sync(pattern, {
    cwd,
    ignore: "**/node_modules/**"
});

for (const file of packages) {
    if (!file.match(re)) continue;

    try {
        const str = readFileSync(resolve(cwd, file), { encoding: "utf-8" });
        // eslint-disable-next-line import/no-dynamic-require
        const contents = JSON.parse(str);

        if (del || value) {
            const obj2 = chunks.reduce((acc, k) => {
                if (typeof acc[k] === "object") return acc[k];

                if (k in acc) throw new Error("Traversal into non-object");

                acc[k] = {};
                return acc[k];
            }, contents);

            if (typeof obj2 === "object") {
                if ((!(key in obj2) || override) && obj2[key] !== value) {
                    obj2[key] = value;
                    writeFileSync(resolve(cwd, file), `${JSON.stringify(contents, null, 2)}\n`, "utf-8");
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
