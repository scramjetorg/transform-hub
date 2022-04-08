#!/usr/bin/env node

const { join, resolve } = require("path");
const { createSolutionBuilderHost, sys } = require("typescript");
const glob = require("glob");
const { createSolutionBuilder } = require("typescript");
const { existsSync } = require("fs");
const { readClosestPackageJSON } = require("./lib/build-utils");

/**
 * @type {typeof import("../package.json")}
 */
const pkg = readClosestPackageJSON(
    // process.argv.length > 2 ? resolve(process.cwd(), process.argv[2]) : process.cwd()
);

const nodeSystem = createSolutionBuilderHost(sys);

const cwd = resolve(__dirname, '..');

// Todo: choose the right workspace
const workspaces = Array.isArray(pkg.workspaces) ? {"default": pkg.workspaces} : pkg.workspaces;

const packages = Object.entries(workspaces)
    .flatMap(([key, entries]) => entries)
    .map((pattern) => glob.sync(pattern, {cwd}))
    .flat()
    .map((x) => resolve(cwd, x))
    .filter((pkg) => existsSync(join(pkg, 'tsconfig.json')))
;

packages.forEach(packageDir => {
    if (packageDir) {
        nodeSystem.readDirectory(packageDir);
    }
})

const solution = createSolutionBuilder(nodeSystem, packages, {
    dry: false,
    incremental: true,
    verbose: false
});

solution.build();


