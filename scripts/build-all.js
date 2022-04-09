#!/usr/bin/env node

const { createSolutionBuilderHost, sys, readConfigFile } = require("typescript");
const { createSolutionBuilder } = require("typescript");
const { readClosestPackageJSON, getTSDirectoriesFromPackage, getTSDirectoriesFromGlobs } = require("./lib/build-utils");
const minimist = require("minimist");
const { join } = require("path");

const opts = minimist(process.argv.slice(2), {boolean: ['dirs', 'list', 'workspaces']});

(function () {
    if (opts.help || opts.h || opts["?"]) {
        console.error(`Usage: ${process.argv[1]} [--workspaces] [<workdir>] [<workspace> [<workspaces>...]] [--config-name=<tsconfig.name.json>] [--fast]`)
        console.error(`       ${process.argv[1]} --dirs <dir> [<dirs>...] [--config-name=<tsconfig.name.json>] [--fast] #builds specific directories`)
        console.error(`       ${process.argv[1]} --list [--workspaces|--dirs] [<args>...] # prints list of dirs or workspaces`)
        console.error(`       ${process.argv[1]} --config=<tsconfig.location.json> # builds one specific tsconfig`)
        process.exit(1);
    }

    const pkg = readClosestPackageJSON();
    const nodeSystem = createSolutionBuilderHost(sys);
    const workspaceFilter = opts._.slice(1);
    const fast = opts.fast;
    const configName = opts["config-name"] || "tsconfig.json";


    let packages;
    if (opts.config) {
        packages = getTSDirectoriesFromPackage(process.cwd(), dirname(opts.config), pkg, workspaceFilter, configName);
    } else if (opts.dirs) {
        packages = getTSDirectoriesFromGlobs(process.cwd(), opts._, configName);
    } else {
        packages = getTSDirectoriesFromPackage(process.cwd(), opts._[0], pkg, workspaceFilter, configName);
    }

    if (opts.list) {
        console.log(packages.join("\n"));
        process.exit();
    }

    packages.forEach(packageDir => {
        if (packageDir) {
            nodeSystem.readDirectory(packageDir);
        }
    })

    const rootnames = packages.map(x => join(x, configName));
    const solution = createSolutionBuilder(nodeSystem, rootnames, {
        dry: false,
        assumeChangesOnlyAffectDirectDependencies: true,
        incremental: true,
        verbose: false
    });

    const exitcode = solution.build();

    process.exit(exitcode);
})();
