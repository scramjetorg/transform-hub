#!/usr/bin/env node

"use strict";

const { spawnSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const testDirectory = join(root, "scripts", "test");
const gcRequiredSpec = "verser2-cycle-memory.spec.js";
const specs = readdirSync(testDirectory)
    .filter((file) => file.endsWith(".spec.js"))
    .sort();

if (!specs.includes(gcRequiredSpec)) {
    throw new Error(`Required runner test not found: scripts/test/${gcRequiredSpec}`);
}

function run(specFiles, env = process.env) {
    const result = spawnSync(
        process.execPath,
        ["scripts/run-ava.js", ...specFiles.map((file) => `scripts/test/${file}`), "--serial"],
        { cwd: root, env, stdio: "inherit" }
    );

    if (result.error) throw result.error;
    return result.status === 0;
}

const commonEnv = { ...process.env, SCRAMJET_AVA_NO_WORKER_THREADS: "1" };
const normalSpecs = specs.filter((file) => file !== gcRequiredSpec);

if (!run(normalSpecs, commonEnv)) process.exit(1);

const gcEnv = {
    ...commonEnv,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, "--expose-gc"].filter(Boolean).join(" ")
};

process.exit(run([gcRequiredSpec], gcEnv) ? 0 : 1);
