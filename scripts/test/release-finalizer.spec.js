"use strict";
const test = require("ava").default;
const { createHash } = require("node:crypto");
const { digestDocument } = require("../release-contract");
const { finalizeRelease } = require("../release-finalizer");

const sha = (letter) => letter.repeat(40);
const digest = (letter) => `sha256:${letter.repeat(64)}`;
const bytesDigest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const sri = (bytes) => `sha256-${createHash("sha256").update(bytes).digest("base64")}`;

function fixture() {
    const bytes = Buffer.from("tarball");
    const artifact = { name: "@scramjet/a", path: "artifacts/a.tgz", size: bytes.length, sha256: bytesDigest(bytes), sri: sri(bytes) };
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: sha("c"), tree: digest("a") }, lockfile: { path: "package-lock.json", sha256: digest("b") }, toolchain: { node: "node", npm: "npm" }, build: { identity: digest("c") }, boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]], artifacts: { tarballs: [artifact], images: [], bddSupport: { path: "bdd-support/runner-container-cleanup.js", size: 1, sha256: digest("d"), sri: "sha256-BA==" } }, canonical: { schema: "release-set.v1", version: 1 } };
    const tuple = { mainSha: sha("a"), candidateReleaseId: 7, releaseSetDigest: digestDocument(releaseSet), sealedStateDigest: digest("e") };
    const admissionBody = { schema: "main-admission.v1", mainSha: tuple.mainSha, parents: [sha("b"), sha("c")], mainTree: digest("f"), secondParentTree: digest("f"), candidate: { sourceSha: sha("c"), releaseId: 7, releaseSetDigest: tuple.releaseSetDigest, sealedStateDigest: tuple.sealedStateDigest }, releaseSetDigest: tuple.releaseSetDigest, sealedStateDigest: tuple.sealedStateDigest };
    const admission = { ...admissionBody, digest: digestDocument(admissionBody) };
    const bddBody = { schema: "tarball-bdd.v1", ...tuple, sourceSha: sha("c"), bytes: "ok" }; const bdd = { ...bddBody, digest: digestDocument(bddBody) };
    const journal = { schema: "publication-journal.v1", releaseSetDigest: tuple.releaseSetDigest, release: { releaseId: 7, version: "1.0.0", sourceSha: sha("c"), releaseSetDigest: tuple.releaseSetDigest, sealedStateDigest: tuple.sealedStateDigest }, events: [{ sequence: 1, package: "@scramjet/a", tarballSha256: artifact.sha256, priorDigest: null }] };
    journal.events[0].digest = digestDocument(journal.events[0]); journal.headDigest = journal.events[0].digest;
    const proofBody = { schema: "registry-proof.v1", ...tuple, packages: [] }; const registryProof = { ...proofBody, digest: digestDocument(proofBody) };
    const assets = new Map([["release-set.json", Buffer.from(JSON.stringify(releaseSet))], ["artifacts/a.tgz", bytes]]); let published = 0;
    const adapter = { reservation: () => ({ releaseId: 99, finalTag: "v1.0.0", reused: true }), list: () => [...assets.keys()], download: (_id, name) => Buffer.from(assets.get(name)), append: (_id, name, value) => { if (assets.has(name)) throw new Error("already exists"); assets.set(name, Buffer.from(value)); }, publish: () => { published++; } };
    return { releaseSet, tuple, admission, bdd, journal, registryProof, adapter, bytes, get published() { return published; } };
}

function args(f, patch = {}) { return { adapter: f.adapter, candidateReleaseId: 7, releaseSet: f.releaseSet, mainSha: f.tuple.mainSha, sealedStateDigest: f.tuple.sealedStateDigest, admission: f.admission, bdd: f.bdd, journal: f.journal, registryProof: f.registryProof, version: "1.0.0", finalTag: "v1.0.0", ...patch }; }

test("rejects a conflicting reservation", async (t) => { const f = fixture(); f.adapter.reservation = () => { throw new Error("reservation conflicts"); }; await t.throwsAsync(finalizeRelease(args(f)), { message: /conflicts/ }); t.is(f.published, 0); });
test("resumes a partial copy without replacing assets", async (t) => { const f = fixture(); const result = await finalizeRelease(args(f)); t.is(result.state.status, "published"); t.is(f.published, 1); });
test("rejects candidate digest mismatch and does not publish", async (t) => { const f = fixture(); f.adapter.download = () => Buffer.from("wrong"); await t.throwsAsync(finalizeRelease(args(f)), { message: /digest mismatch/ }); t.is(f.published, 0); });
test("does not publish when prerequisite evidence is invalid", async (t) => { const f = fixture(); f.registryProof = { ...f.registryProof, digest: digest("9") }; await t.throwsAsync(finalizeRelease(args(f)), { message: /digest/ }); t.is(f.published, 0); });
