"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const script = require("../release-tarball-bdd.js");

test("tarball BDD preparation exposes the immutable-root contract", (t) => {
    const source = fs.readFileSync(path.join(__dirname, "..", "release-tarball-bdd.js"), "utf8");
    t.is(script.ROOT_ENV, "SCRAMJET_TARBALL_BDD_ROOT");
    t.true(source.includes("verifyBundle"));
    t.true(source.includes('"--offline"'));
    t.true(source.includes('"--install-links"'));
    t.true(source.includes("file:tarballs/"));
    t.true(source.includes("relative(modules, dir)"));
});

test("downloaded release assets must be exactly manifest plus checksums and 37 tarballs", (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "tarball-bdd-assets-"));
    t.teardown(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify({ tarballs: [] }));
    fs.writeFileSync(path.join(root, "SHA256SUMS"), "");
    t.throws(() => script.assertRoot(root), { message: /exactly the 37/ });
});

function response(value) {
    return {
        async json() { return value; },
        async arrayBuffer() { return Buffer.from(value); }
    };
}

test("draft downloader lists by release ID and downloads by asset ID into a clean directory", async (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "tarball-bdd-download-"));
    fs.writeFileSync(path.join(root, "stale.txt"), "stale");
    t.teardown(() => fs.rmSync(root, { recursive: true, force: true }));
    const assets = [{ id: 1, name: "manifest.json" }, { id: 2, name: "SHA256SUMS" }, ...Array.from({ length: 37 }, (_, i) => ({ id: i + 3, name: `package-${i}.tgz` }))];
    const urls = [];
    await t.throwsAsync(script.downloadDraftRelease({ repository: "scramjetorg/transform-hub", releaseId: 396988308, outputDir: root, token: "test-token", request: async (url) => {
        urls.push(url);
        if (url.includes("/assets?")) return response(assets);
        if (url.endsWith("/1")) return response(JSON.stringify({ tarballs: [] }));
        return response("");
    } }), { message: /exactly the 37/ });
    t.false(fs.existsSync(path.join(root, "stale.txt")));
    t.is(urls[0], "https://api.github.com/repos/scramjetorg/transform-hub/releases/396988308/assets?per_page=100&page=1");
    t.is(urls[1], "https://api.github.com/repos/scramjetorg/transform-hub/releases/assets/1");
});

for (const [label, assets, message] of [
    ["missing manifest", Array.from({ length: 37 }, (_, i) => ({ id: i + 1, name: `package-${i}.tgz` })), /must contain manifest.json and SHA256SUMS/],
    ["unsafe names", [{ id: 1, name: "../manifest.json" }], /Unsafe draft release asset/],
    ["duplicate names", [{ id: 1, name: "manifest.json" }, { id: 2, name: "manifest.json" }], /Duplicate draft release asset/],
    ["unexpected names", [{ id: 1, name: "release.zip" }], /Unexpected draft release asset/]
]) {
    test(`draft downloader rejects ${label}`, async (t) => {
        await t.throwsAsync(script.downloadDraftRelease({ repository: "scramjetorg/transform-hub", releaseId: 396988308, outputDir: fs.mkdtempSync(path.join(os.tmpdir(), "tarball-bdd-download-reject-")), token: "test-token", request: async () => response(assets) }), { message });
    });
}

test("Docker tarball mode mounts immutable packages and writable BDD fixtures", (t) => {
    const source = fs.readFileSync(path.join(__dirname, "..", "run-bdd-docker.js"), "utf8");
    t.true(source.includes("${tarballRoot}:/work:ro"));
    t.true(source.includes("fs.cpSync(path.join(repoRoot, \"bdd\"), bddHarnessDir, { recursive: true })"));
    t.true(source.includes("fs.symlinkSync(\"/work/node_modules/@scramjet\", path.join(bddNodeModulesDir, \"@scramjet\"), \"dir\")"));
    t.true(source.includes("${bddNodeModulesDir}:/repo/bdd/node_modules:ro"));
    t.true(source.includes("${bddHarnessDir}:/repo/bdd"));
    t.true(source.includes("SCRAMJET_SPAWN_JS=", "source JS override is cleared"));
    t.true(source.includes("SCRAMJET_SPAWN_TS="));
    t.true(source.includes("NODE_PATH="));
    t.true(source.includes("SCRAMJET_TARBALL_BDD_ROOT=/work"));
    t.true(source.includes('name === "PACKAGES_DIR"'));
    t.true(source.includes("inner command supplies only runner-prepared writable fixture paths"));
});

test("published artifact resolver has strict tarball root and CLI completion paths", (t) => {
    const source = fs.readFileSync(path.join(__dirname, "..", "..", "bdd", "lib", "published-artifacts.ts"), "utf8");
    const hostUtils = fs.readFileSync(path.join(__dirname, "..", "..", "bdd", "lib", "host-utils.ts"), "utf8");
    t.true(source.includes('const TARBALL_ROOT_ENV = "SCRAMJET_TARBALL_BDD_ROOT"'));
    t.true(source.includes("resolveTarballModule"));
    t.true(source.includes("resolveBddCliArtifact"));
    t.true(source.includes('resolvePublishedBin("@scramjet/cli", "si"'));
    t.true(source.includes("NODE_PATH"));
    t.true(hostUtils.includes('process.env.SCRAMJET_TARBALL_BDD_ROOT'));
    t.true(hostUtils.includes('resolvePublishedBin("@scramjet/sth", "scramjet-transform-hub")'));
});
