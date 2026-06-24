#!/usr/bin/env node
/**
 * no-forbidden-deps.cjs
 *
 * Verifies that @scramjet/sequence-types does not depend on forbidden
 * packages in package.json or contain source-level references to them.
 *
 * Forbidden: @scramjet/types, @scramjet/rest-api2, @scramjet/api-types.
 * Allowed: @scramjet/runtime-types, @scramjet/symbols.
 */

const fs = require("fs");
const path = require("path");

const PKG_DIR = path.resolve(__dirname, "..");
const PKG_JSON_PATH = path.join(PKG_DIR, "package.json");

const FORBIDDEN = [
    "@scramjet/types",
    "@scramjet/rest-api2",
    "@scramjet/api-types",
];

let exitCode = 0;

function fail(msg) {
    console.error("FAIL:", msg);
    exitCode = 1;
}

// ---- Check 1: package.json must not list forbidden dependencies ----
const pkg = JSON.parse(fs.readFileSync(PKG_JSON_PATH, "utf-8"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

for (const name of FORBIDDEN) {
    if (name in deps) {
        fail(`package.json lists forbidden dependency: ${name}`);
    }
}

// ---- Check 2: src/ must not contain import/require of forbidden packages ----
const srcDir = path.join(PKG_DIR, "src");

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full);
        } else if (entry.isFile() && /\.ts$/.test(entry.name)) {
            const content = fs.readFileSync(full, "utf-8");
            for (const forbidden of FORBIDDEN) {
                const re = new RegExp(
                    `(from\\s+["']${escapeRegex(forbidden)}["']|require\\(["']${escapeRegex(forbidden)}["'])`,
                    "g"
                );
                if (re.test(content)) {
                    fail(`${full}: references ${forbidden}`);
                }
            }
        }
    }
}

walk(srcDir);

if (exitCode === 0) {
    console.log("PASS: no forbidden dependencies found");
} else {
    console.error("FAIL: forbidden dependency violations detected");
}

process.exit(exitCode);

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
