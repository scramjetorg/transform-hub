"use strict";

const test = require("ava").default;
const { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join, resolve } = require("node:path");
const tar = require("tar");
const simple = require("../release-simple");
const { INCLUDED_PACKAGES, RELEASE_WAVES } = require("../lib/release-boundary");

const sha = "a".repeat(40);
const env = { ACTIONS_ID_TOKEN_REQUEST_URL: "url", ACTIONS_ID_TOKEN_REQUEST_TOKEN: "token" };
function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), "simple-release-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const packages = join(root, "packages"); mkdirSync(packages);
    const assets = [];
    for (const name of INCLUDED_PACKAGES) { const source = join(packages, `source-${name.replace("@scramjet/", "")}`); mkdirSync(join(source, "package"), { recursive: true }); writeFileSync(join(source, "package", "package.json"), JSON.stringify({ name, version: "2.1.0" })); const file = join(packages, `${name.replace("@scramjet/", "")}.tgz`); tar.c({ cwd: source, gzip: true, file, sync: true }, ["package"]); assets.push({ name, file }); }
    return { root, packages, assets };
}

test("eligibility requires canonical devel greater than main and no open PRs", (t) => {
    t.deepEqual(simple.assertDevelEligibility({ developmentVersion: "2.1.0-devel", mainVersion: "2.0.0", openReleasePrs: [] }).releaseVersion, "2.1.0");
    for (const options of [{ developmentVersion: "2.1.0-rc.1", mainVersion: "2.0.0", openReleasePrs: [] }, { developmentVersion: "2.0.0-devel", mainVersion: "2.0.0", openReleasePrs: [] }, { developmentVersion: "2.1.0-devel", mainVersion: "2.0.0", openReleasePrs: [1] }]) t.throws(() => simple.assertDevelEligibility(options));
});

test("CLI contract accepts workflow commands and both eligibility aliases", (t) => {
    t.is(simple.parseCliArguments(["assert-eligible", "--head-version", "2.1.0-devel", "--main-version", "2.0.0", "--open-release-prs", "0"]).command, "assert-eligible");
    t.is(simple.parseCliArguments(["eligibility", "--development-version=2.1.0-devel", "--main-version=2.0.0"]).command, "assert-eligible");
    t.is(simple.parseCliArguments(["pack", "--stable-version", "2.1.0", "--source-sha", sha, "--packages-dir", "/tmp/assets", "--output", "/tmp/manifest.json"]).packagesDir, "/tmp/assets");
    t.is(simple.parseCliArguments(["verify", "--manifest", "/tmp/manifest.json", "--source-sha", sha, "--version", "2.1.0"]).version, "2.1.0");
    t.is(simple.parseCliArguments(["publish", "--manifest", "/tmp/manifest.json", "--assets-dir", "/tmp/assets"]).command, "publish");
    t.is(simple.parseCliArguments(["verify-registry", "--manifest", "/tmp/manifest.json", "--source-sha", sha, "--version", "2.1.0"]).command, "verify-registry");
    t.is(simple.parseCliArguments(["promote", "--context", "release-start", "--development-version", "2.1.0-devel", "--stable-version", "2.1.0"]).context, "release-start");
});

test("promotion requires the named supported context", (t) => {
    t.throws(() => simple.promote({ developmentVersion: "2.1.1-devel", stableVersion: "2.1.1" }), { message: /context/ });
    t.throws(() => simple.promote({ context: "unknown", developmentVersion: "2.1.1-devel", stableVersion: "2.1.1" }), { message: /context/ });
});

test("release-start promotes the planned boundary and preserves unrelated devel workflow text", (t) => {
    const sourceRoot = resolve(__dirname, "..", "..");
    const root = mkdtempSync(join(tmpdir(), "simple-promotion-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(join(root, "package.json"), readFileSync(join(sourceRoot, "package.json")));
    for (const name of INCLUDED_PACKAGES) {
        const source = join(sourceRoot, "packages", name.replace("@scramjet/", ""), "package.json");
        const target = join(root, "packages", name.replace("@scramjet/", ""), "package.json");
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, readFileSync(source));
    }
    const image = join(root, "packages/config/src/sth/image-config.ts");
    mkdirSync(dirname(image), { recursive: true });
    writeFileSync(image, readFileSync(join(sourceRoot, "packages/config/src/sth/image-config.ts")));
    const workflow = join(root, ".github/workflows/devel-validate.yml");
    mkdirSync(dirname(workflow), { recursive: true });
    writeFileSync(workflow, "name: devel\n# preserve -devel in unrelated content\n");
    const pyproject = join(sourceRoot, "packages/runner-python/pyproject.toml");
    if (existsSync(pyproject)) {
        const target = join(root, "packages/runner-python/pyproject.toml");
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, readFileSync(pyproject));
    }

    t.notThrows(() => simple.promote({ root, context: "release-start", developmentVersion: "2.1.1-devel", stableVersion: "2.1.1" }));
    t.is(readFileSync(workflow, "utf8"), "name: devel\n# preserve -devel in unrelated content\n");
    t.is(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version, "2.1.1");
});

test("candidate manifests are complete and tamper evident", (t) => {
    const fix = fixture(t); const candidate = simple.packCandidate({ packagesDir: fix.packages, sourceSha: sha, stableVersion: "2.1.0" });
    t.true(simple.verifyCandidate(candidate, { root: fix.packages })); candidate.assets[0].integrity = "sha256-bad"; candidate.checksum = simple.manifestChecksum(candidate); t.throws(() => simple.verifyCandidate(candidate, { root: fix.packages }), { message: /tampered/ });
});

test("publishes in waves and reuses exact existing artifacts", async (t) => {
    const fix = fixture(t); const candidate = simple.packCandidate({ packagesDir: fix.packages, sourceSha: sha, stableVersion: "2.1.0" }); const calls = []; const published = new Map();
    const result = await simple.publishCandidate({ candidate, root: fix.packages, environment: env, runner: (_cmd, args) => { calls.push(args); published.set(candidate.assets.find((asset) => args[2].split("/").pop() === asset.asset).name, true); }, download: async ({ name }) => published.has(name) ? readFileSync(fix.assets.find((asset) => asset.name === name).file) : null });
    t.is(result.events.length, INCLUDED_PACKAGES.size); t.is(calls.length, INCLUDED_PACKAGES.size); t.deepEqual(result.waves.map((wave) => wave.map((event) => event.name)), RELEASE_WAVES);
    const second = await simple.publishCandidate({ candidate, root: fix.packages, environment: env, runner: () => t.fail("must not republish"), download: async ({ name }) => { t.true(published.has(name)); return published.has(name) ? readFileSync(fix.assets.find((asset) => asset.name === name).file) : null; } });
    t.true(second.events.every((event) => event.action === "reused"));
});

test("registry verification requires exact name, version, and integrity", async (t) => {
    const fix = fixture(t); const candidate = simple.packCandidate({ packagesDir: fix.packages, sourceSha: sha, stableVersion: "2.1.0" });
    t.true(await simple.verifyRegistry({ candidate, view: async ({ name }) => ({ name, version: "2.1.0", dist: { integrity: candidate.assets.find((asset) => asset.name === name).integrity } }) }));
    await t.throwsAsync(() => simple.verifyRegistry({ candidate, view: async ({ name }) => ({ name, version: "2.1.0", dist: { integrity: "sha256-bad" } }) }), { message: /verification failed/ });
});
