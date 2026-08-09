#!/usr/bin/env node

/**
 * Redacted CI scanner for a Git revision range or all reachable history.
 * Scanner output is intentionally not forwarded to prevent finding values from
 * appearing in CI logs.
 */

const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
const { verifiedBinary } = require("./bootstrap-gitleaks.js");

const ROOT = resolve(__dirname, "..", "..");
const SHA = /^[a-f0-9]{40}$/i;

function parseArgs(args) {
    if (args.length === 1 && args[0] === "--all") return { logOpts: "--all" };
    if (args.length === 2 && args[0] === "--range") {
        const parts = args[1].split("..");
        if (parts.length === 2 && SHA.test(parts[0]) && SHA.test(parts[1])) {
            return { logOpts: `${parts[0].toLowerCase()}..${parts[1].toLowerCase()}` };
        }
    }
    throw new Error("Usage: scan-git-history.js --all | --range <base-sha>..<head-sha>");
}

async function scanGitHistory(args, { scanner = verifiedBinary, spawn = spawnSync } = {}) {
    const { logOpts } = parseArgs(args);
    let binary;
    try {
        binary = await scanner();
    } catch {
        throw new Error("Secret scan failed: verified Gitleaks scanner is unavailable.");
    }

    const result = spawn(binary, ["git", "--redact", "--config", resolve(ROOT, ".gitleaks.toml"), "--log-opts", logOpts, "--no-banner"], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: "pipe"
    });
    if (result.error || result.status !== 0) {
        throw new Error("Secret scan failed. Review the redacted scanner result in the protected security workflow.");
    }
}

async function main() {
    try {
        await scanGitHistory(process.argv.slice(2));
    } catch (error) {
        console.error(`[security] ${error.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();

module.exports = { parseArgs, scanGitHistory };
