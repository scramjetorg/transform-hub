#!/usr/bin/env node

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const REQUIRED_PACKAGES = [
    "@signicode/verser-common",
    "@signicode/verser2-guest-js-common",
    "@signicode/verser2-host",
    "@signicode/verser2-guest-node"
];

function loadDotEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};

    const env = {};

    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);

        if (!match) continue;

        let value = match[2];

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        env[match[1]] = value;
    }

    return env;
}

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

function sanitize(text, token) {
    if (!text) return "";
    return token ? text.split(token).join("<redacted>") : text;
}

function parseJsonMaybe(text) {
    if (!text.trim()) return undefined;
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

function packageApiPath(packageName) {
    const unscopedName = packageName.replace(/^@signicode\//, "");

    return `/orgs/signicode/packages/npm/${encodeURIComponent(unscopedName)}/versions`;
}

function printResult(ok, message) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${message}`);
}

function printWarning(message) {
    console.log(`WARN: ${message}`);
}

const repoRoot = path.resolve(__dirname, "..");
const dotenv = loadDotEnv(path.join(repoRoot, ".env"));
const token = process.env.GITHUB_PACKAGES_TOKEN || dotenv.GITHUB_PACKAGES_TOKEN;

if (!token) {
    printResult(false, "GITHUB_PACKAGES_TOKEN is not set in the environment or .env");
    process.exit(1);
}

let failed = false;

printResult(true, "GITHUB_PACKAGES_TOKEN is present (value redacted)");

const persistedGhStatus = run("gh", ["auth", "status"]);
if (persistedGhStatus.status === 0) {
    printResult(true, "existing gh auth is available; it will not be modified by this check");
} else {
    printWarning("existing gh auth status is unavailable; continuing with ephemeral GH_TOKEN check");
}

const ghRepoCheck = run("gh", ["api", "/repos/signicode/verser2"], {
    env: { GH_TOKEN: token }
});

if (ghRepoCheck.status === 0 && parseJsonMaybe(ghRepoCheck.stdout)) {
    printResult(true, "GH_TOKEN can access signicode/verser2 repository metadata");
} else {
    printWarning("GH_TOKEN cannot access signicode/verser2 repository metadata; continuing because package read access is checked separately");
    const detail = sanitize(ghRepoCheck.stderr || ghRepoCheck.stdout, token).trim();
    if (detail) console.error(detail);
}

const npmrcDir = fs.mkdtempSync(path.join(os.tmpdir(), "verser2-npmrc-"));
const npmrcPath = path.join(npmrcDir, ".npmrc");

fs.writeFileSync(
    npmrcPath,
    [
        "@signicode:registry=https://npm.pkg.github.com",
        "//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}",
        "always-auth=true",
        ""
    ].join("\n"),
    { mode: 0o600 }
);

try {
    for (const packageName of REQUIRED_PACKAGES) {
        const ghPackage = run("gh", ["api", packageApiPath(packageName)], {
            env: { GH_TOKEN: token }
        });

        let resolvedVersion;

        if (ghPackage.status === 0) {
            const versions = parseJsonMaybe(ghPackage.stdout);
            if (Array.isArray(versions) && versions.length > 0) {
                resolvedVersion = versions[0].name;
                printResult(true, `${packageName} has ${versions.length} GitHub package version(s); newest is ${resolvedVersion}`);
            } else {
                failed = true;
                printResult(false, `${packageName} GitHub package API returned no versions`);
            }
        } else {
            failed = true;
            printResult(false, `${packageName} GitHub package API is not accessible`);
            const detail = sanitize(ghPackage.stderr || ghPackage.stdout, token).trim();
            if (detail) console.error(detail);
        }

        const npmPackageSpec = resolvedVersion ? `${packageName}@${resolvedVersion}` : packageName;
        const npmView = run("npm", ["view", npmPackageSpec, "--json", "--userconfig", npmrcPath], {
            env: { NODE_AUTH_TOKEN: token, GITHUB_PACKAGES_TOKEN: token }
        });

        const npmMetadata = parseJsonMaybe(npmView.stdout);

        if (npmView.status === 0 && npmMetadata && Object.keys(npmMetadata).length > 0) {
            const version = npmMetadata.version || (npmMetadata["dist-tags"] && npmMetadata["dist-tags"].latest);
            printResult(true, `${packageName} resolves through npm${version ? ` at ${version}` : ""}`);
        } else {
            failed = true;
            printResult(false, `${npmPackageSpec} did not resolve to non-empty npm metadata`);
            const detail = sanitize(npmView.stderr || npmView.stdout, token).trim();
            if (detail) console.error(detail);
        }
    }
} finally {
    try {
        fs.rmSync(npmrcDir, { recursive: true, force: true });
    } catch {
        // Best-effort cleanup only.
    }
}

if (failed) {
    console.error("verser2 GitHub Packages check failed. Ensure GITHUB_PACKAGES_TOKEN has package read access for @signicode packages.");
    process.exit(1);
}

printResult(true, "all required verser2 GitHub Packages resolve");
