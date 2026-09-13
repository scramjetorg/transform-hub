#!/usr/bin/env node
"use strict";

const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { INCLUDED_PACKAGES, RELEASE_WAVES } = require("./lib/release-boundary");
const { buildAndPack } = require("./release-bundle");
const { digestDocument, assertDigest, assertSha } = require("./release-contract");
const { candidateIdentity, readState } = require("./lib/release-bundle-state");
const { recordProducerAttestation } = require("./lib/release-bundle-state");
const { createGithubReleaseAssetAdapter, stageGithubDraftCandidate } = require("./lib/github-release-candidate");
const { downloadAndVerifyCandidate } = require("./lib/release-candidate-assets");

function option(args, name) {
    const index = args.indexOf(name);
    if (index < 0 || !args[index + 1]) throw new Error(`${name} is required.`);
    return args[index + 1];
}

function sha256(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
function json(file) { return JSON.parse(readFileSync(resolve(file), "utf8")); }
function write(file, value) { writeFileSync(resolve(file), `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8" }); }

function remoteSha(repository, branch) {
    const output = execFileSync("git", ["ls-remote", repository, `refs/heads/${branch}`], { encoding: "utf8" }).trim();
    const value = output.split(/\s+/)[0];
    return assertSha(value, "protected remote SHA");
}

function preflight({ repository, branch, sourceSha, output, requirePolicyConfirmation = false, env = process.env }) {
    if (repository !== "scramjetorg/transform-hub" || branch !== "devel") throw new Error("Candidate preflight requires the managed devel repository and branch.");
    const expectedSha = assertSha(sourceSha, "candidate source SHA");
    if (requirePolicyConfirmation && env.RELEASE_REMOTE_POLICY_CONFIRMED !== "true") throw new Error("Remote release policy is unconfirmed; refusing to build or stage a candidate.");
    const remote = remoteSha(`https://github.com/${repository}.git`, branch);
    if (remote !== expectedSha) throw new Error("Protected remote devel moved during candidate preflight.");
    const sourceTree = `sha256:${execFileSync("git", ["rev-parse", `${expectedSha}^{tree}`], { encoding: "utf8" }).trim()}`;
    const lockfileDigest = sha256(readFileSync("package-lock.json"));
    const configRevision = env.RELEASE_CONFIG_REVISION || "release-config-v1";
    const configDigest = sha256(Buffer.from(configRevision));
    const identity = candidateIdentity({ sourceSha: expectedSha, sourceTree, lockfileDigest, configRevision, configDigest, buildIdentity: sha256(Buffer.from(`${expectedSha}:${sourceTree}:${lockfileDigest}:${configDigest}`)) });
    write(output, identity);
    return identity;
}

function plan({ identityFile, output, imageDigest, imageRepository = "ghcr.io/scramjetorg/transform-hub-bdd-node" }) {
    const identity = json(identityFile);
    assertDigest(imageDigest, "candidate BDD image digest");
    const releaseSet = {
        schema: "release-set.v1",
        source: { repository: "scramjetorg/transform-hub", sha: identity.sourceSha, tree: identity.sourceTree },
        lockfile: { path: "package-lock.json", sha256: identity.lockfileDigest },
        toolchain: { node: process.version, npm: execFileSync(process.execPath, [require.resolve("npm/bin/npm-cli.js"), "--version"], { encoding: "utf8" }).trim() },
        build: { identity: identity.buildIdentity },
        boundary: { packages: [...INCLUDED_PACKAGES] }, waves: RELEASE_WAVES,
        artifacts: { tarballs: [], images: [{ repository: imageRepository, digest: imageDigest }] },
        canonical: { schema: "release-set.v1", version: 1 },
    };
    write(output, releaseSet);
    return releaseSet;
}

function build({ root, bundleDir, stateFile, identityFile, releaseSetFile }) {
    const identity = json(identityFile);
    const releaseSet = json(releaseSetFile);
    const result = buildAndPack({ root, bundleDir, stateFile, identity, releaseSet });
    write(`${bundleDir}/candidate-result.json`, { status: result.status, releaseSetDigest: digestDocument(result.releaseSet), identity: identity.key });
    return result;
}

function resolveCandidate({ repository, tag, sourceSha, identityKey, bundleDir, stateFile, output, runner }) {
    const adapter = createGithubReleaseAssetAdapter({ repository, tag, targetSha: sourceSha, runner });
    const release = adapter.view ? adapter.view() : null;
    if (!release) { write(output, { status: "missing" }); return { status: "missing" }; }
    if (!release.isDraft || release.tagName !== tag || (release.targetCommitish && release.targetCommitish !== sourceSha)) throw new Error("Durable candidate release conflicts with the requested identity.");
    const stateBytes = adapter.download(tag, "candidate-state.json");
    let state;
    try { state = JSON.parse(stateBytes.toString("utf8")); } catch { throw new Error("Durable candidate state is invalid JSON."); }
    if (state.status === "claimed") throw new Error("Durable candidate state is interrupted; refusing to rebuild.");
    if (state.status !== "sealed" || state.key !== identityKey || state.identity?.sourceSha !== sourceSha || state.admission?.status !== "pending") throw new Error("Durable candidate state conflicts with the requested identity or is terminal.");
    const releaseSetBytes = adapter.download(tag, "release-set.json");
    const provenanceBytes = adapter.download(tag, "build-provenance.json");
    const releaseSet = JSON.parse(releaseSetBytes.toString("utf8"));
    const provenance = JSON.parse(provenanceBytes.toString("utf8"));
    const candidateReference = { candidateId: tag, candidateIdentity: identityKey, releaseSetDigest: digestDocument(releaseSet), provenanceDigest: digestDocument(provenance) };
    mkdirSync(bundleDir, { recursive: true });
    downloadAndVerifyCandidate({ adapter, candidateId: tag, destination: bundleDir, candidateReference });
    writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
    write(output, { status: "reused", identity: identityKey, releaseSetDigest: digestDocument(releaseSet) });
    return { status: "reused", state, releaseSet };
}

function admission({ stateFile, releaseSetFile, evidenceFile, sourceSha, releaseId, output }) {
    const state = readState(stateFile);
    if (!state || state.status !== "sealed" || state.identity.sourceSha !== assertSha(sourceSha, "admission source SHA")) throw new Error("Matching sealed candidate state is required for admission.");
    if (!Number.isSafeInteger(Number(releaseId)) || Number(releaseId) <= 0 || state.candidateRelease.id !== Number(releaseId)) throw new Error("Admission requires the durable numeric draft release ID.");
    const releaseSet = json(releaseSetFile);
    if (state.bundle?.releaseSetDigest !== digestDocument(releaseSet) || state.candidateRelease.releaseSetDigest !== digestDocument(releaseSet)) throw new Error("Candidate release-set digest does not match sealed state.");
    const evidence = json(evidenceFile);
    if (state.producerAttestation.status !== "available" || evidence.candidateSuccess !== true || evidence.sourceSha !== state.identity.sourceSha || Number(evidence.candidateReleaseId) !== Number(releaseId) || evidence.releaseSetDigest !== digestDocument(releaseSet)) throw new Error("Candidate-success evidence does not match the admitted candidate.");
    const shards = state.bdd?.shards || [];
    if (!shards.length || shards.some((shard) => shard.status !== "success")) throw new Error("All required BDD evidence must be successful before admission.");
    write(output, { schema: "release-admission-evidence.v1", sourceSha, candidateReleaseId: Number(releaseId), releaseSetDigest: digestDocument(releaseSet), evidenceDigest: digestDocument(evidence), admitted: true });
}

function stage({ repository, tag, sourceSha, releaseId, bundleDir, stateFile, identityFile, output }) {
    const identity = json(identityFile);
    const releaseSet = json(`${bundleDir}/release-set.json`);
    const provenance = json(`${bundleDir}/build-provenance.json`);
    const result = stageGithubDraftCandidate({ repository, tag, targetSha: sourceSha, candidateId: tag, root: bundleDir, releaseSet, provenance, lockfile: readFileSync(`${bundleDir}/package-lock.json`), stateFile, identity });
    write(output, { releaseId: result.releaseId, candidateId: result.candidateId, releaseSetDigest: digestDocument(releaseSet), requestedReleaseId: Number(releaseId) });
    if (Number(releaseId) > 0 && result.releaseId !== Number(releaseId)) throw new Error("Draft release ID changed while staging candidate assets.");
    return result;
}

function attest({ stateFile, identityFile, evidenceFile, output }) {
    const identity = json(identityFile);
    const evidence = json(evidenceFile);
    if (!Number.isSafeInteger(Number(evidence.candidateReleaseId)) || Number(evidence.candidateReleaseId) <= 0 || !/^sha256:[a-f0-9]{64}$/i.test(evidence.releaseSetDigest || "")) throw new Error("Candidate-success evidence is malformed.");
    recordProducerAttestation(stateFile, identity, { reference: resolve(evidenceFile), status: "available" });
    write(output, { schema: "candidate-success-attestation.v1", candidateSuccess: true, candidateReleaseId: evidence.candidateReleaseId, releaseSetDigest: evidence.releaseSetDigest, evidenceDigest: digestDocument(evidence) });
}

function main() {
    const [command, ...args] = process.argv.slice(2);
    if (command === "preflight") return preflight({ repository: option(args, "--repository"), branch: option(args, "--branch"), sourceSha: option(args, "--source-sha"), output: option(args, "--output"), requirePolicyConfirmation: args.includes("--require-policy-confirmation") });
    if (command === "plan") return plan({ identityFile: option(args, "--identity"), output: option(args, "--output"), imageDigest: option(args, "--image-digest"), imageRepository: args.includes("--image-repository") ? option(args, "--image-repository") : undefined });
    if (command === "build") return build({ root: option(args, "--root"), bundleDir: option(args, "--bundle-dir"), stateFile: option(args, "--state"), identityFile: option(args, "--identity"), releaseSetFile: option(args, "--release-set") });
    if (command === "resolve") return resolveCandidate({ repository: option(args, "--repository"), tag: option(args, "--tag"), sourceSha: option(args, "--source-sha"), identityKey: option(args, "--identity-key"), bundleDir: option(args, "--bundle-dir"), stateFile: option(args, "--state"), output: option(args, "--output") });
    if (command === "admission") return admission({ stateFile: option(args, "--state"), releaseSetFile: option(args, "--release-set"), evidenceFile: option(args, "--evidence"), sourceSha: option(args, "--source-sha"), releaseId: option(args, "--release-id"), output: option(args, "--output") });
    if (command === "stage") return stage({ repository: option(args, "--repository"), tag: option(args, "--tag"), sourceSha: option(args, "--source-sha"), releaseId: option(args, "--release-id"), bundleDir: option(args, "--bundle-dir"), stateFile: option(args, "--state"), identityFile: option(args, "--identity"), output: option(args, "--output") });
    if (command === "attest") return attest({ stateFile: option(args, "--state"), identityFile: option(args, "--identity"), evidenceFile: option(args, "--evidence"), output: option(args, "--output") });
    throw new Error("Usage: release-candidate-workflow.js preflight|plan|build|admission");
}

if (require.main === module) { try { main(); } catch (error) { console.error(`[release-candidate-workflow] ${error.message}`); process.exitCode = 1; } }
module.exports = { preflight, plan, build, resolveCandidate, admission };
