#!/usr/bin/env node
const { execFileSync } = require("node:child_process");
const { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, readdirSync, rmSync, writeFileSync } = require("node:fs");
const { join, relative, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const { verifyBundle } = require("./release-main.js");
const { INCLUDED_PACKAGES } = require("./lib/release-boundary.js");

const RECORD_FORMAT = "transform-hub-release-tarball-bdd-v1";
const ROOT_ENV = "SCRAMJET_TARBALL_BDD_ROOT";

function assertRoot(root) {
    const resolved = resolve(root);
    if (!existsSync(join(resolved, "manifest.json")) || !existsSync(join(resolved, "SHA256SUMS"))) throw new Error("Tarball BDD input must contain manifest.json and SHA256SUMS");
    const manifest = JSON.parse(readFileSync(join(resolved, "manifest.json"), "utf8"));
    if (!Array.isArray(manifest.tarballs) || manifest.tarballs.length !== INCLUDED_PACKAGES.size) throw new Error("Tarball BDD input must contain exactly the 37 release tarballs");
    const expected = new Set(["manifest.json", "SHA256SUMS", ...manifest.tarballs.map((item) => item.name)]);
    const actual = new Set(readdirSync(resolved));
    if (actual.size !== expected.size || [...actual].some((name) => !expected.has(name))) throw new Error("Downloaded release assets do not exactly match the manifest");
    return manifest;
}

function assertAssetName(name) {
    if (typeof name !== "string" || name === "" || name.includes("/") || name.includes("\\") || name.includes(".."))
        throw new Error(`Unsafe draft release asset: ${name}`);
    if (name !== "manifest.json" && name !== "SHA256SUMS" && !/^[a-z0-9@._+-]+\.tgz$/i.test(name))
        throw new Error(`Unexpected draft release asset: ${name}`);
}

async function githubRequest(url, { token, accept = "application/vnd.github+json" }) {
    const response = await fetch(url, { headers: { Accept: accept, Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" } });
    if (!response.ok) throw new Error(`GitHub API request failed (${response.status}): ${url}`);
    return response;
}

async function verifyDownloadedBundle(root, expected = {}) {
    const source = resolve(root); const manifest = assertRoot(source);
    const staging = mkdtempSync(join(tmpdir(), "release-tarball-verify-"));
    try {
        mkdirSync(join(staging, "tarballs"));
        copyFileSync(join(source, "manifest.json"), join(staging, "manifest.json")); copyFileSync(join(source, "SHA256SUMS"), join(staging, "SHA256SUMS"));
        for (const item of manifest.tarballs) copyFileSync(join(source, item.name), join(staging, "tarballs", item.name));
        await verifyBundle({ bundle: manifest, bundleDir: staging, ...expected });
    } finally { rmSync(staging, { recursive: true, force: true }); }
    return manifest;
}

async function downloadDraftRelease({ repository, releaseId, outputDir, token = process.env.GH_TOKEN, request = githubRequest, expected = {} } = {}) {
    if (!/^\d+$/.test(String(releaseId || ""))) throw new Error("A numeric draft release ID is required");
    if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) throw new Error("A GitHub repository in owner/name form is required");
    if (!outputDir) throw new Error("outputDir is required");
    if (!token) throw new Error("GH_TOKEN is required");
    const root = resolve(outputDir);
    const assets = [];
    for (let page = 1; ; page++) {
        const response = await request(`https://api.github.com/repos/${repository}/releases/${releaseId}/assets?per_page=100&page=${page}`, { token });
        const pageAssets = await response.json();
        if (!Array.isArray(pageAssets)) throw new Error("GitHub release assets response was not an array");
        assets.push(...pageAssets);
        if (pageAssets.length < 100) break;
    }
    if (!assets.length) throw new Error("Draft release has no downloadable assets");
    const names = new Set();
    for (const asset of assets) {
        assertAssetName(asset.name);
        if (!Number.isSafeInteger(asset.id) || asset.id <= 0) throw new Error(`Invalid draft release asset ID: ${asset.id}`);
        if (names.has(asset.name)) throw new Error(`Duplicate draft release asset: ${asset.name}`);
        names.add(asset.name);
    }
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    for (const asset of assets) {
        const destination = resolve(root, asset.name);
        if (destination !== join(root, asset.name)) throw new Error(`Draft release asset escapes output directory: ${asset.name}`);
        const response = await request(`https://api.github.com/repos/${repository}/releases/assets/${asset.id}`, { token, accept: "application/octet-stream" });
        writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
    }
    return verifyDownloadedBundle(root, expected).then(() => ({ root, releaseId: String(releaseId), repository, assets }));
}

function firstPartySpec(value) { return typeof value === "string" && (value.startsWith("workspace:") || value.startsWith("file:") || value.startsWith("link:") || value.startsWith("git") || value.includes("://")); }
function assertNoUnsafeDependencies(packageJson, names) {
    for (const section of ["dependencies", "optionalDependencies", "peerDependencies"]) for (const [name, spec] of Object.entries(packageJson[section] || {})) if (names.has(name) && firstPartySpec(spec)) throw new Error(`Release tarball contains a non-registry-safe first-party dependency: ${name}@${spec}`);
}

async function prepareTarballRoot({ bundleDir, outputDir, npm = process.env.npm_execpath || "npm", runner = execFileSync } = {}) {
    if (!bundleDir || !outputDir) throw new Error("bundleDir and outputDir are required");
    const source = resolve(bundleDir); const root = resolve(outputDir); const manifest = await verifyDownloadedBundle(source); mkdirSync(root, { recursive: true }); const tarballs = join(root, "tarballs"); mkdirSync(tarballs, { recursive: true });
    copyFileSync(join(source, "manifest.json"), join(root, "manifest.json"));
    copyFileSync(join(source, "SHA256SUMS"), join(root, "SHA256SUMS"));
    const packageNames = new Set(manifest.tarballs.map((item) => item.package));
    const dependencies = {};
    for (const item of manifest.tarballs) { copyFileSync(join(source, item.name), join(tarballs, item.name)); dependencies[item.package] = `file:tarballs/${item.name}`; }
    writeFileSync(join(root, "package.json"), `${JSON.stringify({ name: "scramjet-release-tarball-bdd", private: true, version: "0.0.0", dependencies }, null, 2)}\n`);
    const inspect = (item) => { const json = JSON.parse(execFileSync("tar", ["-xOf", join(tarballs, item.name), "package/package.json"], { encoding: "utf8" })); assertNoUnsafeDependencies(json, packageNames); };
    manifest.tarballs.forEach(inspect);
    runner(npm, ["install", "--ignore-scripts", "--offline", "--no-audit", "--no-fund", "--install-links", "--package-lock=false"], { cwd: root, stdio: "inherit" });
    const modules = realpathSync(join(root, "node_modules"));
    for (const name of packageNames) { const dir = realpathSync(join(modules, name)); if (!relative(modules, dir) || relative(modules, dir).startsWith("..")) throw new Error(`Installed release package escapes node_modules: ${name}`); }
    const record = {
        format: RECORD_FORMAT,
        root,
        installDir: root,
        manifest: join(root, "manifest.json"),
        packages: manifest.tarballs.map((item) => ({ sourceName: item.package, name: item.package, tarball: item.name, sha256: item.sha256 }))
    };
    const recordPath = join(root, "release-tarball-bdd-record.json"); writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    return { root, recordPath, manifest, record };
}

if (require.main === module) {
    const args = process.argv.slice(2); const valueAfter = (...names) => { for (const name of names) { const index = args.indexOf(name); if (index >= 0 && args[index + 1]) return args[index + 1]; } return undefined; }; const bundleDir = valueAfter("--bundle", "--bundle-dir") || process.env.RELEASE_TARBALL_BUNDLE_DIR; const outputDir = valueAfter("--output", "--output-root", "--root") || process.env.RELEASE_TARBALL_BDD_ROOT;
    const downloadIndex = args.indexOf("download");
    const operation = downloadIndex >= 0 ? "download" : "prepare";
    const promise = operation === "download"
        ? downloadDraftRelease({ repository: valueAfter("--repository", "--repo") || process.env.GITHUB_REPOSITORY, releaseId: valueAfter("--release-id", "--id"), outputDir, expected: { expectedVersion: valueAfter("--expected-version"), expectedBranch: valueAfter("--expected-branch"), expectedCandidateHead: valueAfter("--expected-head"), expectedCandidateTree: valueAfter("--expected-tree") } })
        : prepareTarballRoot({ bundleDir, outputDir });
    promise.then((result) => process.stdout.write(`${JSON.stringify(result)}\n`)).catch((error) => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; });
}

module.exports = { RECORD_FORMAT, ROOT_ENV, assertRoot, verifyDownloadedBundle, downloadDraftRelease, prepareTarballRoot };
