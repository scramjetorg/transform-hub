#!/usr/bin/env node
// Boot-config parity shim: reads a JSON payload from stdin, runs the
// canonical Node-side validateBootConfig, and exits 0 on accept / 1 on reject.
// Used by tests/parity/test_boot_config_parity.py to verify that the Python
// runner's boot-config validator agrees with the Node validator on accept/
// reject for shared inputs.

require("ts-node/register/transpile-only");

const path = require("path");
const fs = require("fs");

const bootConfigSrc = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "runner-node",
    "src",
    "boot-config.ts"
);
const { validateBootConfig } = require(bootConfigSrc);

const raw = fs.readFileSync(0, "utf8");

try {
    const parsed = JSON.parse(raw);
    validateBootConfig(parsed);
    process.exit(0);
} catch (err) {
    process.stderr.write(err && err.message ? err.message : String(err));
    process.exit(1);
}
