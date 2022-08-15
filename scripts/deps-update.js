#!/usr/bin/env node
/* eslint-disable complexity */

const semver = require("semver");
const { resolve, dirname, join } = require("path");
const { readFile, writeFile, mkdir } = require("fs/promises");
const { exec } = require("child_process");
const { promisify } = require("util");
const { findClosestPackageJSONLocation, getPackagesInWorkspace } = require("./lib/build-utils");
const { cwd, env } = require("process");
const minimist = require("minimist");

function older(v1, v2) {
    return !semver.valid(v1) || semver.valid(v2) && semver.gt(v2, v1);
}

const opts = minimist(process.argv.slice(2), {
    alias: {
        list: "l",
        help: ["h", "?"],
        workspace: "w",
        fix: "f",
        verbose: "v",
        root: "r",
    },
    default: {
        root: env.WORKSPACE_ROOT || cwd(),
    },
    boolean: [
        "list", "long-help", "help", "verbose", "fix"
    ]
});

if (opts.help || opts["long-help"]) {
    const pName = relative(cwd(), process.argv[1]);
    const spaces = " ".repeat(pName.length);

    console.error("Builds TS and copies results to dist dir");
    console.error(`Usage: ${pName} [options]`);
    console.error(`       ${spaces} -f,--fix - write changes to packages`);
    console.error(`       ${spaces} -w,--workspace <name> - workspace filter - default all workspaces`);
    console.error(`       ${spaces} -l,--list - prints list of dirs and exits`);
    console.error(`       ${spaces} -r,--root <root> - main directory (default is cwd, env: WORKSPACE_ROOT)`);
    console.error(`       ${spaces} -v,--verbose - show verbose output`);

    // console.error(`       ${spaces} --long-help - for more options`);
    //if (opts["long-help"]) {}

    process.exit(1);
}

(async () => {
    const pkg = findClosestPackageJSONLocation(opts.root);
    const wd = dirname(pkg);

    const outFile = resolve(wd, "./.all-deps/package.json");
    const outFileCopy = outFile.replace(/\.json$/, ".previous.json");
    const outDir = dirname(outFile);

    const allDeps = {
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
        optionalDependencies: {}
    };

    const depTypes = Object.keys(allDeps);

    const packageTpl = {
        name: "@scramjet/all-deps",
        version: "",
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
        optionalDependencies: {}
    };

    const packages = getPackagesInWorkspace(pkg, [opts.workspace].flat().filter(x => x));

    if (opts.list) {
        console.log(packages.join("\n"));
        process.exit();
    }

    // Create tmp working directory.
    try {
        await mkdir(outDir);
    // eslint-disable-next-line no-empty
    } catch {}


    console.log("Reading packages...");


    const allContents = await Promise.all([wd, ...packages].map(x => join(x, "package.json")).map(async (file) => {
        console.log(`- ${file}`);

        try {
            return [file, JSON.parse(await readFile(resolve(wd, file), { encoding: "utf-8" }))];
        } catch(e) {
            console.error(":")
        }
    }).filter(x => x));


    console.log("Indexing packages:");

    const packageContents = {};
    const localVersions = allContents.reduce((acc, [, {name, version}]) => {
        acc[name] = version.replace(/^\^?|^(?=\d)/, "^");
        return acc;
    }, {});

    // Gather all deps from all packages.
    await Promise.all(allContents.map(async ([file, package]) => {
        console.log(`- ${file} = ${package.name}@${package.version}`);

        try {
            packageContents[file] = package;

            // Update packageTpl version to the latest one.
            if (typeof package.name === "string" && package.name.startsWith("@scramjet/")) {
                if (older(packageTpl.version, package.version)) {
                    packageTpl.version = package.version.replace(/^\^?|^(?=\d)/, "^");
                }
            }

            for (const depType of depTypes) {
                if (package[depType]) {
                    for (const dep of Object.keys(package[depType])) {
                        if (dep in localVersions) continue;

                        allDeps[depType][dep] = allDeps[depType][dep] || [];
                        allDeps[depType][dep].push(package[depType][dep]);
                    }
                }
            }
        } catch (err) {
            console.error("Error while indexing packages.", file, err);
        }
    }));

    // Remove duplicates, sort versions for each dep and add to packageTpl.
    for (const depType of Object.keys(allDeps)) {
        for (const dep of Object.keys(allDeps[depType])) {
            allDeps[depType][dep] = Array.from(new Set(allDeps[depType][dep])).sort(older);

            packageTpl[depType][dep] = allDeps[depType][dep][0];
        }
    }

    // Write to package.json and package.previous.json.
    await writeFile(outFile, `${JSON.stringify(packageTpl, null, 2)}\n`, "utf-8");
    await writeFile(outFileCopy, `${JSON.stringify(packageTpl, null, 2)}\n`, "utf-8");

    console.log("Generating package-lock.json file. This may take a while...");

    // Update deps.
    try {
        await promisify(exec)(`cd ${outDir} && npm install --package-lock-only --force`);

        const lockFile = JSON.parse(await readFile(resolve(outDir, "package-lock.json"), { encoding: "utf-8" }));
        const newDeps = JSON.parse(await readFile(resolve(wd, outFile), { encoding: "utf-8" }));

        for (const depType of depTypes) {
            if (newDeps[depType]) {
                for (const dep of Object.entries(newDeps[depType])) {
                    if (dep in localVersions) continue;

                    const [name, version] = dep;
                    const newVersion = version.replace(/\d+\.\d+\.\d+[^\s]*/, lockFile.dependencies[dep[0]].version);

                    newDeps[depType][name] = newVersion;
                }
            }
        }

        await writeFile(outFile, `${JSON.stringify(newDeps, null, 2)}\n`, "utf-8");
    } catch (err) {
        console.error("Error while updating deps.", err);
    }

    console.log("Updated dependencies:");

    let newDeps;

    // Report changes.
    try {
        newDeps = JSON.parse(await readFile(resolve(wd, outFile), { encoding: "utf-8" }));
        const oldDeps = JSON.parse(await readFile(resolve(wd, outFile.replace(/\.json$/, ".previous.json")), { encoding: "utf-8" }));

        for (const depType of depTypes) {
            if (newDeps[depType]) {
                for (const dep of Object.entries(newDeps[depType])) {
                    if (oldDeps[depType][dep[0]] !== dep[1]) {
                        console.log(`- ${dep[0]} ${depType} from ${oldDeps[depType][dep[0]]} to ${dep[1]}`);
                    }
                }
            }
        }
    } catch (err) {
        err.message = "Error while comparing packages: " + err.message;
        throw err;
    }

    console.log("Packages being updated:");
    await Promise.all(Object.entries(packageContents).map(async ([file, contents]) => {
        let changed = 0;

        for (const depType of depTypes) {
            if (contents[depType]) {
                for (const [dep, version] of Object.entries(contents[depType])) {
                    if (dep in localVersions) {
                        contents[depType][dep] = localVersions[dep];
                    } else if (version !== allDeps[depType][dep]) {
                        contents[depType][dep] = newDeps[depType][dep];
                        changed++;
                    }
                }
            }
        }

        if (changed) {
            console.log(` - File ${file} needs ${changed} dependencies updates`);
            if (opts.fix) {
                await writeFile(file, `${JSON.stringify(contents, null, 2)}\n`, "utf-8");
            }
        }
    }));
})().catch(e => {
    console.error(e.stack);
});
