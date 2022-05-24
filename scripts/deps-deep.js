#!/usr/bin/env node

"use strict";

const { getPackageList, readClosestPackageJSON } = require("./lib/build-utils");
const minimist = require("minimist");
const { DataStream } = require("scramjet");
const { readFile } = require("fs/promises");
const { join, resolve, relative } = require("path");
const { cwd } = require("process");

const opts = minimist(process.argv.slice(2), { boolean: ["d", "D", "p", "o"] });

if (opts.help || opts.h || opts["?"] || !opts.input) {
    console.error("Checks the given package directory and resolves known linked dependencies from the same project");
    console.error();
    console.error(`Usage: ${process.argv[1]} --input <initial-package.json-location> [-d] [-D] [-p] [-o]`);
    console.error("         --input <initial-package.json-location> - package location");
    console.error("         -a - all deps");
    console.error("         -d - deps");
    console.error("         -D - devDeps");
    console.error("         -p - peerDeps");
    console.error("         -o - optDeps");
    process.exit(1);
}

if (opts.a) {
    opts.d = opts.D = opts.p = opts.o = true;
}

const {
    d: dependencies,
    D: devDependencies,
    p: peerDependencies,
    o: optionalDependencies
} = opts;

const depTypes = Object
    .entries({ dependencies, devDependencies, peerDependencies, optionalDependencies })
    .filter(([, val]) => val)
    .map(([key]) => key)
    ;

if (!depTypes.length) {
    console.error("At least one of the swithces [-dDpo] needs to be passed, see --help");
    process.exit(1);
}

// eslint-disable-next-line complexity
(async function() {
    const pkg = readClosestPackageJSON();
    const { contents, index } = await DataStream
        .from(getPackageList(pkg, "package.json", opts))
        .map(async (path) => {
            const location = join(path, "package.json");
            const pkgc = JSON.parse(await readFile(location));

            return { path, location, pkgc };
        })
        .reduce((acc, { path, pkgc }) => {
            acc.index[`${pkgc.name}`] = path;
            acc.contents[path] = pkgc;
            return acc;
        }, {
            index: {},
            contents: {}
        })
    ;

    const check = [resolve(opts.input)];
    const dependencies = new Set();

    while(check.length) {
        const next = check.shift();
        if (dependencies.has(next)) continue;

        dependencies.add(next);
        if (next in contents) {
            const pkgData = contents[next];
            const moreDeps = depTypes.flatMap(type => Object.keys(pkgData[type] || {}));

            for (const dep of moreDeps) {
                if (dep in index)
                    check.push(index[dep]);
            }
        }
    }

    [...dependencies].forEach(depPath => {
        console.log(relative(cwd(), depPath));
    });
})()
    .catch(e => {
        console.error(e.stack);
        process.exitCode = e.exitCode || 10;
    });
