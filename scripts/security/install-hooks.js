#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const ROOT = resolve(__dirname, "..", "..");
const HOOKS = resolve(ROOT, ".githooks");
const REQUIRED_HOOKS = ["pre-commit", "pre-push"];

function git(args) {
    return spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
}

function main() {
    const missing = REQUIRED_HOOKS.filter((hook) => !existsSync(resolve(HOOKS, hook)));
    if (missing.length > 0) {
        console.error(`[security] Checked-in .githooks hooks are missing: ${missing.join(", ")}.`);
        process.exitCode = 1;
        return;
    }

    const topLevel = git(["rev-parse", "--show-toplevel"]);
    if (topLevel.status !== 0 || resolve(topLevel.stdout.trim()) !== ROOT) {
        console.error("[security] hooks:install must run from this repository checkout.");
        process.exitCode = 1;
        return;
    }

    const configured = git(["config", "--local", "core.hooksPath", ".githooks"]);
    if (configured.status !== 0) {
        console.error("[security] Could not configure local core.hooksPath.");
        process.exitCode = 1;
        return;
    }

    console.log("Installed repository-managed hooks at .githooks.");
}

if (require.main === module) main();

module.exports = { git, REQUIRED_HOOKS };
