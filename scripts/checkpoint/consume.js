#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { mkdirSync, mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { createPlan } = require("./plan.js");
const { assertAllowedBranch, checkpointLabels, digestDocument, resolveCheckpoint, statementTag } = require("./provenance.js");
const { immutableReference } = require("./publish.js");
const { loadRuntimeProfile, verifyRuntimeManifest } = require("./runtime-dependencies.js");

const REPOSITORY = "ghcr.io/scramjetorg/transform-hub/ci-deps";
const RUNTIME_LABELS = [
    "io.scramjet.provenance.lock-sha256",
    "io.scramjet.provenance.node",
    "io.scramjet.provenance.npm",
    "io.scramjet.provenance.platform",
    "io.scramjet.provenance.runtime-dependencies",
];

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

function labelsMatch(actual, expected, keys) {
    return keys.every((key) => actual?.[key] === expected?.[key]);
}

async function consumeCheckpoint({ branch, root = process.cwd(), requireRuntimeDependencies = false }, {
    createPlan: buildPlan = createPlan,
    log = console.log,
    run = defaultRun,
    loadProfile: loadProfile = loadRuntimeProfile,
    verifyManifest: verifyManifest = verifyRuntimeManifest,
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
    const runtimeDependencies = join(output, "runtime-dependencies");
    let verified = false;

    try {
        const plan = await buildPlan({ branch, currentSha: sourceSha, output, sourceSha }, workspace);
        if (requireRuntimeDependencies && !plan.runtimeDependencyDigest) return fallback("missing-runtime-dependency-profile", log);
        const pointer = `${REPOSITORY}:${plan.promotion.pointerTag}`;
        try {
            run(["pull", pointer]);
        } catch {
            return fallback("no-checkpoint-pointer", log);
        }

        const cacheReference = immutableReference(REPOSITORY, run(["image", "inspect", pointer, "--format", "{{join .RepoDigests \"\\n\"}}"], true));
        const cacheLabels = labelsFor(run, cacheReference.reference);
        const expectedLabels = checkpointLabels(plan.identity, plan.identityDigest);
        let publishedIdentityDigest = plan.identityDigest;
        if (requireRuntimeDependencies) {
            if (!plan.runtimeDependencyDigest) return fallback("missing-runtime-dependency-profile", log);
            if (!labelsMatch(cacheLabels, expectedLabels, RUNTIME_LABELS.slice(0, 4))) return fallback("runtime-policy-label-mismatch", log);
            if (cacheLabels["io.scramjet.provenance.runtime-dependencies"] !== plan.runtimeDependencyDigest) return fallback("runtime-dependency-label-mismatch", log);
            publishedIdentityDigest = cacheLabels["io.scramjet.provenance.identity-digest"];
            if (!/^sha256:[a-f0-9]{64}$/i.test(publishedIdentityDigest || "")) return fallback("missing-runtime-identity", log);
        } else if (Object.entries(expectedLabels).some(([key, value]) => cacheLabels[key] !== value)) {
            return fallback("image-label-mismatch", log);
        }

        copyFromImage(run, cacheReference.reference, "/opt/transform-hub/provenance/identity.v1.json", output);
        const statementReference = `${REPOSITORY}:${statementTag(publishedIdentityDigest)}`;
        try {
            run(["pull", statementReference]);
        } catch {
            return fallback("missing-immutable-statement", log);
        }
        const statementImage = immutableReference(REPOSITORY, run(["image", "inspect", statementReference, "--format", "{{join .RepoDigests \"\\n\"}}"], true));
        const statementLabels = labelsFor(run, statementImage.reference);
        if (requireRuntimeDependencies ? !labelsMatch(statementLabels, expectedLabels, RUNTIME_LABELS) : Object.entries(expectedLabels).some(([key, value]) => statementLabels[key] !== value)) {
            return fallback("statement-label-mismatch", log);
        }
        copyFromImage(run, statementImage.reference, "/opt/transform-hub/provenance/statement.v1.json", output);

        const identity = JSON.parse(readFileSync(join(output, "identity.v1.json"), "utf8"));
        const statement = JSON.parse(readFileSync(join(output, "statement.v1.json"), "utf8"));
        if (requireRuntimeDependencies) {
            if (digestDocument(identity) !== publishedIdentityDigest) return fallback("runtime-identity-digest-mismatch", log);
            const publishedLabels = checkpointLabels(identity, publishedIdentityDigest);
            if (!labelsMatch(cacheLabels, publishedLabels, RUNTIME_LABELS) || !labelsMatch(statementLabels, publishedLabels, RUNTIME_LABELS)) return fallback("runtime-policy-label-mismatch", log);
            if (statement.identityDigest !== publishedIdentityDigest) return fallback("statement-identity-mismatch", log);
            const statementImage = statement.outputs?.images?.find((candidate) => candidate.role === "dependency-checkpoint");
            if (!statementImage || statementImage.digest !== cacheReference.digest || statementImage.repository !== REPOSITORY) return fallback("statement-image-mismatch", log);
        }
        if (statementLabels["io.scramjet.provenance.statement-digest"] !== digestDocument(statement)) {
            return fallback("statement-digest-mismatch", log);
        }
        if (requireRuntimeDependencies) {
            if (cacheLabels["io.scramjet.provenance.runtime-dependencies"] !== plan.runtimeDependencyDigest) return fallback("runtime-dependency-label-mismatch", log);
            const artifact = statement.outputs?.artifacts?.find((candidate) => candidate.role === "runtime-dependencies");
            if (!artifact) return fallback("missing-runtime-dependency-statement-artifact", log);
            mkdirSync(runtimeDependencies);
            copyFromImage(run, cacheReference.reference, "/opt/transform-hub/runtime-dependencies/.", runtimeDependencies);
            const manifest = verifyManifest(runtimeDependencies, loadProfile(workspace));
            if (manifest.profileDigest !== plan.runtimeDependencyDigest || digestDocument(manifest) !== artifact.digest) return fallback("runtime-dependency-manifest-mismatch", log);
        }
        const resolved = requireRuntimeDependencies ? {
            checkpoint: `${REPOSITORY}@${cacheReference.digest}`,
            identityDigest: publishedIdentityDigest,
            pointerTag: plan.promotion.pointerTag,
        } : resolveCheckpoint({
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

        if (!requireRuntimeDependencies) {
            mkdirSync(cache);
            copyFromImage(run, resolved.checkpoint, "/opt/transform-hub/npm-cache/.", cache);
        }
        verified = true;
        log(requireRuntimeDependencies ? `Verified checkpoint ${resolved.checkpoint}; staged runtime dependencies.` : `Verified checkpoint ${resolved.checkpoint}; using its npm cache for npm ci.`);
        return { ...resolved, ...(requireRuntimeDependencies ? { runtimeDependencies, runtimeDependencyDigest: plan.runtimeDependencyDigest } : { cache }) };
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
    const result = await consumeCheckpoint({ branch, requireRuntimeDependencies: process.argv.includes("--require-runtime-dependencies") });
    if (process.argv.includes("--require-runtime-dependencies") && !result.runtimeDependencies) {
        throw new Error(`Required runtime dependency checkpoint unavailable: ${result.reason}`);
    }
    if (process.env.GITHUB_ENV) {
        if (result.cache) require("node:fs").appendFileSync(process.env.GITHUB_ENV, `CHECKPOINT_NPM_CACHE=${result.cache}\n`);
        if (result.runtimeDependencies) require("node:fs").appendFileSync(process.env.GITHUB_ENV, `CHECKPOINT_RUNTIME_DEPENDENCIES=${result.runtimeDependencies}\nCHECKPOINT_RUNTIME_DEPENDENCY_DIGEST=${result.runtimeDependencyDigest}\n`);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`[checkpoint] ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = { consumeCheckpoint, copyFromImage, fallback, labelsFor, labelsMatch };
