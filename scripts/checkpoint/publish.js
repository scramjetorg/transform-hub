#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { pointerUpdatePlan } = require("./provenance.js");
const { promotionDecision } = require("./promotion.js");

const REPOSITORY = "ghcr.io/scramjetorg/transform-hub/ci-deps";
const DIGEST = /^sha256:[a-f0-9]{64}$/i;

function parseArgs(args) {
    const options = {};
    for (let index = 0; index < args.length; index++) {
        if (!["--branch", "--current-sha", "--npm-cache", "--plan", "--source-sha"].includes(args[index]) || !args[index + 1]) {
            throw new Error("Usage: publish.js --plan <checkpoint-plan.json> --branch <trusted-branch> --source-sha <sha> --current-sha <sha> --npm-cache <path>");
        }
        options[args[index].slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = args[++index];
    }
    if (!options.plan || !options.branch || !options.sourceSha || !options.currentSha || !options.npmCache) {
        throw new Error("Checkpoint plan, branch, source SHA, current SHA, and npm cache are required.");
    }
    return options;
}

function immutableReference(repository, output) {
    const reference = output.trim().split(/\s+/).find((value) => value.startsWith(`${repository}@sha256:`));
    if (!reference) throw new Error("GHCR did not report an immutable image digest after publication.");
    const digest = reference.slice(reference.indexOf("@") + 1);
    if (!DIGEST.test(digest)) throw new Error("GHCR reported an invalid immutable image digest.");
    return { digest: digest.toLowerCase(), reference };
}

function dockerfile(labels) {
    const labelLines = Object.entries(labels).map(([key, value]) => `LABEL ${key}=${JSON.stringify(value)}`);
    return [
        "FROM node:22-bookworm-slim",
        "COPY npm-cache/ /opt/transform-hub/npm-cache/",
        ...labelLines,
        "ENTRYPOINT [\"npm\"]"
    ].join("\n") + "\n";
}

function assertLabels(labels, expected) {
    if (!labels || typeof labels !== "object") throw new Error("Built checkpoint image has no OCI labels.");
    for (const [key, value] of Object.entries(expected)) {
        if (labels[key] !== value) throw new Error(`Built checkpoint image label mismatch: ${key}`);
    }
}

function defaultRun(args, capture = false) {
    return execFileSync("docker", args, capture ? { encoding: "utf8" } : { stdio: "inherit" });
}

function parseRemoteSha(output) {
    const sha = output.split(/\s+/)[0];
    if (!/^[a-f0-9]{40}$/i.test(sha)) throw new Error("Unable to re-read the trusted branch SHA before checkpoint pointer promotion.");
    return sha;
}

function readRemoteSha(branch) {
    return parseRemoteSha(execFileSync("git", ["ls-remote", "origin", `refs/heads/${branch}`], { encoding: "utf8" }));
}

function publishCheckpoint(options, { run = defaultRun, remoteSha = readRemoteSha } = {}) {
    const plan = typeof options.plan === "string" ? JSON.parse(readFileSync(options.plan, "utf8")) : options.plan;
    if (plan?.promotion?.repository !== REPOSITORY) throw new Error("Checkpoint publication repository is not the approved GHCR repository.");
    if (process.env.SCRAMJET_GHCR_SCOPED_PUBLISHER !== "true") {
        throw new Error("Checkpoint publication requires the scoped GHCR publisher configuration.");
    }

    const pointer = pointerUpdatePlan({
        branch: options.branch,
        currentSha: options.currentSha,
        identityDigest: plan.identityDigest,
        repository: plan.promotion.repository,
        sourceSha: options.sourceSha
    });
    const immutable = `${REPOSITORY}:${pointer.immutableTag}`;
    const pointerReference = `${REPOSITORY}:${pointer.pointerTag}`;
    const context = mkdtempSync(join(tmpdir(), "transform-hub-checkpoint-"));

    try {
        cpSync(options.npmCache, join(context, "npm-cache"), {
            filter: (source) => ![".npmrc", "credentials"].includes(source.split(/[\\/]/).pop()),
            recursive: true
        });
        writeFileSync(join(context, "Dockerfile"), dockerfile(plan.labels));
        run(["build", "--pull", "--platform", "linux/amd64", "--tag", immutable, context]);
        assertLabels(JSON.parse(run(["image", "inspect", immutable, "--format", "{{json .Config.Labels}}"], true)), plan.labels);
        run(["push", immutable]);
        const published = immutableReference(REPOSITORY, run(["image", "inspect", immutable, "--format", "{{join .RepoDigests \"\\n\"}}"], true));
        const currentSha = remoteSha(options.branch);
        const decision = promotionDecision({
            branch: options.branch,
            checkpointIdentityDigest: plan.identityDigest,
            checkpointReference: published.reference,
            currentSha,
            plan,
            publisherConfigured: true,
            sourceSha: options.sourceSha
        });
        run(["tag", immutable, pointerReference]);
        run(["push", pointerReference]);
        const pointerDigest = run(["buildx", "imagetools", "inspect", pointerReference, "--format", "{{.Manifest.Digest}}"], true).trim().toLowerCase();
        if (pointerDigest !== published.digest) throw new Error("GHCR checkpoint pointer digest does not match the immutable image digest.");
        return { ...decision, digest: published.digest, pointer: decision.pointer, reference: published.reference };
    } finally {
        rmSync(context, { force: true, recursive: true });
    }
}

function main() {
    try {
        console.log(JSON.stringify(publishCheckpoint(parseArgs(process.argv.slice(2)))));
    } catch (error) {
        console.error(`[checkpoint] ${error.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();

module.exports = { assertLabels, dockerfile, immutableReference, parseArgs, parseRemoteSha, publishCheckpoint, readRemoteSha };
