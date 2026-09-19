#!/usr/bin/env node
const { createHash } = require("node:crypto");
const { writeFileSync } = require("node:fs");
const { assertSha, assertDigest, digestDocument, validateReleaseSet } = require("./release-contract");
const { validateMainAdmission, validateTarballBdd, validatePublicationJournal, validateRegistryProof, validateRegistryVerification, validateFinalizationState } = require("./release-production");

const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const sri = (bytes) => `sha256-${createHash("sha256").update(bytes).digest("base64")}`;
function reservationOf(input) {
    assertSha(input.mainSha, "main SHA"); assertDigest(input.releaseSetDigest, "release-set digest"); assertDigest(input.sealedStateDigest, "sealed-state digest");
    for (const field of ["admissionDigest", "bddDigest", "journalDigest", "registryVerificationDigest"]) assertDigest(input[field], field);
    if (!Number.isSafeInteger(input.candidateReleaseId) || input.candidateReleaseId <= 0 || typeof input.version !== "string" || !input.version || typeof input.finalTag !== "string" || !input.finalTag) throw new Error("Finalization reservation tuple is incomplete.");
    return { mainSha: input.mainSha.toLowerCase(), candidateReleaseId: input.candidateReleaseId, releaseSetDigest: input.releaseSetDigest.toLowerCase(), sealedStateDigest: input.sealedStateDigest.toLowerCase(), admissionDigest: input.admissionDigest.toLowerCase(), bddDigest: input.bddDigest.toLowerCase(), journalDigest: input.journalDigest.toLowerCase(), registryVerificationDigest: input.registryVerificationDigest.toLowerCase(), version: input.version, finalTag: input.finalTag };
}

function verifyPrerequisites(input, releaseSet, evidence = input) {
    validateReleaseSet(releaseSet);
    if (digestDocument(releaseSet) !== input.releaseSetDigest) throw new Error("Release set digest does not match finalization reservation.");
    validateMainAdmission(evidence.admission); validateTarballBdd(evidence.bdd, { mainSha: input.mainSha, sourceSha: evidence.admission.candidate.sourceSha, candidateReleaseId: input.candidateReleaseId, releaseSetDigest: input.releaseSetDigest, sealedStateDigest: input.sealedStateDigest });
    validatePublicationJournal(evidence.journal);
    const verification = evidence.registryVerification || evidence.registryProof;
    if (verification?.schema === "registry-verification.v1") {
        validateRegistryVerification(verification, { mainSha: input.mainSha, candidateReleaseId: input.candidateReleaseId, releaseSetDigest: input.releaseSetDigest, sealedStateDigest: input.sealedStateDigest });
        if (verification.outcome !== "verified") throw new Error("Release finalization requires a positive registry verification.");
    } else validateRegistryProof(verification, { mainSha: input.mainSha, candidateReleaseId: input.candidateReleaseId, releaseSetDigest: input.releaseSetDigest, sealedStateDigest: input.sealedStateDigest });
    for (const [name, value] of [["admissionDigest", evidence.admission], ["bddDigest", evidence.bdd], ["journalDigest", evidence.journal], ["registryVerificationDigest", verification]]) if (digestDocument(value) !== input[name]) throw new Error(`${name} does not match prerequisite evidence.`);
}

async function finalizeRelease({ adapter, candidateReleaseId, releaseSet, mainSha, sealedStateDigest, admission, bdd, journal, registryProof, registryVerification = registryProof, version, finalTag, stateFile, previousState } = {}) {
    const input = reservationOf({ mainSha, candidateReleaseId, releaseSetDigest: digestDocument(releaseSet), sealedStateDigest, admissionDigest: digestDocument(admission), bddDigest: digestDocument(bdd), journalDigest: digestDocument(journal), registryVerificationDigest: digestDocument(registryVerification), version, finalTag });
    if (!adapter || typeof adapter.reservation !== "function") throw new Error("An injected finalization adapter is required.");
    verifyPrerequisites(input, releaseSet, { admission, bdd, journal, registryVerification, registryProof });
    const reservation = adapter.reservation(input); const copied = new Map();
    let candidateManifest;
    try { candidateManifest = JSON.parse(Buffer.from(adapter.download(candidateReleaseId, "release-set.json")).toString("utf8")); }
    catch { throw new Error("Candidate release-set manifest digest mismatch."); }
    validateReleaseSet(candidateManifest);
    if (digestDocument(candidateManifest) !== input.releaseSetDigest) throw new Error("Candidate release-set manifest digest mismatch.");
    for (const artifact of releaseSet.artifacts.tarballs) {
        const bytes = Buffer.from(adapter.download(candidateReleaseId, artifact.path));
        if (sha256(bytes) !== artifact.sha256 || sri(bytes) !== artifact.sri) throw new Error(`Candidate tarball ${artifact.name} digest mismatch.`);
        const existing = adapter.list(reservation.releaseId).includes(artifact.path);
        if (existing) { const actual = Buffer.from(adapter.download(reservation.releaseId, artifact.path)); if (sha256(actual) !== artifact.sha256 || sri(actual) !== artifact.sri) throw new Error(`Final tarball ${artifact.name} digest mismatch.`); }
        else adapter.append(reservation.releaseId, artifact.path, bytes);
        copied.set(artifact.path, { name: artifact.path, size: bytes.length, sha256: artifact.sha256, sri: artifact.sri });
        const body = { schema: "finalization-state.v1", ...input, status: "copying", assets: [...copied.values()] };
        const snapshot = { ...body, digest: digestDocument(body) }; validateFinalizationState(snapshot, input); const snapshotName = `finalization-state-${String(copied.size).padStart(4, "0")}.json`; if (!adapter.list(reservation.releaseId).includes(snapshotName)) adapter.append(reservation.releaseId, snapshotName, Buffer.from(`${JSON.stringify(snapshot, null, 2)}\n`));
    }
    for (const artifact of releaseSet.artifacts.tarballs) { const bytes = Buffer.from(adapter.download(reservation.releaseId, artifact.path)); if (sha256(bytes) !== artifact.sha256 || sri(bytes) !== artifact.sri) throw new Error(`Final tarball ${artifact.name} digest mismatch.`); }
    const body = { schema: "finalization-state.v1", ...input, status: "verified", assets: [...copied.values()] }; const state = { ...body, digest: digestDocument(body) }; validateFinalizationState(state, input); if (!adapter.list(reservation.releaseId).includes("finalization-state-complete.json")) adapter.append(reservation.releaseId, "finalization-state-complete.json", Buffer.from(`${JSON.stringify(state, null, 2)}\n`));
    adapter.publish(reservation.releaseId); const published = { ...state, status: "published" }; if (stateFile) writeFileSync(stateFile, `${JSON.stringify(published, null, 2)}\n`); return { ...reservation, state: published };
}

module.exports = { finalizeRelease, reservationOf, verifyPrerequisites };

if (require.main === module) {
    const args = process.argv.slice(2);
    const option = (name) => { const index = args.indexOf(name); if (index < 0 || !args[index + 1]) throw new Error(`${name} is required.`); return args[index + 1]; };
    try {
        const { createGithubReleaseAssetAdapter } = require("./lib/github-release-candidate");
        const { createGithubReleaseFinalizerAdapter } = require("./lib/github-release-finalizer");
        const repository = option("--repository"); const candidateTag = option("--candidate-tag"); const candidateReleaseId = Number(option("--candidate-release-id"));
        const candidate = createGithubReleaseAssetAdapter({ repository, tag: candidateTag, targetSha: option("--main-sha") });
        const jsonAsset = (name) => JSON.parse(candidate.download(candidateTag, name).toString("utf8"));
        const releaseSet = jsonAsset("release-set.json");
        if (args.includes("--release-set-digest") && digestDocument(releaseSet) !== option("--release-set-digest")) throw new Error("Release-set digest does not match finalization inputs.");
        const journalDigest = args.includes("--journal-digest") ? option("--journal-digest") : null;
        const journalName = candidate.list(candidateTag).filter((name) => name.includes("/publication-journal-final.json--")).find((name) => { try { return !journalDigest || digestDocument(JSON.parse(candidate.download(candidateTag, name).toString("utf8"))) === journalDigest; } catch { return false; } });
        if (!journalName) throw new Error("Persisted publication journal evidence is required.");
        const journal = JSON.parse(candidate.download(candidateTag, journalName).toString("utf8"));
        if (journalDigest && digestDocument(journal) !== journalDigest) throw new Error("Publication journal digest does not match finalization inputs.");
        const verificationDigest = args.includes("--registry-verification-digest") ? option("--registry-verification-digest") : null;
        const verificationName = candidate.list(candidateTag).filter((name) => name.includes("/registry-verification.json--")).find((name) => { try { return !verificationDigest || digestDocument(JSON.parse(candidate.download(candidateTag, name).toString("utf8"))) === verificationDigest; } catch { return false; } });
        if (!verificationName) throw new Error("Persisted registry verification evidence is required.");
        const verification = JSON.parse(candidate.download(candidateTag, verificationName).toString("utf8"));
        if (verificationDigest && digestDocument(verification) !== verificationDigest) throw new Error("Registry verification digest does not match finalization inputs.");
        finalizeRelease({ adapter: createGithubReleaseFinalizerAdapter({ repository }), candidateReleaseId, releaseSet, mainSha: option("--main-sha"), sealedStateDigest: option("--sealed-state-digest"), admission: jsonAsset("main-admission.json"), bdd: jsonAsset("tarball-bdd.json"), journal, registryVerification: verification, version: option("--version"), finalTag: option("--final-tag") }).then(() => {}).catch((error) => { console.error(`[release-finalizer] ${error.message}`); process.exitCode = 1; });
    } catch (error) { console.error(`[release-finalizer] ${error.message}`); process.exitCode = 1; }
}
