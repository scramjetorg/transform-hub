#!/usr/bin/env node

const { createSolutionBuilderHost, sys } = require("typescript");
const { createSolutionBuilder } = require("typescript");
const { readClosestPackageJSON, getTSDirectoriesFromPackage, getTSDirectoriesFromGlobs } = require("./lib/build-utils");
const minimist = require("minimist");

const opts = minimist(process.argv.slice(2), {boolean: ['dirs', 'list', 'workspaces']});

(function () {
    if (opts.help || opts.h || opts["?"]) {
        console.error(`Usage: ${process.argv[1]} [--workspaces] [<workdir>] [<workspace> [<workspaces>...]]`)
        console.error(`       ${process.argv[1]} --dirs <dir> [<dirs>...] #builds specific directories`)
        console.error(`       ${process.argv[1]} --config-name=<tsconfig.name.json> # uses name as config`)
        console.error(`       ${process.argv[1]} --list [--workspaces|--dirs] [<args>...] # prints list of dirs or workspaces`)
        console.error(`       ${process.argv[1]} --config=<tsconfig.location.json> # builds one specific tsconfig`)
        process.exit(1);
    }

    const pkg = readClosestPackageJSON();
    const nodeSystem = createSolutionBuilderHost(sys);
    const workspaceFilter = opts._.slice(1);


    let packages;
    if (opts.config) {
        packages = getTSDirectoriesFromPackage(process.cwd(), dirname(opts.config), pkg, workspaceFilter);
    } else if (opts.dirs) {
        packages = getTSDirectoriesFromGlobs(process.cwd(), opts._);
    } else {
        packages = getTSDirectoriesFromPackage(process.cwd(), opts._[0], pkg, workspaceFilter);
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

    const solution = createSolutionBuilder(nodeSystem, packages, {
        dry: false,
        incremental: true,
        verbose: false
    });

    const exitcode = solution.build();

    process.exit(exitcode);
})();
