"use strict";

const test = require("ava").default;
const { execFileSync, spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { INCLUDED_PACKAGES, RELEASE_WAVES, validateReleaseWaves } = require("../lib/release-boundary.js");
const { bundleChecksum, createRelease, fileSha256, publishBundle, publishedReuse, releasePackageChecksum, validateAssetList, verifyBundle, verifyRelease } = require("../release-main.js");

const SHA = "a".repeat(40);
const ENVIRONMENT = { ACTIONS_ID_TOKEN_REQUEST_TOKEN: "token", ACTIONS_ID_TOKEN_REQUEST_URL: "url", MAIN_RELEASE_PUBLISH_ENABLED: "true" };
const SUBSET_BOUNDARY = new Set(["@scramjet/a", "@scramjet/b"]);

function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), "immutable-release-"));
    t.teardown(() => rmSync(root, { force: true, recursive: true }));
    for (const name of INCLUDED_PACKAGES) { const directory = join(root, name.replace("@scramjet/", "")); mkdirSync(directory, { recursive: true }); writeFileSync(join(directory, "package.json"), `${JSON.stringify({ name, version: "2.2.0-devel" }, null, 2)}\n`); }
    return root;
}

function sha256(value) {
    return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function writeBundleFiles(bundle, root) {
    writeFileSync(join(root, "manifest.json"), `${JSON.stringify(bundle, null, 2)}\n`);
    const sums = bundle.tarballs.map((item) => `${item.sha256.slice(7)}  ${item.name}`).concat(`${fileSha256(join(root, "manifest.json")).slice(7)}  manifest.json`);
    writeFileSync(join(root, "SHA256SUMS"), `${sums.join("\n")}\n`);
}

function createVerifiedBundle(t) {
    const packagesDir = fixture(t);
    const release = createRelease({ packagesDir, sourceSha: SHA, node: "v22.16.0", npm: "11.19.0", version: "2.2.0" });
    const root = mkdtempSync(join(tmpdir(), "verified-release-bundle-"));
    const tarballsDir = join(root, "tarballs");
    mkdirSync(tarballsDir);
    t.teardown(() => rmSync(root, { force: true, recursive: true }));
    const stages = new Map();
    const tarballs = release.packages.map((entry, index) => {
        const stage = mkdtempSync(join(tmpdir(), "release-tar-stage-"));
        const packageStage = join(stage, "package");
        mkdirSync(packageStage);
        const packageJson = JSON.parse(readFileSync(join(packagesDir, entry.path), "utf8"));
        writeFileSync(join(packageStage, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
        stages.set(entry.name, { stage, packageJson });
        const name = `package-${index}.tgz`;
        const path = join(tarballsDir, name);
        execFileSync("tar", ["-czf", path, "-C", stage, "package"]);
        return { package: entry.name, version: entry.version, packageChecksum: entry.packageChecksum, name, size: statSync(path).size, sha256: fileSha256(path) };
    });
    t.teardown(() => { for (const { stage } of stages.values()) rmSync(stage, { force: true, recursive: true }); });
    const bundle = {
        format: "transform-hub-main-release-v2",
        version: "2.2.0",
        tag: "v2.2.0",
        branch: "release/2.2.0",
        candidate: { head: SHA, tree: "b".repeat(40) },
        repository: "scramjetorg/transform-hub",
        toolchain: release.identity.toolchain,
        source: release.identity.source,
        identity: release.identity,
        identityDigest: release.identityDigest,
        packages: release.packages,
        waves: release.waves,
        tarballs
    };
    bundle.outerChecksum = bundleChecksum(bundle);
    writeBundleFiles(bundle, root);
    return { bundle, packagesDir, root, tarballsDir, stages };
}

test("approved release topology remains 37 packages in 12 waves", (t) => {
    t.is(RELEASE_WAVES.length, 12);
    t.is(validateReleaseWaves(RELEASE_WAVES).size, 37);
});

test("compatible wave validation preserves dependency ordering and boundary rejection", (t) => {
    const manifests = new Map([
        ["@scramjet/a", { packageJson: { name: "@scramjet/a", dependencies: { "@scramjet/b": "2.2.0" } } }],
        ["@scramjet/b", { packageJson: { name: "@scramjet/b" } }]
    ]);
    t.throws(() => validateReleaseWaves([["@scramjet/a", "@scramjet/b"]], { boundary: SUBSET_BOUNDARY, manifests }), { message: /earlier wave/ });
    t.throws(() => validateReleaseWaves([["@scramjet/b"], ["@scramjet/a"], ["@scramjet/a"]], { boundary: SUBSET_BOUNDARY }), { message: /more than once/ });
    t.throws(() => validateReleaseWaves([["@scramjet/b"]], { boundary: SUBSET_BOUNDARY }), { message: /omits boundary package/ });
    t.throws(() => validateReleaseWaves([["@scramjet/b"], ["@scramjet/a", "@scramjet/outside"]], { boundary: SUBSET_BOUNDARY }), { message: /outside the release boundary/ });
});

test("release identity annotates embedded package identity and verifies it", (t) => {
    const packagesDir = fixture(t);
    const release = createRelease({ packagesDir, sourceSha: SHA, node: "v22.16.0", npm: "11.19.0", version: "2.2.0" });
    verifyRelease(release, packagesDir);
    const manifest = JSON.parse(readFileSync(join(packagesDir, "api-types", "package.json"), "utf8"));
    const entry = release.packages.find((item) => item.name === "@scramjet/api-types");
    t.is(manifest.scramjet.release.identityDigest, release.identityDigest);
    t.is(manifest.scramjet.release.packageChecksum, entry.packageChecksum);
    t.is(releasePackageChecksum(manifest), entry.packageChecksum);
    manifest.scramjet.release.packageChecksum = "sha256:" + "0".repeat(64);
    writeFileSync(join(packagesDir, "api-types", "package.json"), JSON.stringify(manifest));
    t.throws(() => verifyRelease(release, packagesDir), { message: /checksum mismatch/ });
});

test("valid bundle verification rejects tampered tarball hashes and embedded package identity", async (t) => {
    const { bundle, root, tarballsDir, stages } = createVerifiedBundle(t);
    await t.notThrowsAsync(() => verifyBundle({ bundle, bundleDir: root, expectedVersion: "2.2.0", expectedBranch: "release/2.2.0", expectedCandidateHead: SHA, expectedCandidateTree: "b".repeat(40), expectedMainTree: "b".repeat(40) }));
    const first = bundle.tarballs[0];
    writeFileSync(join(tarballsDir, first.name), "tampered");
    await t.throwsAsync(() => verifyBundle({ bundle, bundleDir: root }), { message: /Tarball checksum mismatch/ });
    const staged = stages.get(first.package);
    const altered = { ...staged.packageJson, name: "@scramjet/tampered" };
    writeFileSync(join(staged.stage, "package", "package.json"), `${JSON.stringify(altered, null, 2)}\n`);
    execFileSync("tar", ["-czf", join(tarballsDir, first.name), "-C", staged.stage, "package"]);
    first.size = statSync(join(tarballsDir, first.name)).size;
    first.sha256 = fileSha256(join(tarballsDir, first.name));
    bundle.outerChecksum = bundleChecksum(bundle);
    writeBundleFiles(bundle, root);
    await t.throwsAsync(() => verifyBundle({ bundle, bundleDir: root }), { message: /Embedded package identity mismatch/ });
});

test("immutable npm reuse requires exact name, version, identity digest, and package checksum", (t) => {
    const release = { identityDigest: sha256("identity") };
    const entry = { name: "@scramjet/a", version: "2.2.0", packageChecksum: sha256("package") };
    const matching = () => JSON.stringify({ name: entry.name, version: entry.version, scramjet: { release: { identityDigest: release.identityDigest, packageChecksum: entry.packageChecksum } } });
    t.true(publishedReuse(entry, release, () => matching(), {}));
    for (const published of [
        { name: "@scramjet/other", version: entry.version },
        { name: entry.name, version: "2.2.1" },
        { name: entry.name, version: entry.version, scramjet: { release: { identityDigest: sha256("other"), packageChecksum: entry.packageChecksum } } },
        { name: entry.name, version: entry.version, scramjet: { release: { identityDigest: release.identityDigest, packageChecksum: sha256("other") } } }
    ]) {
        t.throws(() => publishedReuse(entry, release, () => JSON.stringify(published), {}), { message: /Immutable production/ });
    }
});

test("bundle publication publishes tarballs directly and sleeps exactly once between each pair of waves", (t) => {
    const calls = []; const sleeps = [];
    const bundle = { identityDigest: "sha256:" + "a".repeat(64), waves: [{ number: 1, packages: ["@scramjet/a"] }, { number: 2, packages: ["@scramjet/b"] }, { number: 3, packages: ["@scramjet/c"] }], packages: [{ name: "@scramjet/a", version: "2.2.0", packageChecksum: "sha256:" + "b".repeat(64) }, { name: "@scramjet/b", version: "2.2.0", packageChecksum: "sha256:" + "c".repeat(64) }, { name: "@scramjet/c", version: "2.2.0", packageChecksum: "sha256:" + "d".repeat(64) }], tarballs: [{ package: "@scramjet/a", name: "a.tgz" }, { package: "@scramjet/b", name: "b.tgz" }, { package: "@scramjet/c", name: "c.tgz" }] };
    const runner = (_command, args) => { calls.push(args.slice(1)); if (args[1] === "view") throw new Error("E404 not found"); };
    const result = publishBundle({ bundle, bundleDir: "/tmp/bundle", environment: ENVIRONMENT, runner, sleep: (ms) => sleeps.push(ms) });
    t.deepEqual(sleeps, [10000, 10000]);
    t.deepEqual(calls.filter((args) => args[0] === "publish").map((args) => args[1]), ["/tmp/bundle/tarballs/a.tgz", "/tmp/bundle/tarballs/b.tgz", "/tmp/bundle/tarballs/c.tgz"]);
    t.false(calls.some((args) => args[0] === "waitForRegistryVisibility"));
    t.true(result.publication.publicationVerified);
});

test("GitHub asset validation rejects extra and missing release assets", (t) => {
    const bundle = { tarballs: [...INCLUDED_PACKAGES].map((name, index) => ({ package: name, name: `package-${index}.tgz` })) };
    const root = mkdtempSync(join(tmpdir(), "release-assets-"));
    t.teardown(() => rmSync(root, { force: true, recursive: true }));
    const assets = [...bundle.tarballs.map((item) => ({ name: item.name })), { name: "manifest.json" }, { name: "SHA256SUMS" }];
    const assetsRoot = mkdtempSync(join(tmpdir(), "release-assets-json-"));
    t.teardown(() => rmSync(assetsRoot, { force: true, recursive: true }));
    const assetsPath = join(assetsRoot, "assets.json");
    writeFileSync(assetsPath, JSON.stringify(assets));
    mkdirSync(join(root, "tarballs"));
    writeFileSync(join(root, "manifest.json"), "{}");
    writeFileSync(join(root, "SHA256SUMS"), "");
    for (const item of bundle.tarballs) writeFileSync(join(root, "tarballs", item.name), "tarball");
    t.notThrows(() => validateAssetList(bundle, root, assetsPath));
    writeFileSync(join(root, "tarballs", "extra.tgz"), "extra");
    t.throws(() => validateAssetList(bundle, root, assetsPath), { message: /Downloaded release assets/ });
    rmSync(join(root, "tarballs", "extra.tgz"));
    writeFileSync(assetsPath, JSON.stringify([...assets, { name: assets[0].name }]));
    t.throws(() => validateAssetList(bundle, root, assetsPath), { message: /exactly match/ });
    writeFileSync(assetsPath, JSON.stringify([...assets, { name: "unexpected.zip" }]));
    t.throws(() => validateAssetList(bundle, root, assetsPath), { message: /exactly match/ });
    writeFileSync(assetsPath, JSON.stringify(assets.slice(1)));
    t.throws(() => validateAssetList(bundle, root, assetsPath), { message: /exactly match/ });
});

test("bundle verification fails closed when candidate or main tree binding differs", async (t) => {
    const { bundle, root } = createVerifiedBundle(t);
    await t.throwsAsync(() => verifyBundle({ bundle, bundleDir: root, expectedCandidateTree: "c".repeat(40) }), { message: /candidate tree binding/ });
    await t.throwsAsync(() => verifyBundle({ bundle, bundleDir: root, expectedMainTree: "c".repeat(40) }), { message: /resulting main tree/ });
});

test("publish CLI rejects an unverified bundle before invoking npm", (t) => {
    const root = mkdtempSync(join(tmpdir(), "unverified-release-"));
    t.teardown(() => rmSync(root, { force: true, recursive: true }));
    writeFileSync(join(root, "manifest.json"), JSON.stringify({ format: "transform-hub-main-release-v2" }));
    const result = spawnSync(process.execPath, [join(__dirname, "..", "release-main.js"), "publish", "--bundle", root, "--tarballs-dir", root], { encoding: "utf8" });
    t.not(result.status, 0);
    t.regex(result.stderr, /manifest checksum|identity/i);
});
