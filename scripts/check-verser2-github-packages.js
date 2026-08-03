#!/usr/bin/env node

/**
 * Check that the verser2 public npmjs packages resolve as expected.
 *
 * Uses `npm view` against the public npmjs registry, no auth required.
 * All packages listed below should be publicly available at 0.4.2+.
 */

const { spawnSync } = require("child_process");

const REQUIRED_PACKAGES = [
    "@signicode/verser-common",
    "@signicode/verser2-guest-js-common",
    "@signicode/verser2-host",
    "@signicode/verser2-guest-node"
];

const PUBLIC_REGISTRY = "https://registry.npmjs.org";

function run(command, args, options = {}) {
    return spawnSync(command, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        ...options,
        env: {
            ...process.env,
            ...(options.env || {})
        }
    });
}

function parseJsonMaybe(text) {
    if (!text || !text.trim()) return undefined;
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

function printResult(ok, message) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${message}`);
}

let failed = false;

for (const packageName of REQUIRED_PACKAGES) {
    const result = run("npm", [
        "view", packageName, "--json",
        "--registry", PUBLIC_REGISTRY
    ]);

    const metadata = parseJsonMaybe(result.stdout);

    if (result.status === 0 && metadata && typeof metadata === "object" && Object.keys(metadata).length > 0) {
        const version = metadata.version
            || (metadata["dist-tags"] && metadata["dist-tags"].latest);
        printResult(true, `${packageName} resolves at ${version || "unknown version"}`);
    } else {
        failed = true;
        const detail = (result.stderr || result.stdout || "no output").trim();
        printResult(false, `${packageName} did not resolve from public npmjs`);
        if (detail) console.error(`  stderr: ${detail}`);
    }
}

if (failed) {
    console.error("One or more verser2 public packages did not resolve from npmjs. Check the package names and registry availability.");
    process.exit(1);
}

printResult(true, "all required verser2 packages resolve from public npmjs");
