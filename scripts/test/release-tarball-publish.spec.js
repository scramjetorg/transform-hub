"use strict";

const test = require("ava").default;
const { createHash } = require("node:crypto");
const { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const tar = require("tar");

const { publishTarballs } = require("../release-tarball-publish");

const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), "release-publisher-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "artifacts"));
    const artifacts = [];
    for (const [name, version] of [["@scramjet/a", "1.2.3"], ["@scramjet/b", "1.2.3"]]) {
        const short = name.slice("@scramjet/".length);
        const source = join(root, short);
        mkdirSync(join(source, "package"), { recursive: true });
        writeFileSync(join(source, "package", "package.json"), JSON.stringify({ name, version }));
        const file = join(root, "artifacts", `${short}.tgz`);
        tar.c({ cwd: source, gzip: true, file, sync: true }, ["package"]);
        const bytes = readFileSync(file);
        artifacts.push({ name, path: `artifacts/${short}.tgz`, size: bytes.length, sha256: digest(bytes), sri: `sha256-${createHash("sha256").update(bytes).digest("base64")}`, bytes, file });
    }
    const support = Buffer.from("support");
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: "a".repeat(40), tree: digest("tree") }, lockfile: { path: "package-lock.json", sha256: digest("lock") }, boundary: { packages: artifacts.map((a) => a.name) }, waves: [["@scramjet/a"], ["@scramjet/b"]], artifacts: { tarballs: artifacts.map(({ bytes, file, ...artifact }) => artifact), images: [], bddSupport: { path: "bdd-support/runner-container-cleanup.js", size: support.length, sha256: digest(support), sri: `sha256-${createHash("sha256").update(support).digest("base64")}` } }, canonical: { schema: "release-set.v1", version: 1 } };
    writeFileSync(join(root, "package-lock.json"), "lock");
    mkdirSync(join(root, "bdd-support"));
    writeFileSync(join(root, "bdd-support", "runner-container-cleanup.js"), support);
    return { root, releaseSet, artifacts };
}

test("publishes verified tarballs in serial dependency waves and journals registry proofs", async (t) => {
    const { root, releaseSet, artifacts } = fixture(t);
    const calls = [];
    const npm = (_command, args) => calls.push(args);
    const downloaded = new Map();
    const journal = await publishTarballs({ root, releaseSet, tarballPaths: artifacts.map((a) => a.file), release: { releaseId: 7, sealedStateDigest: digest("seal") }, npmRunner: npm, registryDownloader: async ({ name }) => { const artifact = artifacts.find((a) => a.name === name); const count = downloaded.get(name) || 0; downloaded.set(name, count + 1); calls.push(`download:${name}`); return count === 0 ? null : artifact.bytes; }, registry: "https://registry.example.test" });
    t.deepEqual(calls, ["download:@scramjet/a", "download:@scramjet/b", ["publish", artifacts[0].file, "--ignore-scripts", "--provenance", "--access", "public", "--tag", "latest", "--registry", "https://registry.example.test"], ["publish", artifacts[1].file, "--ignore-scripts", "--provenance", "--access", "public", "--tag", "latest", "--registry", "https://registry.example.test"]]);
    t.deepEqual(journal.events.map((event) => [event.package, event.action]), [["@scramjet/a", "published"], ["@scramjet/b", "published"]]);
});

test("reuses only byte-identical latest tarballs and rejects mismatches, directories, and candidate tags", async (t) => {
    const { root, releaseSet, artifacts } = fixture(t);
    const npmCalls = [];
    const journal = await publishTarballs({ root, releaseSet, tarballPaths: artifacts.map((a) => a.file), release: { releaseId: 8, sealedStateDigest: digest("seal") }, npmRunner: (_command, args) => npmCalls.push(args), registryDownloader: async ({ name }) => artifacts.find((a) => a.name === name).bytes, registry: "https://registry.example.test" });
    t.deepEqual(journal.events.map((event) => event.action), ["reused", "reused"]);
    t.is(npmCalls.length, 0);
    await t.throwsAsync(() => publishTarballs({ root, releaseSet, tarballPaths: artifacts.map((a) => a.file), release: { releaseId: 8, sealedStateDigest: digest("seal") }, registryDownloader: async ({ name }) => Buffer.from(name), registry: "https://registry.example.test" }), { message: /does not match/ });
    mkdirSync(join(root, "artifacts", "directory.tgz"));
    await t.throwsAsync(() => publishTarballs({ root, releaseSet, tarballPaths: [join(root, "artifacts", "directory.tgz"), artifacts[1].file], release: { releaseId: 8, sealedStateDigest: digest("seal") }, registryDownloader: async () => null }), { message: /regular file|listed/ });
    await t.throwsAsync(() => publishTarballs({ root, releaseSet, tarballPaths: artifacts.map((a) => a.file), release: { releaseId: 8, sealedStateDigest: digest("seal"), tag: "candidate" }, registryDownloader: async () => null }), { message: /latest/ });
});

test("calls the injected callback with each immutable cumulative journal snapshot", async (t) => {
    const { root, releaseSet, artifacts } = fixture(t);
    const snapshots = [];
    await publishTarballs({ root, releaseSet, tarballPaths: artifacts.map((a) => a.file), release: { releaseId: 9, sealedStateDigest: digest("seal") }, npmRunner: () => {}, registryDownloader: async ({ name }) => artifacts.find((a) => a.name === name).bytes, registry: "https://registry.example.test", onJournalSnapshot: async (snapshot) => snapshots.push(snapshot) });
    t.is(snapshots.length, 2);
    t.deepEqual(snapshots.map((snapshot) => snapshot.events.length), [1, 2]);
    t.is(snapshots[0].headDigest, snapshots[0].events[0].digest);
    t.is(snapshots[1].events[0].digest, snapshots[0].events[0].digest);
    t.true(Object.isFrozen(snapshots[0]));
    t.true(Object.isFrozen(snapshots[0].events[0]));
});
