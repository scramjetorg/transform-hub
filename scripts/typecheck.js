#!/usr/bin/env node

/**
 * Typechecks every release-boundary package build config without emitting files.
 * A root tsconfig does not exist, so invoking tsc against tsconfig.base.json
 * would neither discover nor validate the package compilation units.
 */

const { spawnSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const ROOT = resolve(__dirname, "..");

function typecheckConfigs(root = ROOT) {
    const rootPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const releasePackages = rootPackage.workspaces?.release;
    if (!Array.isArray(releasePackages)) throw new Error("Root workspaces.release must list typechecked packages.");

    return releasePackages
        .map((packageDirectory) => join(root, packageDirectory, "tsconfig.build.json"))
        .filter(existsSync)
        .sort();
}

function runTypecheck(configs, spawn = spawnSync) {
    const tsc = require.resolve("typescript/bin/tsc");
    for (const config of configs) {
        console.error(`[typecheck] ${config}`);
        const result = spawn(process.execPath, [tsc, "--noEmit", "--pretty", "false", "--project", config], {
            cwd: ROOT,
            stdio: "inherit"
        });
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error(`Typecheck failed for ${config}.`);
    }
}

function main() {
    try {
        runTypecheck(typecheckConfigs());
    } catch (error) {
        console.error(`[typecheck] ${error.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();

module.exports = { runTypecheck, typecheckConfigs };
