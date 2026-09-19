#!/usr/bin/env node

// The production boundary is intentionally small.  It consumes already sealed
// candidate data; it never builds, packs, creates releases, or publishes a
// directory.
const { execFileSync } = require("node:child_process");
const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { assertSha, digestDocument } = require("./release-contract");
const production = require("./release-production");
const { DEFAULT_REGISTRY } = require("./release-registry-proof");
const { validateReleaseTrainLock, validateAgainstPromotionMetadata } = require("./release-train-lock");

const write = (file, value) => writeFileSync(resolve(file), `${JSON.stringify(value, null, 2)}\n`);
const bytes = (value) => Buffer.isBuffer(value) ? value : Buffer.from(value);
const sha = (value) => assertSha(value, "SHA");
const json = (file) => JSON.parse(readFileSync(resolve(file), "utf8"));

function policy(env, names) {
    if (!names.every((name) => env[name] === "true")) throw new Error(`Release policy is not confirmed (${names.join(", ")}).`);
}

function gitParents({ mainSha, gitRunner = execFileSync }) {
    const main = sha(mainSha);
    const parents = String(gitRunner("git", ["rev-list", "--parents", "-n", "1", main], { encoding: "utf8" })).trim().split(/\s+/);
    if (parents.length !== 3 || parents[0] !== main) throw new Error("Main commit must have exactly two parents.");
    const trees = [main, parents[2]].map((ref) => sha(String(gitRunner("git", ["rev-parse", `${ref}^{tree}`], { encoding: "utf8" })).trim()));
    if (trees[0] !== trees[1]) throw new Error("Main and candidate-source trees must match.");
    return { mainSha: main, parents: parents.slice(1), mainTree: trees[0], secondParentTree: trees[1] };
}

function readRemoteTrainLock({ repository, gitRunner = execFileSync }) {
    if (repository !== "scramjetorg/transform-hub") throw new Error("Admission requires the managed repository.");
    const remote = sha(String(gitRunner("git", ["ls-remote", `https://github.com/${repository}.git`, "refs/heads/devel"], { encoding: "utf8" })).trim().split(/\s+/)[0]);
    gitRunner("git", ["fetch", "--no-tags", "--depth=1", `https://github.com/${repository}.git`, "refs/heads/devel"], { encoding: "utf8" });
    let lock;
    try { lock = JSON.parse(gitRunner("git", ["show", "FETCH_HEAD:.github/release-train-lock.json"], { encoding: "utf8" })); } catch { throw new Error("Active devel release-train lock is unavailable remotely."); }
    validateReleaseTrainLock(lock);
    if (remote !== lock.currentCommit && !lock.continuation.includes(remote)) throw new Error("Remote devel does not carry the active release-train lock.");
    if (lock.status !== "active") throw new Error("Active devel release-train lock is terminal.");
    return lock;
}

function readPromotion({ repository, number, githubRunner = execFileSync }) {
    let metadata;
    try { metadata = JSON.parse(githubRunner("gh", ["api", `repos/${repository}/pulls/${number}`], { encoding: "utf8" })); } catch { throw new Error("Live release promotion PR metadata is unavailable."); }
    return metadata;
}

function validateTrainEvidence({ evidence, lock, promotion, sourceSha }) {
    const binding = evidence?.trainBinding || evidence?.identity?.trainBinding;
    if (!binding) throw new Error("Candidate train evidence is missing.");
    if (binding.trainId !== `${lock.repository}:${lock.stableVersion}` || binding.continuationBase !== lock.refs.R1 || binding.sourceSha !== sourceSha) throw new Error("Candidate train evidence does not match the active lock or current source.");
    const linked = binding.promotion;
    if (!linked || linked.number !== promotion.number || linked.repository !== lock.repository || linked.base !== "main") throw new Error("Candidate train evidence promotion binding does not match the live PR.");
    return binding;
}

function candidateAssets({ adapter, candidateId, bundleDir, releaseSetDigest, sealedStateDigest }) {
    const { downloadAndVerifyCandidate, bytesDigest, validateCandidateSeal } = require("./lib/release-candidate-assets");
    const seal = JSON.parse(bytes(adapter.download(candidateId, "candidate-seal.json")).toString("utf8"));
    validateCandidateSeal(seal);
    releaseSetDigest ||= seal.releaseSetDigest;
    sealedStateDigest ||= seal.sealedStateDigest;
    if (seal.releaseSetDigest !== releaseSetDigest || seal.sealedStateDigest !== sealedStateDigest) throw new Error("Candidate seal does not match the requested release tuple.");
    const stateBytes = bytes(adapter.download(candidateId, "candidate-state.json"));
    if (bytesDigest(stateBytes) !== sealedStateDigest) throw new Error("Candidate state bytes do not match the sealed-state digest.");
    const releaseSet = JSON.parse(bytes(adapter.download(candidateId, "release-set.json")).toString("utf8"));
    const provenance = JSON.parse(bytes(adapter.download(candidateId, "build-provenance.json")).toString("utf8"));
    const result = downloadAndVerifyCandidate({ adapter, candidateId, destination: bundleDir, releaseSet, candidateReference: { candidateId, candidateIdentity: seal.identity, releaseSetDigest, provenanceDigest: digestDocument(provenance), sealedStateDigest, candidateSeal: seal } });
    writeFileSync(resolve(bundleDir, "candidate-state.json"), stateBytes);
    return { ...result, seal, state: JSON.parse(stateBytes.toString("utf8")) };
}

async function verifyRegistry({ releaseTuple, releaseSet, journal, tarballBdd, fetchTarball, registry, output, ...options }) {
    const { verifyRegistryRelease } = require("./release-registry-proof");
    const proof = await verifyRegistryRelease({ releaseTuple, releaseSet, journal, tarballBdd, fetchTarball, registry, ...options });
    if (output) write(output, proof);
    return proof;
}

function appendEvidence({ adapter, candidateId, tuple, name, value }) {
    if (!adapter || typeof adapter.persistProductionEvidence !== "function") throw new Error("An append-only candidate evidence adapter is required.");
    const payload = bytes(typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
    return adapter.persistProductionEvidence(candidateId, { mainSha: tuple.mainSha, releaseSetDigest: tuple.releaseSetDigest, name, bytes: payload });
}

function listEvidence({ adapter, candidateId }) {
    if (!adapter || typeof adapter.listEvidence !== "function") throw new Error("A read-only candidate evidence listing adapter is required.");
    return [...adapter.listEvidence(candidateId)];
}

function candidateEvidence({ adapter, candidateId, suffix, digest }) {
    const names = listEvidence({ adapter, candidateId }).filter((name) => name.includes(`/${suffix}--`));
    const matches = names.map((name) => JSON.parse(Buffer.from(adapter.download(candidateId, name)).toString("utf8"))).filter((value) => !digest || digestDocument(value) === digest);
    if (matches.length !== 1) throw new Error(`Expected exactly one persisted ${suffix} evidence asset for ${digest || "the candidate"}.`);
    return matches[0];
}

function recordRegistryVerification({ adapter, candidateId, tuple, report }) {
    production.validateRegistryVerification(report, { mainSha: tuple.mainSha, candidateReleaseId: tuple.candidateReleaseId, releaseSetDigest: tuple.releaseSetDigest, sealedStateDigest: tuple.sealedStateDigest });
    return appendEvidence({ adapter, candidateId, tuple, name: "registry-verification.json", value: report });
}

async function admitMain({ mainSha, bundleDir, candidateId, candidateAdapter, candidateResolver, gitRunner, githubRunner, repository = "scramjetorg/transform-hub", output, evidenceAdapter = candidateAdapter, env = process.env, policyFlags = ["RELEASE_PRODUCTION_POLICY_CONFIRMED"] }) {
    policy(env, policyFlags);
    const commit = gitParents({ mainSha, gitRunner });
    const sourceSha = sha(commit.parents[1]);
    const lock = readRemoteTrainLock({ repository, gitRunner });
    const promotion = readPromotion({ repository, number: lock.promotion.number, githubRunner });
    validateAgainstPromotionMetadata(lock, promotion);
    if (promotion.head.sha !== sourceSha) throw new Error("Live promotion PR head does not match the main second parent.");
    const candidateReleaseId = Number(candidateId);
    if (!candidateId || (Number.isFinite(candidateReleaseId) && (!Number.isSafeInteger(candidateReleaseId) || candidateReleaseId <= 0))) throw new Error("A sealed candidate release ID or tag is required.");
    const candidate = await (candidateResolver ? candidateResolver(Number.isFinite(candidateReleaseId) ? candidateReleaseId : candidateId, sourceSha) : typeof candidateAdapter.resolve === "function" ? candidateAdapter.resolve(candidateReleaseId) : null);
    if (!candidate || !(candidate.draft ?? candidate.isDraft)) throw new Error("A matching sealed draft candidate is required.");
    if ((candidate.target_commitish || candidate.targetCommitish) !== sourceSha) throw new Error("Candidate source SHA does not match the main second parent.");
    const resolved = candidateAssets({ adapter: candidateAdapter, candidateId: candidateId, bundleDir, releaseSetDigest: candidate.releaseSetDigest, sealedStateDigest: candidate.sealedStateDigest });
    const trainBinding = validateTrainEvidence({ evidence: resolved.state, lock, promotion: promotion.pull_request || promotion, sourceSha });
    const releaseId = Number(candidate.id || candidate.databaseId || candidateReleaseId);
    if (!Number.isSafeInteger(releaseId) || releaseId <= 0) throw new Error("Matching sealed candidate release has no numeric ID.");
    const tuple = { mainSha: commit.mainSha, sourceSha, candidateReleaseId: releaseId, releaseSetDigest: resolved.seal.releaseSetDigest, sealedStateDigest: resolved.seal.sealedStateDigest };
    const admissionBody = { schema: "main-admission.v1", ...commit, mainFirstParentAtAdmission: commit.parents[0], trainBinding, candidate: { sourceSha, releaseId: tuple.candidateReleaseId, releaseSetDigest: tuple.releaseSetDigest, sealedStateDigest: tuple.sealedStateDigest }, releaseSetDigest: tuple.releaseSetDigest, sealedStateDigest: tuple.sealedStateDigest };
    const admission = { ...admissionBody, digest: digestDocument(admissionBody) };
    production.validateMainAdmission(admission);
    appendEvidence({ adapter: evidenceAdapter, candidateId: candidate.tag_name || candidate.tagName || candidateId, tuple, name: "main-admission.json", value: admission });
    if (output) write(output, admission);
    return { admission, tuple, ...resolved };
}

async function preflightRecovery({ tuple, releaseSet, journal, tarballBdd, fetchTarball, evidenceAdapter, candidateId, registry, output, registryVerification }) {
    production.validatePublicationJournal(journal);
    production.validateTarballBdd(tarballBdd, { mainSha: tuple.mainSha, sourceSha: tuple.sourceSha, candidateReleaseId: tuple.candidateReleaseId, releaseSetDigest: tuple.releaseSetDigest, sealedStateDigest: tuple.sealedStateDigest });
    const report = registryVerification;
    if (!report || report.schema !== "registry-verification.v1" || report.outcome !== "incomplete") throw new Error("Recovery requires a persisted incomplete registry verification report.");
    production.validateRegistryVerification(report, { mainSha: tuple.mainSha, candidateReleaseId: tuple.candidateReleaseId, releaseSetDigest: tuple.releaseSetDigest, sealedStateDigest: tuple.sealedStateDigest });
    const mismatched = report.packages.filter((item) => item.status === "mismatched");
    if (mismatched.length) throw new Error("Mismatched registry bytes are terminal and cannot be recovered.");
    const missing = report.packages.filter((item) => item.status === "missing").map((item) => item.name);
    if (!missing.length) throw new Error("Incomplete registry verification has no missing packages.");
    const proof = report;
    if (evidenceAdapter && candidateId) appendEvidence({ adapter: evidenceAdapter, candidateId, tuple, name: "registry-proof.json", value: proof });
    if (output) write(output, proof);
    return proof;
}

async function publishMain({ tuple, releaseSet, tarballPaths, root, journal, publisher, fetchTarball, tarballBdd, registry, evidenceAdapter, candidateId, env = process.env, policyFlags = ["RELEASE_PRODUCTION_POLICY_CONFIRMED", "MAIN_RELEASE_PUBLISH_ENABLED"], output, onlyPackages, registryVerification }) {
    // Registry verification is deliberately before policy/credential checks and
    // before the injected publisher can receive any publishing capability.
    if (journal && tarballBdd && fetchTarball) await preflightRecovery({ tuple, releaseSet, journal, tarballBdd, fetchTarball, registry, registryVerification });
    if (registryVerification) {
        if (registryVerification.packages.some((item) => item.status === "mismatched")) throw new Error("Mismatched registry bytes are terminal and cannot be recovered.");
        onlyPackages ||= registryVerification.packages.filter((item) => item.status === "missing").map((item) => item.name);
    }
    policy(env, policyFlags);
    for (const name of ["NPM_TOKEN", "NODE_AUTH_TOKEN"]) if (env[name]) throw new Error(`${name} must be absent for trusted publishing.`);
    if (typeof publisher !== "function") publisher = require("./release-tarball-publish").publishTarballs;
    const snapshots = [];
    const finalJournal = await publisher({ releaseSet, root, tarballPaths, release: { ...tuple, version: tuple.version }, priorJournal: journal, registry, onlyPackages, onJournalSnapshot: async (snapshot) => { snapshots.push(snapshot); if (evidenceAdapter && candidateId) appendEvidence({ adapter: evidenceAdapter, candidateId, tuple, name: `publication-journal-${snapshot.headDigest}.json`, value: snapshot }); } });
    production.validatePublicationJournal(finalJournal);
    if (evidenceAdapter && candidateId) appendEvidence({ adapter: evidenceAdapter, candidateId, tuple, name: "publication-journal-final.json", value: finalJournal });
    if (output) write(output, finalJournal);
    return { journal: finalJournal, snapshots };
}

module.exports = { admitMain, publishMain, verifyRegistry, preflightRecovery, recordRegistryVerification, listEvidence, candidateEvidence, gitParents, candidateAssets, readRemoteTrainLock, readPromotion, validateTrainEvidence };

if (require.main === module) {
    const args = process.argv.slice(2);
    const option = (name) => { const index = args.indexOf(name); if (index < 0 || !args[index + 1]) throw new Error(`${name} is required.`); return args[index + 1]; };
    try {
        if (args[0] === "admit-main") {
            const { createGithubReleaseAssetAdapter } = require("./lib/github-release-candidate");
            const repository = option("--repository"); const mainSha = option("--main-sha"); const candidateTag = option("--candidate-tag"); const bundleDir = option("--bundle-dir");
            const adapter = createGithubReleaseAssetAdapter({ repository, tag: candidateTag, targetSha: "0".repeat(40) });
            const release = adapter.view(); if (!release) throw new Error("Matching draft candidate release is required for admission.");
            const candidateId = Number(release.databaseId || release.id); if (!Number.isSafeInteger(candidateId) || candidateId <= 0) throw new Error("Candidate release is missing a numeric ID.");
            admitMain({ mainSha, repository, bundleDir, candidateId: candidateTag, candidateAdapter: adapter, candidateResolver: (id) => adapter.resolve(id), gitRunner: execFileSync, githubRunner: execFileSync, output: option("--output") }).then(() => {}).catch((error) => { console.error(`[release-production-runtime] ${error.message}`); process.exitCode = 1; });
        } else if (args[0] === "publish-main") {
            const bundleDir = option("--bundle-dir");
            const releaseSet = json(`${bundleDir}/release-set.json`);
            const tuple = { mainSha: option("--main-sha"), sourceSha: option("--source-sha"), candidateReleaseId: Number(option("--candidate-release-id")), releaseSetDigest: option("--release-set-digest"), sealedStateDigest: option("--sealed-state-digest"), version: option("--version") };
            const adapter = require("./lib/github-release-candidate").createGithubReleaseAssetAdapter({ repository: option("--repository"), tag: option("--candidate-tag"), targetSha: tuple.sourceSha });
            publishMain({ tuple, releaseSet, root: bundleDir, tarballPaths: releaseSet.artifacts.tarballs.map((artifact) => resolve(bundleDir, artifact.path)), candidateId: option("--candidate-tag"), evidenceAdapter: adapter, env: process.env, journal: args.includes("--journal") ? json(option("--journal")) : null, registryVerification: args.includes("--registry-verification") ? json(option("--registry-verification")) : null, onlyPackages: args.includes("--only-packages") ? option("--only-packages").split(",").filter(Boolean) : null, output: option("--output") }).catch((error) => { console.error(`[release-production-runtime] ${error.message}`); process.exitCode = 1; });
        } else if (args[0] === "verify-registry") {
            const journal = json(option("--journal")); const releaseSet = json(option("--release-set")); const tuple = { ...journal.release, mainSha: option("--main-sha"), candidateReleaseId: Number(option("--candidate-release-id")), sourceSha: option("--source-sha"), releaseSetDigest: option("--release-set-digest"), sealedStateDigest: option("--sealed-state-digest") };
            verifyRegistry({ releaseTuple: tuple, releaseSet, journal, journalDigest: option("--journal-digest"), tarballBdd: args.includes("--tarball-bdd") ? json(option("--tarball-bdd")) : undefined, minimumDelayMs: 30 * 60 * 1000, registry: process.env.NPM_CONFIG_REGISTRY || DEFAULT_REGISTRY, fetchTarball: (url) => new Promise((resolvePromise, reject) => require("node:https").get(url, (response) => { if (response.statusCode === 404) { response.resume(); resolvePromise(null); return; } if (response.statusCode < 200 || response.statusCode >= 300) { response.resume(); reject(new Error(`Registry download failed with HTTP ${response.statusCode}.`)); return; } const chunks = []; response.on("data", (chunk) => chunks.push(chunk)); response.on("end", () => resolvePromise(Buffer.concat(chunks))); response.on("error", reject); }).on("error", reject)), now: () => new Date(), output: option("--output") }).then((proof) => { process.stdout.write(`registry-verification-digest=${digestDocument(proof)}\n`); }).catch((error) => { console.error(`[release-production-runtime] ${error.message}`); process.exitCode = 1; });
        } else if (args[0] === "record-registry-verification") {
            const report = json(option("--report")); const tuple = { mainSha: option("--main-sha"), candidateReleaseId: Number(option("--candidate-release-id")), releaseSetDigest: option("--release-set-digest"), sealedStateDigest: option("--sealed-state-digest") };
            const adapter = require("./lib/github-release-candidate").createGithubReleaseAssetAdapter({ repository: option("--repository"), tag: option("--candidate-tag"), targetSha: option("--source-sha") });
            recordRegistryVerification({ adapter, candidateId: option("--candidate-tag"), tuple, report });
            process.stdout.write(`registry-verification-digest=${digestDocument(report)}\n`);
        } else if (args[0] === "preflight-recovery") {
            const tuple = { mainSha: option("--main-sha"), sourceSha: option("--source-sha"), candidateReleaseId: Number(option("--candidate-release-id")), releaseSetDigest: option("--release-set-digest"), sealedStateDigest: option("--sealed-state-digest") };
            preflightRecovery({ tuple, releaseSet: json(option("--release-set")), journal: json(option("--journal")), tarballBdd: json(option("--tarball-bdd")), registryVerification: json(option("--registry-verification")), output: option("--output") }).then((proof) => process.stdout.write(`missing-packages=${proof.packages.filter((item) => item.status === "missing").map((item) => item.name).join(",")}\n`)).catch((error) => { console.error(`[release-production-runtime] ${error.message}`); process.exitCode = 1; });
        } else if (args[0] === "fetch-evidence") {
            const candidateTag = option("--candidate-tag");
            const adapter = require("./lib/github-release-candidate").createGithubReleaseAssetAdapter({ repository: option("--repository"), tag: candidateTag, targetSha: option("--source-sha") });
            const value = candidateEvidence({ adapter, candidateId: candidateTag, suffix: option("--name"), digest: args.includes("--digest") ? option("--digest") : null });
            write(option("--output"), value);
        } else throw new Error("Usage: release-production-runtime.js publish-main|verify-registry");
    } catch (error) { console.error(`[release-production-runtime] ${error.message}`); process.exitCode = 1; }
}
