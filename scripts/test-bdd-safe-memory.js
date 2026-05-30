#!/usr/bin/env node

const { spawnSync } = require("child_process");

const idleScript = "setInterval(() => {}, 1000);";
const env = {
    ...process.env,
    BDD_SAFE_COMMAND_JSON: JSON.stringify([process.execPath, "-e", idleScript]),
    BDD_TIMEOUT_MS: "30000",
    BDD_GRACE_MS: "1000",
    BDD_MEMORY_LIMIT_MB: process.env.BDD_MEMORY_LIMIT_MB || "16",
    BDD_MEMORY_POLL_MS: process.env.BDD_MEMORY_POLL_MS || "100",
    BDD_MEMORY_SOFT_TRIPS: "1"
};

const result = spawnSync(process.execPath, ["scripts/run-bdd-safe.js"], { env, stdio: "inherit" });

if (result.status === 137) {
    console.log("BDD safe memory self-test passed: wrapper exited 137 on memory ceiling.");
    process.exit(0);
}

if (result.error) {
    console.error(`BDD safe memory self-test failed to start: ${result.error.message}`);
    process.exit(1);
}

console.error(`BDD safe memory self-test expected exit 137, got ${result.status}.`);
process.exit(1);
