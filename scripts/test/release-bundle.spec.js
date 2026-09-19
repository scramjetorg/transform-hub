"use strict";

const test = require("ava").default;
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { buildAndPack, verifyBundle } = require("../release-bundle");
const { inspectTarball, inspectTarballs } = require("../lib/release-bundle-inspection");
const { candidateIdentity, claimCandidate } = require("../lib/release-bundle-state");
const { digestDocument } = require("../release-contract");
const fixtureIdentity = require("./fixtures/release-bundle/candidate-identity.json");

const boundary = new Set(["@scramjet/a", "@scramjet/b"]);
const waves = [["@scramjet/a"], ["@scramjet/b"]];
const identity = fixtureIdentity;

function archive(root, name, packageJson, extra = (dir) => {}) {
    const source = join(root, `${name}-source`);
    mkdirSync(join(source, "package"), { recursive: true });
    writeFileSync(join(source, "package", "package.json"), JSON.stringify(packageJson));
    writeFileSync(join(source, "package", "index.js"), "module.exports = true;\n");
    extra(source);
    const file = join(root, `${name}.tgz`);
    execFileSync("tar", ["-czf", file, "package"], { cwd: source });
    return file;
}

function releaseSet(lockfile, candidate = identity, candidateBoundary = boundary, candidateWaves = waves) {
    const lockDigest = `sha256:${createHash("sha256").update(lockfile).digest("hex")}`;
    return { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: candidate.sourceSha, tree: candidate.sourceTree }, lockfile: { path: "package-lock.json", sha256: lockDigest }, toolchain: { node: process.version, npm: "fixture" }, build: { identity: candidate.buildIdentity }, boundary: { packages: [...candidateBoundary] }, waves: candidateWaves, artifacts: { tarballs: [], images: [] }, canonical: { schema: "release-set.v1", version: 1 } };
}

function identityForLockfile(lockfile, candidate = identity) {
    return { ...candidate, lockfileDigest: `sha256:${createHash("sha256").update(lockfile).digest("hex")}` };
}
function bddSupportFixture(root) {
    const source = join(root, "bdd-support-source.js");
    const bytes = Buffer.from("compiled bdd support\n");
    writeFileSync(source, bytes);
    const hash = createHash("sha256").update(bytes);
    return { source, path: "bdd-support/runner-container-cleanup.js", size: bytes.length, sha256: `sha256:${hash.copy().digest("hex")}`, sri: `sha256-${hash.digest("base64")}` };
}

test("build, seal, verify, and reuse packs every package once", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-bundle-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const lockfile = Buffer.from("lockfile fixture\n");
    writeFileSync(join(root, "package-lock.json"), lockfile);
    const a = archive(root, "a", { name: "@scramjet/a", version: "1.0.0" });
    const b = archive(root, "b", { name: "@scramjet/b", version: "1.0.0", dependencies: { "@scramjet/a": "1.0.0" } });
    const bundleDir = join(root, "bundle");
    const stateFile = join(root, "candidate.json");
    const buildIdentity = identityForLockfile(lockfile);
    let builds = 0;
    let packs = 0;
    const events = [];
    const packageDirs = [];
    const args = { root, bundleDir, stateFile, identity: buildIdentity, boundary, waves, releaseSet: releaseSet(lockfile, buildIdentity), lockfile, builder: () => { builds++; events.push("build"); }, bddBuilder: () => bddSupportFixture(root), packer: ({ packageDir }) => { packs++; events.push("pack"); packageDirs.push(packageDir); return packageDir.endsWith("/a") ? a : b; } };
    const created = buildAndPack(args);
    t.is(created.status, "created");
    t.is(builds, 1);
    t.is(packs, 2);
    t.deepEqual(events, ["build", "pack", "pack"]);
    t.deepEqual(packageDirs, [join(root, "dist", "a"), join(root, "dist", "b")]);
    t.deepEqual(verifyBundle(bundleDir).releaseSet.boundary.packages, [...boundary]);
    const reused = buildAndPack(args);
    t.is(reused.status, "reused");
    t.is(builds, 1);
    t.is(packs, 2);
});

test("inspection rejects traversal, symlink, mismatched metadata, wrong wave, and duplicates", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-inspect-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const good = archive(root, "good", { name: "@scramjet/a", version: "1.0.0" });
    t.notThrows(() => inspectTarball({ file: good, packageName: "@scramjet/a", wave: 0, waveByPackage: new Map([["@scramjet/a", 0], ["@scramjet/b", 1]]), boundary, runner: undefined }));
    const symlink = archive(root, "symlink", { name: "@scramjet/a" }, (dir) => { writeFileSync(join(dir, "package", "target"), "x"); execFileSync("ln", ["-s", "target", join(dir, "package", "link")]); });
    t.throws(() => inspectTarball({ file: symlink, packageName: "@scramjet/a", wave: 0, waveByPackage: new Map([["@scramjet/a", 0]]), boundary }), { message: /symlink/ });
    t.throws(() => inspectTarball({ file: good, packageName: "@scramjet/b", wave: 1, waveByPackage: new Map([["@scramjet/a", 1], ["@scramjet/b", 1]]), boundary }), { message: /mismatch/ });
    t.throws(() => inspectTarballs({ artifacts: [{ name: "@scramjet/a", file: good }, { name: "@scramjet/a", file: good }], boundary, waves }), { message: /Duplicate/ });
    const dependent = archive(root, "dependent", { name: "@scramjet/b", dependencies: { "@scramjet/a": "1.0.0" } });
    t.throws(() => inspectTarball({ file: dependent, packageName: "@scramjet/b", wave: 1, waveByPackage: new Map([["@scramjet/a", 1], ["@scramjet/b", 1]]), boundary }), { message: /earlier wave/ });
    const incomplete = archive(root, "incomplete", { name: "@scramjet/a" }, (dir) => { rmSync(join(dir, "package", "package.json")); });
    t.throws(() => inspectTarball({ file: incomplete, packageName: "@scramjet/a", wave: 0, waveByPackage: new Map([["@scramjet/a", 0]]), boundary }));
    t.throws(() => inspectTarball({ file: good, packageName: "@scramjet/a", wave: 0, waveByPackage: new Map([["@scramjet/a", 0]]), boundary, runner: (command, args) => args[0] === "-tvzf" ? "-rw-r--r-- user/group 0 2026-01-01 00:00 package/../outside\n" : "{}" }), { message: /forbidden|non-canonical|traversal/ });
});

test("conflicting and interrupted state claims fail closed", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-state-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const file = join(root, "state.json");
    t.is(claimCandidate(file, identity).status, "claimed");
    t.throws(() => claimCandidate(file, { ...identity, configRevision: "other" }), { message: /Conflicting/ });
    t.throws(() => claimCandidate(file, identity), { message: /interrupted/ });
});

test("sealed reuse rejects a self-consistent bundle for a different candidate", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-reuse-mismatch-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const lockfile = Buffer.from("lockfile fixture\n");
    writeFileSync(join(root, "package-lock.json"), lockfile);
    const a = archive(root, "a", { name: "@scramjet/a", version: "1.0.0" });
    const bundleDir = join(root, "bundle");
    const stateFile = join(root, "candidate.json");
    const buildIdentity = identityForLockfile(lockfile);
    buildAndPack({ root, bundleDir, stateFile, identity: buildIdentity, boundary: new Set(["@scramjet/a"]), waves: [["@scramjet/a"]], releaseSet: { ...releaseSet(lockfile, buildIdentity), boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]] }, lockfile, builder: () => {}, bddBuilder: () => bddSupportFixture(root), packer: () => a });
    const alternateIdentity = { ...buildIdentity, sourceTree: `sha256:${"f".repeat(64)}`, buildIdentity: `sha256:${"f".repeat(64)}` };
    const alternateBundle = join(root, "alternate-bundle");
    buildAndPack({ root, bundleDir: alternateBundle, stateFile: join(root, "alternate-state.json"), identity: alternateIdentity, boundary: new Set(["@scramjet/a"]), waves: [["@scramjet/a"]], releaseSet: releaseSet(lockfile, alternateIdentity, new Set(["@scramjet/a"]), [["@scramjet/a"]]), lockfile, builder: () => {}, bddBuilder: () => bddSupportFixture(root), packer: () => a });
    for (const file of ["release-set.json", "build-provenance.json", "package-lock.json"]) copyFileSync(join(alternateBundle, file), join(bundleDir, file));
    copyFileSync(join(alternateBundle, "artifacts", "a.tgz"), join(bundleDir, "artifacts", "a.tgz"));
    t.throws(() => buildAndPack({ root, bundleDir, stateFile, identity: buildIdentity, boundary: new Set(["@scramjet/a"]), waves: [["@scramjet/a"]], releaseSet: releaseSet(lockfile, buildIdentity), lockfile, builder: () => t.fail(), packer: () => a }), { message: /manifest identity|provenance|digest/i });
});
