#!/usr/bin/env node

/**
 * Git's pre-push protocol sends: <local ref> <local sha> <remote ref> <remote sha>.
 * This runner scans the commits being pushed and intentionally never forwards
 * scanner output, which prevents a finding's literal value reaching the terminal.
 */

const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { verifiedBinary } = require("./bootstrap-gitleaks.js");

const ROOT = resolve(__dirname, "..", "..");
const ZERO_SHA = "0".repeat(40);
const SHA = /^[a-f0-9]{40}$/i;

function parseOutgoingRefs(input) {
    return input
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
            const fields = line.trim().split(/\s+/);
            if (fields.length !== 4 || !SHA.test(fields[1]) || !SHA.test(fields[3])) {
                throw new Error("Invalid pre-push ref protocol input.");
            }
            return {
                localRef: fields[0],
                localSha: fields[1].toLowerCase(),
                remoteRef: fields[2],
                remoteSha: fields[3].toLowerCase()
            };
        });
}

function outgoingRange(ref) {
    if (ref.localSha === ZERO_SHA) return null;
    return ref.remoteSha === ZERO_SHA ? ref.localSha : `${ref.remoteSha}..${ref.localSha}`;
}

async function scanOutgoingRefs(input, { scanner = verifiedBinary, spawn = spawnSync } = {}) {
    const refs = parseOutgoingRefs(input);
    let binary;
    try {
        binary = await scanner();
    } catch {
        throw new Error("Secret scan blocked the push: verified Gitleaks scanner is unavailable. Run npm run security:bootstrap.");
    }

    for (const ref of refs) {
        const range = outgoingRange(ref);
        if (!range) continue;
        const result = spawn(binary, ["git", "--redact", "--config", resolve(ROOT, ".gitleaks.toml"), "--log-opts", range, "--no-banner"], {
            cwd: ROOT,
            encoding: "utf8",
            stdio: "pipe"
        });
        if (result.error || result.status !== 0) {
            throw new Error(`Secret scan blocked outgoing ref ${ref.localRef}. Remove the finding or use the reviewed allowlist process.`);
        }
    }
}

async function main() {
    try {
        await scanOutgoingRefs(readFileSync(0, "utf8"));
    } catch (error) {
        console.error(`[security] ${error.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();

module.exports = { ZERO_SHA, outgoingRange, parseOutgoingRefs, scanOutgoingRefs };
