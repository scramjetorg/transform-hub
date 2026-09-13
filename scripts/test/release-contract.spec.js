"use strict";

const test = require("ava").default;
const { createHash } = require("node:crypto");
const { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const fixture = require("./fixtures/release-contract/release-set.json");
const remotePolicy = require("../release-contract/remote-feasibility.json");
const contract = require("../release-contract");

const authority = { repository: "scramjetorg/transform-hub", releaseId: 31, releaseSetDigest: `sha256:${"a".repeat(64)}` };

test("canonical schema identity and document digests are stable", (t) => {
    t.is(contract.canonicalize({ z: 1, a: [true, null] }), '{"a":[true,null],"z":1}');
    t.is(contract.digestDocument({ b: 2, a: 1 }), contract.digestDocument({ a: 1, b: 2 }));
    t.notThrows(() => contract.validateReleaseSet(fixture));
    t.is(contract.SCHEMAS.releaseSet.properties.schema.const, "release-set.v1");
});

test("boundary and waves must partition the exact release boundary", (t) => {
    t.notThrows(() => contract.validateReleaseBoundary(fixture.boundary, fixture.waves));
    t.throws(() => contract.validateReleaseBoundary(fixture.boundary, [["@scramjet/a"], ["@scramjet/a"]]), { message: /duplicate/ });
    t.throws(() => contract.validateReleaseBoundary(fixture.boundary, [["@scramjet/a"]]), { message: /cover/ });
    t.throws(() => contract.validateReleaseBoundary(fixture.boundary, [["@scramjet/c"], ["@scramjet/a"]]), { message: /outside/ });
});

test("artifact metadata rejects traversal, duplicate paths, bad hashes, SRI, and missing content", (t) => {
    for (const badPath of ["../a.tgz", "/tmp/a.tgz", "a//b.tgz", "./a.tgz"]) t.throws(() => contract.safeRelativePath(badPath));
    const duplicate = structuredClone(fixture);
    duplicate.artifacts.tarballs[1].path = duplicate.artifacts.tarballs[0].path;
    t.throws(() => contract.validateReleaseSet(duplicate), { message: /Duplicate artifact path/ });
    const badHash = structuredClone(fixture);
    badHash.artifacts.tarballs[0].sha256 = "not-a-digest";
    t.throws(() => contract.validateReleaseSet(badHash), { message: /SHA-256/ });
    const root = mkdtempSync(path.join(tmpdir(), "release-contract-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(path.join(root, "artifacts"));
    writeFileSync(path.join(root, "artifacts", "a.tgz"), "content");
    const content = Buffer.from("content");
    const artifact = { path: "artifacts/a.tgz", size: content.length, sha256: `sha256:${createHash("sha256").update(content).digest("hex")}`, sri: `sha256-${createHash("sha256").update(content).digest("base64")}` };
    t.notThrows(() => contract.validateArtifactContent(root, artifact));
    symlinkSync("a.tgz", path.join(root, "artifacts", "link.tgz"));
    t.throws(() => contract.validateArtifactPath(root, "artifacts/link.tgz"), { message: /symlink/ });
    t.throws(() => contract.validateArtifactPath(root, "artifacts/missing.tgz"), { message: /missing/ });
});

test("tarballs cover the release boundary exactly once with complete metadata", (t) => {
    const missing = structuredClone(fixture);
    missing.artifacts.tarballs = [missing.artifacts.tarballs[0]];
    t.throws(() => contract.validateReleaseSet(missing), { message: /cover the boundary exactly once/ });

    const extra = structuredClone(fixture);
    extra.artifacts.tarballs.push({ ...extra.artifacts.tarballs[0], name: "@scramjet/c", path: "artifacts/c.tgz" });
    t.throws(() => contract.validateReleaseSet(extra), { message: /cover the boundary exactly once/ });

    const duplicatePackage = structuredClone(fixture);
    duplicatePackage.artifacts.tarballs[1].name = "@scramjet/a";
    t.throws(() => contract.validateReleaseSet(duplicatePackage), { message: /Duplicate tarball package/ });

    for (const field of ["name", "path", "size", "sha256", "sri"]) {
        const incomplete = structuredClone(fixture);
        delete incomplete.artifacts.tarballs[0][field];
        t.throws(() => contract.validateReleaseSet(incomplete));
    }
    const empty = structuredClone(fixture);
    empty.artifacts.tarballs = [];
    t.throws(() => contract.validateReleaseSet(empty), { message: /non-empty/ });
    const zeroSize = structuredClone(fixture);
    zeroSize.artifacts.tarballs[0].size = 0;
    t.throws(() => contract.validateReleaseSet(zeroSize), { message: /positive/ });
});

test("candidate authority is a repository, numeric draft release, and signed digest", (t) => {
    t.deepEqual(contract.candidateAuthority(authority), authority);
    t.throws(() => contract.candidateAuthority({ ...authority, tag: "v2.0.0" }), { message: /tag/ });
    t.throws(() => contract.candidateAuthority({ ...authority, releaseId: "31" }), { message: /releaseId/ });
    t.throws(() => contract.candidateAuthority({ ...authority, repository: "attacker/repo" }), { message: /repository/ });
});

test("remote trust policy remains fail-closed until configuration is confirmed", (t) => {
    t.is(remotePolicy.remote.branches.devel.requiredChecks, 0);
    t.is(remotePolicy.remote.assetRetention.days, 31);
    t.throws(() => contract.assertTrustPolicy(remotePolicy, authority), { message: /not confirmed/ });
    const confirmed = structuredClone(remotePolicy);
    confirmed.remote.status = "confirmed";
    confirmed.remote.environmentAdminBypass = false;
    t.notThrows(() => contract.assertTrustPolicy(confirmed, authority));
});
