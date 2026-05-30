#!/usr/bin/env node

const { spawnSync } = require("child_process");

const expectedExitCode = 124;
const env = {
    ...process.env,
    BDD_INCLUDE_HARNESS_SELFTEST: "1",
    BDD_TIMEOUT_MS: process.env.BDD_TIMEOUT_MS || "2000",
    BDD_GRACE_MS: process.env.BDD_GRACE_MS || "1000"
};

const result = spawnSync(
    process.execPath,
    ["scripts/run-bdd-safe.js", "--", "--fail-fast", "--tags", "@harness-selftest"],
    { env, stdio: "inherit" }
);

if (result.status === expectedExitCode) {
    console.log(`BDD safe harness self-test passed: wrapper exited ${expectedExitCode} on timeout.`);
    process.exit(0);
}

if (result.error) {
    console.error(`BDD safe harness self-test failed to start: ${result.error.message}`);
    process.exit(1);
}

console.error(`BDD safe harness self-test expected exit ${expectedExitCode}, got ${result.status}.`);
process.exit(1);
