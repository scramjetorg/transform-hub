#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const bddRoot = path.join(repoRoot, "bdd");
const dockerRunner = path.join(repoRoot, "scripts", "run-bdd-docker.js");
const waves = {
    verser2: path.join("features", "verser2", "VERSER2-001-isolated-routing.feature")
};

function featureFiles(directory) {
    return fs
        .readdirSync(directory, { withFileTypes: true })
        .flatMap((entry) => {
            const absolute = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                return featureFiles(absolute);
            }

            return entry.isFile() && entry.name.endsWith(".feature") ? [path.relative(bddRoot, absolute)] : [];
        })
        .sort();
}

function parseArgs(args) {
    let waveName = process.env.BDD_WAVE || null;
    const passthrough = [];

    for (const arg of args) {
        if (arg.startsWith("--wave=")) {
            waveName = arg.slice("--wave=".length);
        } else {
            passthrough.push(arg);
        }
    }

    return { waveName, passthrough };
}

function commandArgs(features, passthrough) {
    const options = passthrough.includes("--fail-fast") ? passthrough : ["--fail-fast", ...passthrough];
    return [dockerRunner, "--", ...options, ...features];
}

function defaultRunChild(owner, features, passthrough) {
    const args = commandArgs(features, passthrough);
    process.stderr.write(`[run-bdd-waves] owner=${owner} features=${features.length}\n`);
    process.stderr.write(`[run-bdd-waves] command=${process.execPath} ${args.join(" ")}\n`);

    const result = spawnSync(process.execPath, args, {
        cwd: repoRoot,
        env: process.env,
        stdio: "inherit"
    });

    return result.status === null ? 1 : result.status;
}

module.exports.runChild = defaultRunChild;

function runWaves({ waveName, passthrough }) {
    const runChild = module.exports.runChild;
    const targetWave = waveName || "verser2";
    const wave = waves[targetWave];

    if (!wave) {
        throw new Error(`Unknown BDD wave "${targetWave}". Available waves: ${Object.keys(waves).join(", ")}`);
    }

    if (waveName) {
        const status = runChild(waveName, [wave], passthrough);
        process.stderr.write(`[run-bdd-waves] owner=${waveName} status=${status}\n`);
        return status;
    }

    const allFeatures = featureFiles(path.join(bddRoot, "features"));
    const remainder = allFeatures.filter((feature) => feature !== wave);

    const waveStatus = runChild(targetWave, [wave], passthrough);
    if (waveStatus !== 0) {
        process.stderr.write(`[run-bdd-waves] owner=${targetWave} failed status=${waveStatus}; serial remainder not started\n`);
        return waveStatus;
    }

    const remainderStatus = runChild("serial-remainder", remainder, passthrough);
    process.stderr.write(`[run-bdd-waves] owner=serial-remainder status=${remainderStatus}\n`);
    return remainderStatus;
}

if (require.main === module) {
    try {
        process.exit(runWaves(parseArgs(process.argv.slice(2))));
    } catch (error) {
        process.stderr.write(`[run-bdd-waves] ${error.message}\n`);
        process.exit(1);
    }
}

module.exports = { commandArgs, featureFiles, parseArgs, runChild: defaultRunChild, runWaves, waves };
