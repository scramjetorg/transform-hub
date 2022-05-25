#!/usr/bin/env node

"use strict";

const {
    runCommand, getPackagesInWorkspace,
    makeTypescriptSolutionForPackageList, findClosestPackageJSONLocation
} = require("./lib/build-utils");
const minimist = require("minimist");
const { join, resolve, relative } = require("path");

const { DataStream } = require("scramjet");
const PrePack = require("./lib/pre-pack");
const { writeFile } = require("fs/promises");
const { getDeepDeps } = require("./lib/get-deep-deps");
const { cwd, env } = require("process");
const { getDepTypes } = require("./lib/opts");
const { existsSync } = require("fs");

const opts = minimist(process.argv.slice(2), {
    alias: {
        list: "l",
        fast: "f",
        help: ["h", "?"],
        workspace: "w",
        dependencies: "d",
        root: "r",
    },
    default: {
        root: env.WORKSPACE_ROOT || cwd(),
        build: !env.NO_BUILD,
        dist: !env.NO_COPY_DIST,
        install: !env.NO_INSTALL,
        outdir: env.OUT_DIR || "dist",
        "link-packages": env.LOCAL_PACKAGES,
        "local-copy": env.LOCAL_COPY,
        "flat-packages": env.FLAT_PACKAGES,
        "make-public": env.MAKE_PUBLIC,
    },
    boolean: [
        "install", "build", "dist",
        "list", "long-help", "fast", "help"
    ]
});

if (opts.help || opts["long-help"]) {
    const pName = relative(cwd(), process.argv[1]);
    const spaces = " ".repeat(pName.length);

    console.error("Builds TS and copies results to dist dir");
    console.error(`Usage: ${pName} [options]`);
    console.error(`       ${spaces} -w,--workspace <name> - workspace filter - default all workspaces`);
    console.error(`       ${spaces} -d,-dependencies <package> - builds dependencies of a package`);
    console.error(`       ${spaces} -l,--list - prints list of dirs and exits`);
    console.error(`       ${spaces} -r,--root <root> - main directory (default is cwd, env: WORKSPACE_ROOT)`);
    console.error(`       ${spaces} -f,--fast - do not install if package-lock.json exists in dist`);
    console.error(`       ${spaces} --long-help - for more options`);

    if (opts["long-help"]) {
        console.error(`       ${spaces} --ts-config <name> - the name of tsconfig.json file (default is tsconfig.json)`);
        console.error(`       ${spaces} --outdir - output directory (default <root>/DIST, env: OUT_DIR)`);
        console.error(`       ${spaces} --no-build - do not run install in dist, env: NO_BUILD`);
        console.error(`       ${spaces} --no-dist - do not run copy to dist, env: NO_COPY_DIST`);
        console.error(`       ${spaces} --no-install - do not run install in dist, env: NO_INSTALL`);
        console.error(`       ${spaces} --link-packages - hardlink packages via file://, env: LOCAL_PACKAGES`);
        console.error(`       ${spaces} --flat-packages - copy all packages to one dir, env: FLAT_PACKAGES`);
        console.error(`       ${spaces} --local-copy - copy license and readme, env: LOCAL_COPY`);
        console.error(`       ${spaces} --make-public - unprivate the package, env: MAKE_PUBLIC`);
        console.error(`       ${spaces} --bundle - install locally in the package not workspace`);
    }

    process.exit(1);
}

const BUILD_NAME = "build";

console.time(BUILD_NAME);

// eslint-disable-next-line complexity
(async function() {
    let exitcode;

    const pkg = findClosestPackageJSONLocation(opts.root);
    const allPackages = getPackagesInWorkspace(pkg, [opts.workspace].flat().filter(x => x));
    let packages = allPackages;

    if (opts.dependencies) {
        packages = await getDeepDeps(opts.root, getDepTypes({ a: true }), [opts.dependencies].flat(), packages);
        // potentially is there reason not to build all dependency types?
    }

    if (opts.list) {
        console.log(packages.join("\n"));
        process.exit();
    }

    if (opts.build) {
        console.timeLog(BUILD_NAME, "Finding packages to build typescript.");

        const configName = opts["ts-config"] || "tsconfig.json";
        const tsPackages = packages
            .filter((pkgDir) => existsSync(join(pkgDir, configName)));

        const solution = makeTypescriptSolutionForPackageList(tsPackages, configName);

        console.timeLog(BUILD_NAME, `Found ${tsPackages.length} configs, building...`);

        exitcode = solution.build();

        console.timeLog(BUILD_NAME, "Done.");
    }

    if (exitcode) {
        console.timeLog(BUILD_NAME, "Build errored");
        throw new Error(`Build failed with exitcode=${exitcode}`);
    }

    if (opts.dist) {
        console.timeLog(BUILD_NAME, "Finding all packages...");

        const outDir = resolve(opts.root, opts.outdir);
        const prepacks = packages.map((root) => new PrePack({
            cwd: root,
            outDir,
            log: () => 0,
            distPackDir: opts.outdir,
            localPkgs: opts["link-packages"],
            flatPkgs: opts["flat-packages"],
            localCopy: opts["local-copy"],
            noInstall: true,
            public: opts["make-public"]
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

        if (opts.install) {
            const contents = {
                private: true,
                workspaces: prepacks.map(x => relative(outDir, x.rootDistPackPath))
            };

            await writeFile(join(outDir, "package.json"), JSON.stringify(contents, null, 2));
            console.timeLog(BUILD_NAME, `Done, installing packages in ${outDir}...`);

            const cmd = `cd ${outDir} && pwd >&2 && npx npm@8 install -q -ws --no-audit`;

            await runCommand(cmd, false);
        }

        if (opts.bundle) {
            console.timeLog(BUILD_NAME, "Done, bundling...");

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
