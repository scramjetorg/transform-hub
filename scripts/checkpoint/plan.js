#!/usr/bin/env node

const { createHash } = require("node:crypto");
const { existsSync, readFileSync } = require("node:fs");
const { mkdir, writeFile } = require("node:fs/promises");
const { execFileSync } = require("node:child_process");
const { join, resolve } = require("node:path");
const { assertAllowedBranch, checkpointLabels, createIdentity, createStatement, digestDocument, pointerUpdatePlan } = require("./provenance.js");

const ROOT = resolve(__dirname, "..", "..");

function sha256File(file) {
    return `sha256:${createHash("sha256").update(readFileSync(file)).digest("hex")}`;
}

function parseArgs(args) {
    const options = { dryRun: false, repository: "ghcr.io/scramjetorg/transform-hub/ci-deps" };
    for (let index = 0; index < args.length; index++) {
        const key = args[index];
        if (key === "--dry-run") {
            options.dryRun = true;
            continue;
        }
        if (!["--branch", "--current-sha", "--output", "--repository", "--source-sha"].includes(key) || !args[index + 1]) {
            throw new Error("Usage: plan.js --dry-run --branch <trusted-branch> --source-sha <sha> --current-sha <sha> --output <dir> [--repository <ghcr-repository>]");
        }
        options[key.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = args[++index];
    }
    if (!options.dryRun || !options.branch || !options.sourceSha || !options.currentSha || !options.output) {
        throw new Error("Checkpoint planning is dry-run only and requires branch, source SHA, current SHA, and output.");
    }
    return options;
}

function packageVersions(root = ROOT) {
    const rootPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const paths = rootPackage.workspaces?.release || [];
    return paths.map((relativePath) => {
        const packagePath = join(root, relativePath, "package.json");
        if (!existsSync(packagePath)) throw new Error(`Release package manifest not found: ${relativePath}`);
        const manifest = JSON.parse(readFileSync(packagePath, "utf8"));
        return { name: manifest.name, packageJsonSha256: sha256File(packagePath), version: manifest.version };
    });
}

function npmVersion() {
    return execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
}

async function createPlan(options, root = ROOT) {
    assertAllowedBranch(options.branch);
    const identity = createIdentity({
        lockSha256: sha256File(join(root, "package-lock.json")),
        node: process.version,
        npm: npmVersion(),
        packages: packageVersions(root),
        platform: { oci: "linux/amd64", runner: `${process.platform}/${process.arch}` },
        repository: "https://github.com/scramjetorg/transform-hub",
        sourceSha: options.sourceSha
    });
    const identityDigest = digestDocument(identity);
    const statement = createStatement({ identityDigest });
    const promotion = pointerUpdatePlan({
        branch: options.branch,
        currentSha: options.currentSha,
        identityDigest,
        repository: options.repository,
        sourceSha: options.sourceSha
    });
    const plan = {
        cache: {
            excluded: ["node_modules", ".npmrc", "credentials"],
            path: "/opt/transform-hub/npm-cache",
            reinstall: "npm ci --ignore-scripts --cache /opt/transform-hub/npm-cache"
        },
        dryRun: true,
        identity,
        identityDigest,
        labels: checkpointLabels(identity, identityDigest),
        promotion,
        statementDigest: digestDocument(statement)
    };

    const output = resolve(root, options.output);
    await mkdir(join(output, "provenance"), { recursive: true });
    await writeFile(join(output, "provenance", "identity.v1.json"), `${JSON.stringify(identity, null, 2)}\n`);
    await writeFile(join(output, "provenance", "statement.v1.json"), `${JSON.stringify(statement, null, 2)}\n`);
    await writeFile(join(output, "checkpoint-plan.v1.json"), `${JSON.stringify(plan, null, 2)}\n`);
    return plan;
}

async function main() {
    try {
        const plan = await createPlan(parseArgs(process.argv.slice(2)));
        console.log(`Checkpoint dry-run plan: ${plan.promotion.immutableTag}`);
    } catch (error) {
        console.error(`[checkpoint] ${error.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();

module.exports = { createPlan, packageVersions, parseArgs, sha256File };
