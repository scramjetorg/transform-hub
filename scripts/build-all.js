#!/usr/bin/env node

const { createSolutionBuilderHost, sys } = require("typescript");
const { createSolutionBuilder } = require("typescript");
const { readClosestPackageJSON, runCommand, getPackageList } = require("./lib/build-utils");
const minimist = require("minimist");
const { join } = require("path");

const { DataStream } = require("scramjet");
const PrePack = require("./lib/pre-pack");
const { writeFile } = require("fs/promises");

const opts = minimist(process.argv.slice(2), { boolean: ["dirs", "list", "workspaces"] });

if (opts.help || opts.h || opts["?"]) {
    console.error(`Usage: ${process.argv[1]} [--workspaces] [<workdir>] [<workspace> [<workspaces>...]] [--build-script=<name>] [--config-name=<tsconfig.name.json>] [--fast] [--copy-dist]`);
    console.error(`       ${process.argv[1]} --dirs <dir> [<dirs>...] [--config-name=<tsconfig.name.json>] [--fast] #builds specific directories`);
    console.error(`       ${process.argv[1]} --list [--workspaces|--dirs] [<args>...] # prints list of dirs or workspaces`);
    console.error(`       ${process.argv[1]} --config=<tsconfig.location.json> # builds one specific tsconfig`);
    process.exit(1);
}

const BUILD_NAME = "=== === === === === ===\nbuild";

console.time(BUILD_NAME);

// eslint-disable-next-line complexity
(async function() {
    let exitcode;

    if (!opts["no-build"]) {
        console.timeLog(BUILD_NAME, "Finding packages to build");

        const pkg = readClosestPackageJSON();
        const nodeSystem = createSolutionBuilderHost(sys);
        const configName = opts["config-name"] || "tsconfig.json";

        const packages = getPackageList(pkg, configName, opts);

        console.timeLog(BUILD_NAME, `Found ${packages.length} packages to build`);

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

        console.timeLog(BUILD_NAME, `Found ${packages.length} configs, building...`);

        exitcode = solution.build();

        console.timeLog(BUILD_NAME, "Done.");
    }

    if (exitcode) {
        console.timeLog(BUILD_NAME, "Build errored");
        throw new Error(`Build failed with exitcode=${exitcode}`);
    }

    if (opts["copy-dist"]) {
        console.timeLog(BUILD_NAME, "Finding all packages...");

        const pkg = readClosestPackageJSON();
        const packages = getPackageList(pkg, "package.json", opts);

        const outDir = process.env.OUT_DIR || "dist";
        const prepacks = packages.map((root) => new PrePack({
            cwd: root,
            outDir,
            log: () => 0,
            localPkgs: process.env.LOCAL_PACKAGES,
            flatPkgs: process.env.FLAT_PACKAGES,
            localCopy: process.env.LOCAL_COPY,
            noInstall: true,
            public: process.env.MAKE_PUBLIC,
            distPackDir: process.env.DIST_PACK_DIR
        }));

        console.timeLog(BUILD_NAME, `Found ${prepacks.length} packages, prepacking...`);

        await DataStream.from(prepacks)
            .do(pack => { pack.startTs = Date.now(); })
            .do(pack => pack.build())
            .do(pack => console.error(`${pack.currDir} done in ${Date.now() - pack.startTs} millis`))
            .run()
            .catch(async (e) => {
                process.once("beforeExit", () => {
                    console.error(`Pack error occured in ${e.chunk.currDir}`);
                    e.chunk.logs.forEach((log) => console.error(...log));
                });
                throw e.cause;
            });

        console.timeLog(BUILD_NAME, "Done, setting up workspace...");

        if (opts.fast && exists(join(outDir, "package-lock.json"))) return;

        if (!process.env.NO_WORKSPACE)
            await writeFile(join(outDir, "package.json"), "{\"private\": true, \"workspaces\": [\"**\"]}");

        if (!process.env.NO_INSTALL) {
            console.timeLog(BUILD_NAME, "Done, installing packages...");

            console.error(`Installing packages in ${outDir}`);

            const cmd = `cd ${outDir} && pwd >&2 && npx npm@8 install -q -ws --no-audit`;

            await runCommand(cmd, true);
            await DataStream.from(prepacks)
                .do((/** @type {PrePack} */ pack) => pack.install())
                .run();
        }

        console.timeLog(BUILD_NAME, "Done installing, completed.");
    }
})()
    .catch(e => {
        console.timeLog(BUILD_NAME, "Error occured.");
        console.error(e.stack);
        process.exitCode = e.exitCode || 10;
    });
