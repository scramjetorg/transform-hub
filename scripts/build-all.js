#!/usr/bin/env node

const { createSolutionBuilderHost, sys } = require("typescript");
const { createSolutionBuilder } = require("typescript");
const { readClosestPackageJSON, getTSDirectoriesFromPackage, getTSDirectoriesFromGlobs } = require("./lib/build-utils");
const minimist = require("minimist");
const { join, dirname } = require("path");

const { DataStream } = require("scramjet");
const PrePack = require("./lib/pre-pack");

const opts = minimist(process.argv.slice(2), { boolean: ["dirs", "list", "workspaces"] });

function getPackageList(pkg, workspaceFilter, configName) {
    let packages;

    if (opts.config) {
        packages = getTSDirectoriesFromPackage(process.cwd(), dirname(opts.config), pkg, workspaceFilter, configName);
    } else if (opts.dirs) {
        packages = getTSDirectoriesFromGlobs(process.cwd(), opts._, configName);
    } else {
        packages = getTSDirectoriesFromPackage(process.cwd(), opts._[0], pkg, workspaceFilter, configName);
    }
    return packages;
}

(async function() {
    if (opts.help || opts.h || opts["?"]) {
        console.error(`Usage: ${process.argv[1]} [--workspaces] [<workdir>] [<workspace> [<workspaces>...]] [--config-name=<tsconfig.name.json>] [--fast] [--copy-dist]`);
        console.error(`       ${process.argv[1]} --dirs <dir> [<dirs>...] [--config-name=<tsconfig.name.json>] [--fast] #builds specific directories`);
        console.error(`       ${process.argv[1]} --list [--workspaces|--dirs] [<args>...] # prints list of dirs or workspaces`);
        console.error(`       ${process.argv[1]} --config=<tsconfig.location.json> # builds one specific tsconfig`);
        process.exit(1);
    }

    const pkg = readClosestPackageJSON();
    const nodeSystem = createSolutionBuilderHost(sys);
    const workspaceFilter = opts._.slice(1);
    // const fast = opts.fast;
    const configName = opts["config-name"] || "tsconfig.json";

    const packages = getPackageList(pkg, workspaceFilter, configName);

    if (opts.list) {
        console.log(packages.join("\n"));
        process.exit();
    }

    packages.forEach(packageDir => {
        if (packageDir) {
            nodeSystem.readDirectory(packageDir);
        }
    });

    const rootnames = packages.map(x => join(x, configName));

    const solution = createSolutionBuilder(nodeSystem, rootnames, {
        dry: false,
        assumeChangesOnlyAffectDirectDependencies: true,
        incremental: true,
        verbose: false
    });

    const exitcode = solution.build();

    console.error("Build done");

    if (exitcode) throw new Error(`Build failed with exitcode=${exitcode}`);

    if (opts["copy-dist"]) {
        await DataStream.from(rootnames)
            .map((root) => new PrePack({
                cwd: dirname(root),
                outDir: process.env.OUT_DIR || "dist",
                localPkgs: process.env.LOCAL_PACKAGES,
                flatPkgs: process.env.FLAT_PACKAGES,
                localCopy: process.env.LOCAL_COPY,
                noInstall: process.env.NO_INSTALL,
                public: process.env.MAKE_PUBLIC,
                distPackDir: process.env.DIST_PACK_DIR
            }))
            .do(pack => { pack.startTs = Date.now(); })
            .do(pack => pack.build())
            .do(pack => console.error(`${pack.currDir} done in ${Date.now() - pack.startTs} millis`))
            .run();
    }
})()
    .catch(e => {
        console.error(e.stack);
        process.exitCode = e.exitCode || 10;
    });
