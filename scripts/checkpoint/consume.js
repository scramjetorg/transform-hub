#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { mkdirSync, mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { createPlan } = require("./plan.js");
const { assertAllowedBranch, checkpointLabels, digestDocument, resolveCheckpoint, statementTag } = require("./provenance.js");
const { immutableReference } = require("./publish.js");

const REPOSITORY = "ghcr.io/scramjetorg/transform-hub/ci-deps";

function defaultRun(args, capture = false) {
    return execFileSync("docker", args, capture ? { encoding: "utf8" } : { stdio: "inherit" });
}

function fallback(reason, log = console.log) {
    log(`Checkpoint unavailable (${reason}); using clean npm ci.`);
    return { checkpoint: null, fallback: "clean-npm-ci", reason };
}

function labelsFor(run, reference) {
    return JSON.parse(run(["image", "inspect", reference, "--format", "{{json .Config.Labels}}"], true));
}

function copyFromImage(run, reference, source, destination) {
    const container = run(["create", reference], true).trim();
    if (!container) throw new Error("Docker did not create a checkpoint inspection container.");
    try {
        run(["cp", `${container}:${source}`, destination]);
    } finally {
        run(["rm", "--force", container]);
    }
}

async function consumeCheckpoint({ branch, root = process.cwd() }, {
    createPlan: buildPlan = createPlan,
    log = console.log,
    run = defaultRun,
    sourceSha: readSourceSha = (workspace) => execFileSync("git", ["rev-parse", "HEAD"], { cwd: workspace, encoding: "utf8" }).trim()
} = {}) {
    if (!branch) return fallback("no-compatible-checkpoint-branch", log);
    try {
        assertAllowedBranch(branch);
    } catch {
        return fallback("no-compatible-checkpoint-branch", log);
    }

    const workspace = resolve(root);
    const sourceSha = readSourceSha(workspace);
    const output = mkdtempSync(join(tmpdir(), "transform-hub-checkpoint-consume-"));
    const cache = join(output, "npm-cache");
    let verified = false;

    try {
        const plan = await buildPlan({ branch, currentSha: sourceSha, output, sourceSha }, workspace);
        const pointer = `${REPOSITORY}:${plan.promotion.pointerTag}`;
        try {
            run(["pull", pointer]);
        } catch {
            return fallback("no-checkpoint-pointer", log);
        }

        const cacheReference = immutableReference(REPOSITORY, run(["image", "inspect", pointer, "--format", "{{join .RepoDigests \"\\n\"}}"], true));
        const cacheLabels = labelsFor(run, cacheReference.reference);
        const expectedLabels = checkpointLabels(plan.identity, plan.identityDigest);
        if (Object.entries(expectedLabels).some(([key, value]) => cacheLabels[key] !== value)) {
            return fallback("image-label-mismatch", log);
        }

        copyFromImage(run, cacheReference.reference, "/opt/transform-hub/provenance/identity.v1.json", output);
        const statementReference = `${REPOSITORY}:${statementTag(plan.identityDigest)}`;
        try {
            run(["pull", statementReference]);
        } catch {
            return fallback("missing-immutable-statement", log);
        }
        const statementImage = immutableReference(REPOSITORY, run(["image", "inspect", statementReference, "--format", "{{join .RepoDigests \"\\n\"}}"], true));
        const statementLabels = labelsFor(run, statementImage.reference);
        if (Object.entries(expectedLabels).some(([key, value]) => statementLabels[key] !== value)) {
            return fallback("statement-label-mismatch", log);
        }
        copyFromImage(run, statementImage.reference, "/opt/transform-hub/provenance/statement.v1.json", output);

        const identity = JSON.parse(readFileSync(join(output, "identity.v1.json"), "utf8"));
        const statement = JSON.parse(readFileSync(join(output, "statement.v1.json"), "utf8"));
        if (statementLabels["io.scramjet.provenance.statement-digest"] !== digestDocument(statement)) {
            return fallback("statement-digest-mismatch", log);
        }
        const resolved = resolveCheckpoint({
            branch,
            expectedIdentity: plan.identity,
            checkpoint: {
                digest: cacheReference.digest,
                identity,
                identityDigest: digestDocument(identity),
                labels: cacheLabels,
                repository: REPOSITORY,
                statement
            }
        });
        if (!resolved.checkpoint) return fallback(resolved.reason, log);

        mkdirSync(cache);
        copyFromImage(run, resolved.checkpoint, "/opt/transform-hub/npm-cache/.", cache);
        verified = true;
        log(`Verified checkpoint ${resolved.checkpoint}; using its npm cache for npm ci.`);
        return { ...resolved, cache };
    } catch (error) {
        return fallback(`verification-error: ${error.message}`, log);
    } finally {
        if (!verified) rmSync(output, { force: true, recursive: true });
    }
}

async function main() {
    const branchIndex = process.argv.indexOf("--branch");
    const branch = branchIndex === -1 ? undefined : process.argv[branchIndex + 1];
    if (branchIndex === -1 || !branch) throw new Error("Usage: consume.js --branch <trusted-branch>");
    const result = await consumeCheckpoint({ branch });
    if (result.cache && process.env.GITHUB_ENV) {
        require("node:fs").appendFileSync(process.env.GITHUB_ENV, `CHECKPOINT_NPM_CACHE=${result.cache}\n`);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`[checkpoint] ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = { consumeCheckpoint, copyFromImage, fallback, labelsFor };
