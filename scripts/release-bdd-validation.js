#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { assertDigest, digestDocument, validateArtifactContent, validateReleaseSet } = require("./release-contract");
const { validateTarballBdd } = require("./release-production");
const { candidateIdentity, claimBddShard, recordBddShardResult } = require("./lib/release-bundle-state");
const { prepareTarballBddRoot, readTarballRecord } = require("./release-tarball-bdd");
const waves = require("./run-bdd-waves.js");
const { validateCandidateRuntimeImages, imageMapReferences } = require("./lib/candidate-runtime-images");
const { createGithubReleaseAssetAdapter } = require("./lib/github-release-candidate");
const { validateCandidateSeal } = require("./lib/release-candidate-assets");

const ROOT = resolve(__dirname, "..");
const MATRIX_FILE = join(__dirname, "release-bdd-matrix.v1.json");
const BDD_RUNNER = join(__dirname, "run-bdd-waves.js");

function loadMatrix(file = MATRIX_FILE) {
    const matrix = JSON.parse(readFileSync(file, "utf8"));
    if (matrix.schema !== "release-bdd-matrix.v1" || !matrix.revision || JSON.stringify(matrix.chunks) !== JSON.stringify(waves.DEFAULT_CHUNKS)) throw new Error("BDD matrix must exactly match DEFAULT_CHUNKS.");
    return matrix;
}

function readCandidate(candidateDir) {
    const releaseSet = JSON.parse(readFileSync(join(candidateDir, "release-set.json"), "utf8"));
    const provenance = JSON.parse(readFileSync(join(candidateDir, "build-provenance.json"), "utf8"));
    validateReleaseSet(releaseSet);
    return { releaseSet, provenance };
}

function validateCandidateInputs({ candidateDir, identity, imageDigest }) {
    const { releaseSet, provenance } = readCandidate(candidateDir);
    const expected = candidateIdentity(identity);
    assertDigest(imageDigest, "GHCR image digest");
    if (releaseSet.source.sha !== expected.sourceSha || releaseSet.source.tree !== expected.sourceTree || releaseSet.build.identity !== expected.buildIdentity) throw new Error("Candidate source/tree/build identity does not match.");
    if (provenance.identity !== expected.key || provenance.releaseSetDigest !== digestDocument(releaseSet)) throw new Error("Candidate provenance does not bind the candidate identity.");
    const lockfileDigest = `sha256:${createHash("sha256").update(readFileSync(join(candidateDir, releaseSet.lockfile.path))).digest("hex")}`;
    if (lockfileDigest !== releaseSet.lockfile.sha256) throw new Error("Candidate lockfile does not match the release set.");
    const closure = (releaseSet.artifacts.images || []).some(image => image.role) ? validateCandidateRuntimeImages(releaseSet.artifacts.images) : null;
    if (closure && closure["bdd-node"].digest !== imageDigest) throw new Error("Candidate BDD image digest does not match the release set.");
    if (!closure && !(releaseSet.artifacts.images || []).some((image) => image.digest === imageDigest)) throw new Error("Candidate GHCR image digest does not match the release set.");
    for (const artifact of releaseSet.artifacts.tarballs) validateArtifactContent(candidateDir, artifact);
    validateArtifactContent(candidateDir, releaseSet.artifacts.bddSupport);
    const image = (releaseSet.artifacts.images || []).find((candidate) => candidate.digest === imageDigest);
    const imageMap = closure ? imageMapReferences(closure) : undefined;
    if (imageMap && process.env.SCRAMJET_BDD_CANDIDATE_IMAGE_MAP) {
        let supplied;
        try { supplied = JSON.parse(process.env.SCRAMJET_BDD_CANDIDATE_IMAGE_MAP); } catch { throw new Error("Candidate image map is not valid JSON."); }
        if (JSON.stringify(supplied) !== JSON.stringify(imageMap)) throw new Error("Candidate image map does not match the resolved release set.");
    }
    return { expected, releaseSet, provenance, releaseSetDigest: digestDocument(releaseSet), imageDigest, imageReference: `${image.repository}@${imageDigest}`, imageMap, candidateDir: resolve(candidateDir) };
}

function consumedInput(validation, matrix) {
    return {
        schema: "bdd-consumed-input.v1",
        sourceSha: validation.expected.sourceSha,
        sourceTree: validation.expected.sourceTree,
        buildIdentity: validation.expected.buildIdentity,
        releaseSetDigest: validation.releaseSetDigest,
        imageDigest: validation.imageDigest,
        imageReference: validation.imageReference,
        candidateExecutionRoot: validation.candidateDir,
        matrixRevision: matrix.revision,
        inputs: validation.releaseSet.artifacts.tarballs.map((artifact) => ({ path: artifact.path, sha256: artifact.sha256 })),
        bddSupport: { path: validation.releaseSet.artifacts.bddSupport.path, size: validation.releaseSet.artifacts.bddSupport.size, sha256: validation.releaseSet.artifacts.bddSupport.sha256, sri: validation.releaseSet.artifacts.bddSupport.sri },
    };
}

function assertSafeShardRun(options = {}) {
    if (process.env.SCRAMJET_SPAWN_TS === "1" || options.sourceLauncher) throw new Error("Source launcher overrides are not permitted for release BDD validation.");
    const text = JSON.stringify(options.passthrough || []);
    if (/build|pack|install/i.test(text)) throw new Error("Build, pack, and install actions are not permitted for release BDD validation.");
}

function runShardCommand(shard, { runner = spawnSync, passthrough = [], candidateDir, imageDigest, imageReference, imageMap } = {}) {
    assertSafeShardRun({ passthrough });
    if (!candidateDir || !existsSync(candidateDir) || !imageReference || !imageDigest || !imageReference.endsWith(`@${imageDigest}`)) throw new Error("Verified candidate execution root and digest-pinned BDD image are required.");
    const args = [BDD_RUNNER, `--chunk=${shard}`, ...passthrough];
    if (process.env.BDD_NODE_IMAGE && process.env.BDD_NODE_IMAGE !== imageReference) throw new Error("Ambient BDD image does not match the verified candidate image.");
    if (process.env.SCRAMJET_BDD_CANDIDATE_ROOT && resolve(process.env.SCRAMJET_BDD_CANDIDATE_ROOT) !== resolve(candidateDir)) throw new Error("Ambient candidate execution root does not match the verified candidate.");
    const result = runner(process.execPath, args, { cwd: ROOT, stdio: "inherit", env: { ...process.env, SCRAMJET_SPAWN_TS: undefined, SCRAMJET_RELEASE_BDD_VALIDATION: "1", SCRAMJET_RELEASE_TARBALL_BDD_ROOT: "1", SCRAMJET_BDD_CANDIDATE_ROOT: resolve(candidateDir), SCRAMJET_BDD_IMAGE_DIGEST: imageDigest, BDD_NODE_IMAGE: imageReference, ...(imageMap ? { SCRAMJET_BDD_CANDIDATE_IMAGE_MAP: JSON.stringify(imageMap) } : {}) } });
    return typeof result === "number" ? result : (result.status ?? 1);
}

function runValidation({ command = "--all", candidateDir, stateFile, identity, imageDigest, evidenceFile, runner, passthrough = [], executionRoot, prepare = true, prepareRunner, sourceRoot }) {
    const matrix = loadMatrix();
    const validation = validateCandidateInputs({ candidateDir, identity, imageDigest });
    const prepared = prepare
        ? prepareTarballBddRoot({ candidateDir, destination: executionRoot || join(candidateDir, "bdd-execution-root"), identity: validation.expected, imageDigest, runner: prepareRunner, sourceRoot })
        : { root: resolve(executionRoot || candidateDir), recordPath: executionRoot ? join(executionRoot, "tarball-record.json") : null, record: executionRoot ? readTarballRecord(executionRoot) : null, recordDigest: executionRoot ? readTarballRecord(executionRoot).recordDigest : null };
    if (prepared.record && (prepared.record.releaseSetDigest !== validation.releaseSetDigest || prepared.record.imageDigest !== imageDigest)) throw new Error("Prepared tarball execution root does not match the candidate inputs.");
    const executionValidation = { ...validation, candidateDir: prepared.root };
    const consumed = consumedInput(executionValidation, matrix);
    const consumedDigest = digestDocument(consumed);
    const consumedPath = evidenceFile || join(candidateDir, "bdd-evidence", matrix.revision, "consumed-input.json");
    mkdirSync(resolve(consumedPath, ".."), { recursive: true });
    writeFileSync(consumedPath, `${JSON.stringify({ ...consumed, recordDigest: consumedDigest }, null, 2)}\n`);
    const selected = command === "--all" || command === "all" ? matrix.chunks : [command.replace(/^--shard=/, "")];
    if (selected.some((shard) => !matrix.chunks.includes(shard))) throw new Error("Unknown BDD shard.");
    const results = [];
    for (const shard of selected) {
        const owner = `bdd-validation:${process.pid}`;
        const claim = claimBddShard(stateFile, identity, matrix.revision, shard, { owner });
        if (claim.status === "reused") { results.push({ shard, status: "reused" }); continue; }
        if (claim.status === "failed") throw new Error(`BDD shard ${shard} previously failed; candidate is non-admissible.`);
        const status = runShardCommand(shard, { runner, passthrough, candidateDir: executionValidation.candidateDir, imageDigest, imageReference: validation.imageReference, imageMap: validation.imageMap });
        const result = status === 0 ? "success" : "failed";
        recordBddShardResult(stateFile, identity, matrix.revision, shard, { owner, status: result, evidence: { schema: "bdd-shard-evidence.v1", shard, matrixRevision: matrix.revision, consumedInput: consumedDigest, candidateExecutionRoot: executionValidation.candidateDir, imageDigest, exitStatus: status } });
        results.push({ shard, status: result });
        if (status !== 0) break;
    }
    return { matrix, consumed, consumedDigest, consumedPath, results, failed: results.some(({ status }) => status === "failed") };
}

function prepareMainBddState({ source, destination }) {
    if (!source || !destination) throw new Error("Main BDD state source and destination are required.");
    const state = JSON.parse(readFileSync(resolve(source), "utf8"));
    state.bdd = { matrixRevision: null, shards: [] };
    mkdirSync(resolve(destination, ".."), { recursive: true });
    writeFileSync(resolve(destination), `${JSON.stringify(state, null, 2)}\n`);
    return state;
}

function persistMainTarballBddEvidence({ mainSha, candidateSourceSha, candidateReleaseId, releaseSetDigest, sealedStateDigest, bundleDir, bddStateFile = process.env.RELEASE_BDD_STATE, repository = process.env.GITHUB_REPOSITORY, runner }) {
    if (!/^[a-f0-9]{40}$/.test(mainSha || "")) throw new Error("Main SHA must be a canonical 40-character lowercase SHA.");
    if (!Number.isSafeInteger(Number(candidateReleaseId)) || Number(candidateReleaseId) <= 0) throw new Error("Candidate release ID must be a positive number.");
    if (!/^sha256:[a-f0-9]{64}$/.test(releaseSetDigest || "") || !/^sha256:[a-f0-9]{64}$/.test(sealedStateDigest || "")) throw new Error("Tarball BDD evidence requires canonical release-set and sealed-state digests.");
    if (!/^[a-f0-9]{40}$/.test(candidateSourceSha || "")) throw new Error("Candidate source SHA must be a canonical 40-character lowercase SHA.");
    if (!repository || !bundleDir) throw new Error("Tarball BDD evidence requires a repository and downloaded candidate bundle.");

    const seal = JSON.parse(readFileSync(join(bundleDir, "candidate-seal.json"), "utf8"));
    validateCandidateSeal(seal);
    if (seal.candidateReleaseId !== Number(candidateReleaseId) || seal.sourceSha !== candidateSourceSha || seal.releaseSetDigest !== releaseSetDigest || seal.sealedStateDigest !== sealedStateDigest) throw new Error("Tarball BDD evidence inputs do not match the downloaded candidate seal.");
    const state = JSON.parse(readFileSync(bddStateFile || join(bundleDir, "candidate-state.json"), "utf8"));
    const matrix = loadMatrix();
    const shards = state.bdd?.shards || [];
    if (state.bdd?.matrixRevision !== matrix.revision || shards.length !== matrix.chunks.length || new Set(shards.map((shard) => shard.name)).size !== matrix.chunks.length) throw new Error("Tarball BDD evidence is incomplete or uses a non-canonical matrix.");
    for (const shard of shards) {
        if (!matrix.chunks.includes(shard.name) || shard.status !== "success" || shard.evidence?.schema !== "bdd-shard-evidence.v1" || shard.evidence.exitStatus !== 0) throw new Error(`Tarball BDD evidence is incomplete for shard ${shard.name}.`);
    }
    const consumedPath = join(bundleDir, "bdd-evidence", matrix.revision, "consumed-input.json");
    const consumed = JSON.parse(readFileSync(consumedPath, "utf8"));
    const { recordDigest, ...unsignedConsumed } = consumed;
    if (!recordDigest || recordDigest !== digestDocument(unsignedConsumed) || consumed.sourceSha !== candidateSourceSha || consumed.releaseSetDigest !== releaseSetDigest || consumed.matrixRevision !== matrix.revision) throw new Error("Consumed tarball BDD input evidence is incomplete or mismatched.");
    for (const shard of shards) if (shard.evidence.consumedInput !== recordDigest) throw new Error(`Tarball BDD shard ${shard.name} is bound to different consumed inputs.`);

    const envelopeBody = {
        schema: "tarball-bdd.v1",
        mainSha,
        sourceSha: candidateSourceSha,
        candidateReleaseId: Number(candidateReleaseId),
        releaseSetDigest,
        sealedStateDigest,
        matrixRevision: matrix.revision,
        consumedInputDigest: recordDigest,
        shards: shards.map(({ name, status, evidence }) => ({ name, status, evidence })),
    };
    const envelope = { ...envelopeBody, digest: digestDocument(envelopeBody) };
    validateTarballBdd(envelope, { mainSha, sourceSha: candidateSourceSha, candidateReleaseId: Number(candidateReleaseId), releaseSetDigest, sealedStateDigest });
    const bytes = Buffer.from(`${JSON.stringify(envelope, null, 2)}\n`);
    const adapter = createGithubReleaseAssetAdapter({ repository, tag: `candidate-${candidateSourceSha}`, targetSha: candidateSourceSha, runner });
    return adapter.persistProductionEvidence(`candidate-${candidateSourceSha}`, { mainSha, releaseSetDigest, name: "tarball-bdd.json", bytes });
}

if (require.main === module) {
    try {
        const args = process.argv.slice(2);
        if (args[0] === "persist-main") {
            persistMainTarballBddEvidence({ mainSha: process.env.MAIN_SHA, candidateSourceSha: process.env.CANDIDATE_SOURCE_SHA, candidateReleaseId: process.env.CANDIDATE_RELEASE_ID, releaseSetDigest: process.env.RELEASE_SET_DIGEST, sealedStateDigest: process.env.SEALED_STATE_DIGEST, bundleDir: process.env.RELEASE_CANDIDATE_DIR, bddStateFile: process.env.RELEASE_BDD_STATE });
            process.exitCode = 0;
        } else if (args[0] === "prepare-main-state") {
            prepareMainBddState({ source: args[1] === "--source" ? args[2] : null, destination: args[3] === "--destination" ? args[4] : null });
        } else {
            if (args[0] !== "run") throw new Error("Usage: release-bdd-validation.js run --all|--shard=<name>");
            const command = args[1] || "--all";
            process.exitCode = runValidation({ command, candidateDir: process.env.RELEASE_CANDIDATE_DIR, stateFile: process.env.RELEASE_CANDIDATE_STATE, identity: JSON.parse(process.env.RELEASE_CANDIDATE_IDENTITY), imageDigest: process.env.RELEASE_GHCR_IMAGE_DIGEST, evidenceFile: process.env.RELEASE_BDD_EVIDENCE_FILE }).failed ? 1 : 0;
        }
    } catch (error) { console.error(`[release-bdd-validation] ${error.message}`); process.exitCode = 1; }
}

module.exports = { loadMatrix, readCandidate, validateCandidateInputs, consumedInput, assertSafeShardRun, runShardCommand, runValidation, prepareMainBddState, persistMainTarballBddEvidence };
