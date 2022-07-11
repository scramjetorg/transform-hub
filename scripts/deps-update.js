#!/usr/bin/env node
/* eslint-disable complexity */

const semver = require("semver");
const { glob } = require("glob");
const { resolve, dirname } = require("path");
const { readFile, writeFile, mkdir } = require("fs/promises");
const { exec } = require("child_process");
const { promisify } = require("util");
const cwd = resolve(__dirname, "../");

function older(v1, v2) {
    return !semver.valid(v1) || semver.valid(v2) && semver.gt(v2, v1);
}

(async () => {
    const outFile = resolve(cwd, "./all-deps/package.json");
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

    const packages = glob.sync("{./,packages/**,bdd}/package.json", {
        cwd,
        ignore: "**/node_modules/**"
    });

    // Create tmp working directory.
    await mkdir(outDir);

    console.log("Indexing packages:");

    // Gather all deps from all packages.
    await Promise.all(packages.map(async (file) => {
        console.log(`- ${file}`);

        try {
            const package = JSON.parse(await readFile(resolve(cwd, file), { encoding: "utf-8" }));

            // Update packageTpl version to the latest one.
            if (typeof package.name === "string" && package.name.startsWith("@scramjet/")) {
                if (older(packageTpl.version, package.version)) {
                    packageTpl.version = package.version.replace(/^\^?|^(?=\d)/, "^");
                }
            }

            for (const depType of depTypes) {
                if (package[depType]) {
                    for (const dep of Object.keys(package[depType])) {
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
        const newDeps = JSON.parse(await readFile(resolve(cwd, outFile), { encoding: "utf-8" }));

        for (const depType of depTypes) {
            if (newDeps[depType]) {
                for (const dep of Object.entries(newDeps[depType])) {
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

    // Report changes.
    try {
        const newDeps = JSON.parse(await readFile(resolve(cwd, outFile), { encoding: "utf-8" }));
        const oldDeps = JSON.parse(await readFile(resolve(cwd, outFile.replace(/\.json$/, ".previous.json")), { encoding: "utf-8" }));

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
        console.error("Error while comparing packages.", err);
    }
})().catch(e => {
    console.error("Error Occurred:");
    console.error(e.stack);
});
