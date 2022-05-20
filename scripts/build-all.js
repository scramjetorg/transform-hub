#!/usr/bin/env node

const { createSolutionBuilderHost, sys } = require("typescript");
const { createSolutionBuilder } = require("typescript");
const { readClosestPackageJSON, runCommand, getPackageList } = require("./lib/build-utils");
const minimist = require("minimist");
const { join, dirname } = require("path");

const { DataStream } = require("scramjet");
const PrePack = require("./lib/pre-pack");
const { writeFile } = require("fs/promises");

const opts = minimist(process.argv.slice(2), { boolean: ["dirs", "list", "workspaces"] });

if (opts.help || opts.h || opts["?"]) {
    console.error(`Usage: ${process.argv[1]} [--workspaces] [<workdir>] [<workspace> [<workspaces>...]] [--config-name=<tsconfig.name.json>] [--fast] [--copy-dist]`);
    console.error(`       ${process.argv[1]} --dirs <dir> [<dirs>...] [--config-name=<tsconfig.name.json>] [--fast] #builds specific directories`);
    console.error(`       ${process.argv[1]} --list [--workspaces|--dirs] [<args>...] # prints list of dirs or workspaces`);
    console.error(`       ${process.argv[1]} --config=<tsconfig.location.json> # builds one specific tsconfig`);
    process.exit(1);
}

(async function() {
    const pkg = readClosestPackageJSON();
    const nodeSystem = createSolutionBuilderHost(sys);
    const configName = opts["config-name"] || "tsconfig.json";

    const packages = getPackageList(pkg, configName, opts);

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
        const outDir = process.env.OUT_DIR || "dist";
        const prepacks = rootnames.map((root) => new PrePack({
            cwd: dirname(root),
            outDir,
            localPkgs: process.env.LOCAL_PACKAGES,
            flatPkgs: process.env.FLAT_PACKAGES,
            localCopy: process.env.LOCAL_COPY,
            noInstall: true,
            public: process.env.MAKE_PUBLIC,
            distPackDir: process.env.DIST_PACK_DIR
        }));

        await DataStream.from(prepacks)
            .do(pack => { pack.startTs = Date.now(); })
            .do(pack => pack.build())
            .do(pack => console.error(`${pack.currDir} done in ${Date.now() - pack.startTs} millis`))
            .run();

        if (!process.env.NO_WORKSPACE)
            await writeFile(join(outDir, "package.json"), "{\"private\": true, \"workspaces\": [\"**\"]}");

        if (!process.env.NO_INSTALL) {
            console.error(`Installing packages in ${outDir}`);

            const cmd = `cd ${outDir} && pwd >&2 && npx npm@8 install -ws --no-audit`;

            await runCommand(cmd, true);
            await DataStream.from(prepacks)
                .do((/** @type {PrePack} */ pack) => pack.install())
                .run();
        }
    }
})()
    .catch(e => {
        console.error(e.stack);
        process.exitCode = e.exitCode || 10;
    });
