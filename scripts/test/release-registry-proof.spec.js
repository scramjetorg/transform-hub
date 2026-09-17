"use strict";

const test = require("ava").default;
const { createHash } = require("node:crypto");
const { digestDocument } = require("../release-contract");
const { verifyRegistryProof } = require("../release-registry-proof");
const production = require("../release-production");

const sha = (letter) => letter.repeat(40);
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const sri = (bytes) => `sha256-${createHash("sha256").update(bytes).digest("base64")}`;

function fixture() {
    const bytes = { "@scramjet/a": Buffer.from("a"), "@scramjet/b": Buffer.from("b") };
    const tarballs = Object.entries(bytes).map(([name, value], index) => ({ name, path: `artifacts/${String.fromCharCode(97 + index)}.tgz`, size: value.length, sha256: digest(value), sri: sri(value) }));
    const release = { releaseId: 7, version: "2.0.0", mainSha: sha("a"), sourceSha: sha("c"), releaseSetDigest: `sha256:${"d".repeat(64)}`, sealedStateDigest: `sha256:${"e".repeat(64)}` };
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: release.sourceSha, tree: `sha256:${"1".repeat(64)}` }, lockfile: { path: "package-lock.json", sha256: `sha256:${"2".repeat(64)}` }, toolchain: { node: "node", npm: "npm" }, build: { identity: `sha256:${"3".repeat(64)}` }, boundary: { packages: Object.keys(bytes) }, waves: Object.keys(bytes).map((name) => [name]), artifacts: { tarballs, images: [], bddSupport: { path: "bdd-support/runner-container-cleanup.js", size: 1, sha256: `sha256:${"4".repeat(64)}`, sri: "sha256-BA==" } }, canonical: { schema: "release-set.v1", version: 1 } };
    release.releaseSetDigest = digestDocument(releaseSet);
    const journal = { schema: "publication-journal.v1", status: "final", releaseSetDigest: release.releaseSetDigest, release, events: [] };
    for (const [index, artifact] of tarballs.entries()) { const event = { sequence: index + 1, package: artifact.name, tarballSha256: artifact.sha256, priorDigest: index ? journal.events[index - 1].digest : null }; journal.events.push({ ...event, digest: production.digestDocument(event) }); }
    journal.headDigest = journal.events.at(-1).digest;
    const tarballBddBody = { schema: "tarball-bdd.v1", mainSha: release.mainSha, sourceSha: release.sourceSha, candidateReleaseId: release.releaseId, releaseSetDigest: release.releaseSetDigest, sealedStateDigest: release.sealedStateDigest };
    const tarballBdd = { ...tarballBddBody, digest: digestDocument(tarballBddBody) };
    return { bytes, release, releaseSet, journal, tarballBdd };
}

function fetcher(bytes) { return async (url, { name }) => { if (!url.includes(name.slice(1).replace("/", "%2f"))) throw new Error("bad URL"); return bytes[name]; }; }

test("verifies every final publication tarball and returns a digest-bound envelope", async (t) => {
    const f = fixture();
    const proof = await verifyRegistryProof({ releaseTuple: f.release, ...f, fetchTarball: fetcher(f.bytes) });
    t.is(proof.schema, "registry-proof.v1");
    t.is(proof.packages.length, 2);
    t.true(proof.digest.startsWith("sha256:"));
    const { digest, ...body } = proof;
    t.is(digest, digestDocument(body));
});

for (const [label, mutate, pattern] of [
    ["non-final journal", (f) => { f.journal.status = "pending"; }, /final/],
    ["BDD mismatch", (f) => { f.tarballBdd.candidateReleaseId++; }, /binding/],
    ["missing package", (f) => { f.journal.events.pop(); }, /head digest|incomplete|missing|extra/],
    ["registry bytes mismatch", (f) => { f.bytes["@scramjet/a"] = Buffer.from("changed"); }, /SHA-256|SRI/],
    ["publishing request", (f) => { f.command = "npm publish"; }, /publishing/],
]) test(`rejects ${label}`, async (t) => {
    const f = fixture();
    mutate(f);
    await t.throwsAsync(verifyRegistryProof({ releaseTuple: f.release, ...f, fetchTarball: fetcher(f.bytes) }), { message: pattern });
});
