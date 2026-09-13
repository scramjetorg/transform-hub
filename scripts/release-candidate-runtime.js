#!/usr/bin/env node
/* The only module allowed to cross the protected GitHub boundary. */
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { assertSha, digestDocument } = require("./release-contract");
const { candidateIdentity, recordProducerAttestation } = require("./lib/release-bundle-state");
const { buildAndPack } = require("./release-bundle");
const { createGithubReleaseAssetAdapter, stageGithubDraftCandidate } = require("./lib/github-release-candidate");
const { bytesDigest, downloadAndVerifyCandidate, validateCandidateSeal } = require("./lib/release-candidate-assets");
const offlineAdmission = require("./release-candidate-workflow").admission;
const BDD_MATRIX = require("./release-bdd-matrix.v1.json");

function option(args, name) { const i = args.indexOf(name); if (i < 0 || !args[i + 1]) throw new Error(`${name} is required.`); return args[i + 1]; }
function json(file) { return JSON.parse(readFileSync(resolve(file), "utf8")); }
function write(file, value) { writeFileSync(resolve(file), `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function sha256(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }

function remoteSha(repository, branch, runner = execFileSync) {
    const output = runner("git", ["ls-remote", `https://github.com/${repository}.git`, `refs/heads/${branch}`], { encoding: "utf8" }).trim();
    return assertSha(output.split(/\s+/)[0], "protected remote SHA");
}

function preflight({ repository, branch, sourceSha, output, env = process.env, runner = execFileSync }) {
    if (repository !== "scramjetorg/transform-hub" || branch !== "devel") throw new Error("Candidate preflight requires the managed devel repository and branch.");
    const expectedSha = assertSha(sourceSha, "candidate source SHA");
    if (env.RELEASE_REMOTE_POLICY_CONFIRMED !== "true") throw new Error("Remote release policy is unconfirmed; refusing to build or stage a candidate.");
    if (remoteSha(repository, branch, runner) !== expectedSha) throw new Error("Protected remote devel moved during candidate preflight.");
    const sourceTree = `sha256:${runner("git", ["rev-parse", `${expectedSha}^{tree}`], { encoding: "utf8" }).trim()}`;
    const lockfileDigest = sha256(readFileSync("package-lock.json"));
    const configRevision = env.RELEASE_CONFIG_REVISION || "release-config-v1";
    const configDigest = sha256(Buffer.from(configRevision));
    const identity = candidateIdentity({ sourceSha: expectedSha, sourceTree, lockfileDigest, configRevision, configDigest, buildIdentity: sha256(Buffer.from(`${expectedSha}:${sourceTree}:${lockfileDigest}:${configDigest}`)) });
    write(output, identity);
    return identity;
}

function build({ root, bundleDir, stateFile, identityFile, releaseSetFile }) {
    const result = buildAndPack({ root, bundleDir, stateFile, identity: json(identityFile), releaseSet: json(releaseSetFile) });
    write(`${bundleDir}/candidate-result.json`, { status: result.status, releaseSetDigest: digestDocument(result.releaseSet), identity: json(identityFile).key });
    return result;
}

function locate({ repository, tag, sourceSha, output, runner }) {
    const adapter = createGithubReleaseAssetAdapter({ repository, tag, targetSha: sourceSha, runner });
    const release = adapter.view();
    if (!release) { write(output, { status: "not-found", tag }); return { status: "not-found" }; }
    if (!(release.draft ?? release.isDraft) || (release.target_commitish ?? release.targetCommitish) !== sourceSha) throw new Error("Durable candidate release conflicts with the requested identity.");
    const releaseId = Number(release.id || release.databaseId);
    if (!Number.isSafeInteger(releaseId) || releaseId <= 0) throw new Error("Located candidate release has no numeric ID.");
    const seal = JSON.parse(adapter.download(tag, "candidate-seal.json").toString("utf8"));
    validateCandidateSeal(seal);
    const result = { status: "found", tag, releaseId, releaseSetDigest: seal.releaseSetDigest, sealedStateDigest: seal.sealedStateDigest };
    write(output, result);
    return result;
}

function resolveCandidate({ repository, releaseId, tag, sourceSha, releaseSetDigest, sealedStateDigest, bundleDir, stateFile, output, runner }) {
    const adapter = createGithubReleaseAssetAdapter({ repository, tag, targetSha: sourceSha, runner });
    if (!Number.isSafeInteger(Number(releaseId)) || Number(releaseId) <= 0) throw new Error("Candidate resolve requires a numeric release ID.");
    if (!/^sha256:[a-f0-9]{64}$/i.test(releaseSetDigest || "") || !/^sha256:[a-f0-9]{64}$/i.test(sealedStateDigest || "")) throw new Error("Candidate resolve requires release-set and sealed-state digests.");
    const release = adapter.resolve(releaseId);
    if (!release) { write(output, { status: "not-found" }); return { status: "not-found" }; }
    if (Number(release.id) !== Number(releaseId) || !(release.draft ?? release.isDraft) || (release.target_commitish ?? release.targetCommitish) !== sourceSha) throw new Error("Durable candidate release conflicts with the requested identity.");
    const stateBytes = adapter.download(tag, "candidate-state.json");
    const state = JSON.parse(stateBytes.toString("utf8"));
    const seal = JSON.parse(adapter.download(tag, "candidate-seal.json").toString("utf8"));
    validateCandidateSeal(seal);
    if (seal.candidateReleaseId !== Number(releaseId) || seal.releaseSetDigest !== releaseSetDigest || seal.sealedStateDigest !== sealedStateDigest || bytesDigest(stateBytes) !== sealedStateDigest || seal.sourceSha !== sourceSha) throw new Error("Candidate seal does not match the requested durable identity.");
    if (state.status === "claimed") throw new Error("Durable candidate state is interrupted; refusing to rebuild.");
    if (state.status !== "sealed" || state.identity?.sourceSha !== sourceSha || state.admission?.status !== "pending") throw new Error("Durable candidate state conflicts with the requested identity or is terminal.");
    const releaseSet = JSON.parse(adapter.download(tag, "release-set.json").toString("utf8"));
    JSON.parse(adapter.download(tag, "build-provenance.json").toString("utf8"));
    const candidateReference = { candidateId: tag, candidateIdentity: seal.identity, releaseSetDigest, provenanceDigest: seal.provenanceDigest, sealedStateDigest, candidateSeal: seal };
    mkdirSync(bundleDir, { recursive: true });
    downloadAndVerifyCandidate({ adapter, candidateId: tag, destination: bundleDir, candidateReference });
    writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
    writeFileSync(`${bundleDir}/candidate-identity.json`, adapter.download(tag, "candidate-identity.json"));
    write(output, { status: "reused", releaseId: Number(releaseId), releaseSetDigest, sealedStateDigest });
    return { status: "reused", state, releaseSet };
}

function stage(args) {
    const identity = json(args.identityFile);
    const releaseSet = json(`${args.bundleDir}/release-set.json`);
    const provenance = json(`${args.bundleDir}/build-provenance.json`);
    const result = stageGithubDraftCandidate({ repository: args.repository, tag: args.tag, targetSha: args.sourceSha, root: args.bundleDir, releaseSet, provenance, lockfile: readFileSync(`${args.bundleDir}/package-lock.json`), stateFile: args.stateFile, identity, runner: args.runner });
    if (args.releaseId > 0 && result.releaseId !== args.releaseId) throw new Error("Draft release ID changed while staging candidate assets.");
    write(args.output, { releaseId: result.releaseId, candidateId: result.candidateId, releaseSetDigest: digestDocument(releaseSet), sealedStateDigest: result.seal.sealedStateDigest, sealDigest: digestDocument(result.seal) });
    return result;
}

function buildBddEvidenceAssets({ state, releaseId, releaseSetDigest, sealedStateDigest }) {
    const shards = state.bdd?.shards || [];
    const expected = new Set(BDD_MATRIX.chunks);
    const seen = new Set();
    if (shards.length !== expected.size) throw new Error("All canonical BDD shards are required before durable evidence persistence.");
    if (state.bdd.matrixRevision !== BDD_MATRIX.revision) throw new Error("BDD shard matrix revision is not canonical.");
    return shards.map((shard) => {
        if (!shard.name || seen.has(shard.name) || !expected.has(shard.name)) throw new Error("BDD shard names must be unique and canonical.");
        seen.add(shard.name);
        if (shard.status !== "success") throw new Error("All BDD shards must succeed before durable evidence persistence.");
        if (!shard.evidence || shard.evidence.schema !== "bdd-shard-evidence.v1" || shard.evidence.shard !== shard.name || shard.evidence.matrixRevision !== BDD_MATRIX.revision || shard.evidence.exitStatus !== 0) throw new Error(`BDD shard evidence payload is invalid: ${shard.name}`);
        const item = { schema: "release-bdd-shard-evidence.v1", shard: shard.name, status: shard.status, matrixRevision: state.bdd.matrixRevision, candidateReleaseId: Number(releaseId), releaseSetDigest, sealedStateDigest, evidence: shard.evidence || null };
        return { name: `bdd-evidence/${item.shard}.json`, bytes: Buffer.from(`${JSON.stringify(item, null, 2)}\n`), item };
    });
}

function persistBdd({ repository, tag, releaseId, bundleDir, releaseSetDigest, sealedStateDigest, runner = execFileSync }) {
    const adapter = createGithubReleaseAssetAdapter({ repository, tag, targetSha: JSON.parse(readFileSync(`${bundleDir}/candidate-seal.json`, "utf8")).sourceSha, runner });
    const release = adapter.resolve(releaseId);
    if (!release || Number(release.id) !== Number(releaseId)) throw new Error("BDD evidence target release does not match the numeric candidate ID.");
    const seal = JSON.parse(readFileSync(`${bundleDir}/candidate-seal.json`, "utf8"));
    validateCandidateSeal(seal);
    if (seal.releaseSetDigest !== releaseSetDigest || seal.sealedStateDigest !== sealedStateDigest) throw new Error("BDD evidence inputs do not match the candidate seal.");
    const state = JSON.parse(readFileSync(`${bundleDir}/candidate-state.json`, "utf8"));
    const stagedEvidence = buildBddEvidenceAssets({ state, releaseId, releaseSetDigest, sealedStateDigest });
    const evidence = stagedEvidence.map((asset) => asset.item);
    const consumed = `${bundleDir}/bdd-evidence/${require("./release-bdd-matrix.v1.json").revision}/consumed-input.json`;
    const assets = stagedEvidence.map(({ name, bytes }) => ({ name, bytes }));
    assets.push({ name: "bdd-evidence/consumed-input.json", bytes: readFileSync(consumed) });
    adapter.stage(tag, assets);
    return { releaseId: Number(releaseId), evidenceDigest: digestDocument(evidence) };
}

function admit({ repository, tag, sourceSha, bundleDir, output, runner }) {
    const adapter = createGithubReleaseAssetAdapter({ repository, tag, targetSha: sourceSha, runner });
    const release = adapter.view();
    if (!release || !(release.databaseId || release.id)) throw new Error("Matching draft candidate release is required for admission.");
    const releaseId = Number(release.databaseId || release.id);
    mkdirSync(bundleDir, { recursive: true });
    const seal = JSON.parse(adapter.download(tag, "candidate-seal.json").toString("utf8"));
    validateCandidateSeal(seal);
    resolveCandidate({ repository, tag, sourceSha, releaseId, releaseSetDigest: seal.releaseSetDigest, sealedStateDigest: seal.sealedStateDigest, bundleDir, stateFile: `${bundleDir}/candidate-state.json`, output: `${bundleDir}/resolve.json`, runner });
    writeFileSync(`${bundleDir}/candidate-success.json`, adapter.download(tag, "candidate-success.json"));
    const shardFiles = adapter.list(tag).filter((name) => /^bdd-evidence\/[^/]+\.json$/.test(name) && !name.endsWith("consumed-input.json"));
    for (const name of shardFiles) writeFileSync(`${bundleDir}/${name.replaceAll("/", "-")}`, adapter.download(tag, name));
    return offlineAdmission({ stateFile: `${bundleDir}/candidate-state.json`, releaseSetFile: `${bundleDir}/release-set.json`, evidenceFile: `${bundleDir}/candidate-success.json`, sealFile: `${bundleDir}/candidate-seal.json`, shardEvidenceFiles: shardFiles.map((name) => ({ file: `${bundleDir}/${name.replaceAll("/", "-")}`, assetName: name })), sourceSha, releaseId, output });
}

function main() {
    const [command, ...args] = process.argv.slice(2);
    if (command === "preflight") return preflight({ repository: option(args, "--repository"), branch: option(args, "--branch"), sourceSha: option(args, "--source-sha"), output: option(args, "--output") });
    if (command === "build") return build({ root: option(args, "--root"), bundleDir: option(args, "--bundle-dir"), stateFile: option(args, "--state"), identityFile: option(args, "--identity"), releaseSetFile: option(args, "--release-set") });
    if (command === "locate") return locate({ repository: option(args, "--repository"), tag: option(args, "--tag"), sourceSha: option(args, "--source-sha"), output: option(args, "--output") });
    if (command === "resolve") return resolveCandidate({ repository: option(args, "--repository"), releaseId: Number(option(args, "--release-id")), tag: option(args, "--tag"), sourceSha: option(args, "--source-sha"), releaseSetDigest: option(args, "--release-set-digest"), sealedStateDigest: option(args, "--sealed-state-digest"), bundleDir: option(args, "--bundle-dir"), stateFile: option(args, "--state"), output: option(args, "--output") });
    if (command === "stage") return stage({ repository: option(args, "--repository"), tag: option(args, "--tag"), sourceSha: option(args, "--source-sha"), releaseId: Number(option(args, "--release-id")), bundleDir: option(args, "--bundle-dir"), stateFile: option(args, "--state"), identityFile: option(args, "--identity"), output: option(args, "--output") });
    if (command === "persist-bdd") return write(option(args, "--output"), persistBdd({ repository: option(args, "--repository"), tag: option(args, "--tag"), releaseId: Number(option(args, "--release-id")), bundleDir: option(args, "--bundle-dir"), releaseSetDigest: option(args, "--release-set-digest"), sealedStateDigest: option(args, "--sealed-state-digest") }));
    if (command === "attest") {
        const evidenceFile = option(args, "--evidence");
        if (args.includes("--repository")) {
            const evidence = json(evidenceFile);
            const adapter = createGithubReleaseAssetAdapter({ repository: option(args, "--repository"), tag: option(args, "--tag"), targetSha: evidence.sourceSha });
            const release = adapter.view();
            const candidateId = release?.databaseId || release?.id;
            if (!Number.isSafeInteger(candidateId) || candidateId <= 0) throw new Error("Candidate release is missing a numeric ID.");
            const tag = option(args, "--tag");
            const seal = JSON.parse(adapter.download(tag, "candidate-seal.json").toString("utf8"));
            if (evidence.candidateReleaseId !== candidateId || evidence.releaseSetDigest !== seal.releaseSetDigest || evidence.sealedStateDigest !== seal.sealedStateDigest) throw new Error("Candidate-success evidence is not bound to the durable candidate seal.");
            adapter.stage(tag, [{ name: "candidate-success.json", bytes: readFileSync(evidenceFile) }]);
        } else {
            const identity = json(option(args, "--identity"));
            recordProducerAttestation(option(args, "--state"), identity, { reference: resolve(evidenceFile), status: "available" });
        }
        return write(option(args, "--output"), { candidateSuccess: true, evidenceDigest: digestDocument(json(evidenceFile)) });
    }
    if (command === "admit") return admit({ repository: option(args, "--repository"), tag: option(args, "--tag"), sourceSha: option(args, "--source-sha"), bundleDir: option(args, "--bundle-dir"), output: option(args, "--output") });
    throw new Error("Usage: release-candidate-runtime.js preflight|build|resolve|stage|attest");
}
if (require.main === module) { try { main(); } catch (error) { console.error(`[release-candidate-runtime] ${error.message}`); process.exitCode = 1; } }
module.exports = { preflight, build, locate, resolveCandidate, stage, buildBddEvidenceAssets, persistBdd, admit };
