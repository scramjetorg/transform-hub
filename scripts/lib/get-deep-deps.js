"use strict";

const { DataStream } = require("scramjet");
const { join, relative, resolve } = require("path");
const { readFile } = require("fs/promises");

const getDeepDeps = async (cwd, depTypes, inputs, packages) => {
    const { contents, index } = await DataStream
        .from(packages)
        .map(async (_path) => {
            const path = resolve(cwd, _path);
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
        });

    const check = inputs.map(x => resolve(cwd, x));
    const dependencies = new Set();

    while (check.length) {
        const next = check.shift();

        if (dependencies.has(next))
            continue;

        dependencies.add(next);
        if (next in contents) {
            const pkgData = contents[next];
            const moreDeps = depTypes.flatMap(type => Object.keys(pkgData[type] || {}));

            for (const dep of moreDeps) {
                if (dep in index && index[dep])
                    check.push(index[dep]);
            }
        }
    }

    return [...dependencies.values()].map(depPath => relative(cwd, depPath));
};

module.exports = { getDeepDeps };
