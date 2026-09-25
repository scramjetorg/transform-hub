#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } = require("node:fs");
const { join, relative, resolve, sep } = require("node:path");

const { INCLUDED_PACKAGES, RELEASE_WAVES, validateReleaseWaves } = require("./lib/release-boundary.js");

const FORMAT = "transform-hub-main-release-v2";
const PUBLICATION_FORMAT = "transform-hub-main-release-publication-v2";
const REGISTRY = "https://registry.npmjs.org";
const NPM_CLI = "node_modules/npm/bin/npm-cli.js";
const SHA = /^[a-f0-9]{40}$/i;
const DIGEST = /^sha256:[a-f0-9]{64}$/i;
const SAFE_NAME = /^[a-z0-9@._+/-]+$/i;

function canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    if (value && typeof value === "object")
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(",")}}`;
    return JSON.stringify(value);
}
function sha256(value) {
    return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
function fileSha256(path) {
    return sha256(readFileSync(path));
}
function assertSha(value, label = "SHA") {
    if (!SHA.test(String(value))) throw new Error(`A 40-character ${label} is required.`);
    return String(value).toLowerCase();
}
function assertTree(value) {
    return assertSha(value, "tree SHA");
}
function packageJsonPaths(directory) {
    const result = [];
    function visit(current) {
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            if (entry.name === "node_modules") continue;
            const path = join(current, entry.name);
            if (entry.isDirectory()) visit(path);
            else if (entry.name === "package.json" && statSync(path).isFile()) result.push(path);
        }
    }
    visit(resolve(directory));
    return result.sort();
}
function releasePackageChecksum(packageJson) {
    const release = { ...packageJson.scramjet?.release };
    delete release.packageChecksum;
    return sha256(canonicalJson({ ...packageJson, scramjet: { ...packageJson.scramjet, release } }));
}
function releasePackages(packagesDir, boundary = INCLUDED_PACKAGES) {
    const root = resolve(packagesDir);
    const manifests = new Map();
    for (const path of packageJsonPaths(root)) {
        const source = readFileSync(path, "utf8");
        const packageJson = JSON.parse(source);
        if (!packageJson.name || packageJson.private === true) continue;
        if (!boundary.has(packageJson.name)) throw new Error(`Publish directory contains a package outside the release boundary: ${packageJson.name}`);
        if (manifests.has(packageJson.name)) throw new Error(`Duplicate release package: ${packageJson.name}`);
        manifests.set(packageJson.name, { packageJson, path, relativePath: relative(root, path).split(sep).join("/"), sourceChecksum: sha256(source) });
    }
    for (const name of boundary) if (!manifests.has(name)) throw new Error(`Release boundary package is missing from the clean build: ${name}`);
    return manifests;
}
function normalizedWaves(waves) {
    return waves.map((packages, index) => ({ number: index + 1, packages: [...packages] }));
}
function assertApprovedWaves(waves, boundary, manifests) {
    validateReleaseWaves(waves, { boundary, manifests });
    if (boundary === INCLUDED_PACKAGES && canonicalJson(waves) !== canonicalJson(RELEASE_WAVES))
        throw new Error("Main release wave plan does not match the approved complete release plan.");
}
function identityDocument({ manifests, sourceSha, node, npm, waves }) {
    const ordered = waves.flat();
    return {
        schema: "https://scramjet.org/transform-hub/release/identity/v2",
        source: { repository: "https://github.com/scramjetorg/transform-hub", sha: assertSha(sourceSha, "source SHA") },
        toolchain: { node, npm },
        packages: ordered.map((name) => ({ name, sourceChecksum: manifests.get(name).sourceChecksum, version: manifests.get(name).packageJson.version })),
        waves: normalizedWaves(waves)
    };
}
function identityDigest(identity) {
    return sha256(canonicalJson(identity));
}
function annotatePackages({ manifests, identityDigest: digest, version, waves }) {
    return [...waves.flat()].map((name) => {
        const entry = manifests.get(name);
        const updated = { ...entry.packageJson, version, scramjet: { ...entry.packageJson.scramjet, release: { identityDigest: digest, sourceChecksum: entry.sourceChecksum } } };
        updated.scramjet.release.packageChecksum = releasePackageChecksum(updated);
        writeFileSync(entry.path, `${JSON.stringify(updated, null, 2)}\n`);
        return {
            name,
            version,
            sourceChecksum: entry.sourceChecksum,
            packageChecksum: updated.scramjet.release.packageChecksum,
            checksum: updated.scramjet.release.packageChecksum,
            path: entry.relativePath
        };
    });
}
function checksumDocument(value, field = "checksum") {
    const { [field]: _ignored, ...unsigned } = value;
    return sha256(canonicalJson(unsigned));
}
function bundleChecksum(bundle) {
    return checksumDocument(bundle, "outerChecksum");
}
function createRelease({ packagesDir, sourceSha, node, npm, version, boundary = INCLUDED_PACKAGES, waves = RELEASE_WAVES }) {
    const manifests = releasePackages(packagesDir, boundary);
    assertApprovedWaves(waves, boundary, manifests);
    const finalVersion = version || manifests.values().next().value.packageJson.version;
    for (const entry of manifests.values()) entry.packageJson = { ...entry.packageJson, version: finalVersion };
    const identity = identityDocument({ manifests, sourceSha, node, npm, waves });
    const digest = identityDigest(identity);
    return {
        format: FORMAT,
        identity,
        identityDigest: digest,
        packages: annotatePackages({ manifests, identityDigest: digest, version: finalVersion, waves }),
        registry: REGISTRY,
        waves: normalizedWaves(waves)
    };
}
function releaseChecksum(release) {
    return checksumDocument(release, "checksum");
}
function writeRelease(output, release) {
    const document = { ...release, checksum: releaseChecksum(release) };
    writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
    return { document, status: "created" };
}

async function packPackage(directory, tarballsDir, runner = execFileSync) {
    mkdirSync(tarballsDir, { recursive: true });
    const result = runner(process.execPath, [resolve(__dirname, "..", NPM_CLI), "pack", "--json", "--pack-destination", resolve(tarballsDir)], {
        cwd: directory,
        encoding: "utf8"
    });
    const metadata = JSON.parse(String(result))[0];
    const name = metadata.filename;
    if (!name || !SAFE_NAME.test(name) || !name.endsWith(".tgz")) throw new Error(`Unsafe npm tarball name: ${name}`);
    return { name, path: join(tarballsDir, name), size: statSync(join(tarballsDir, name)).size, sha256: fileSha256(join(tarballsDir, name)) };
}
async function createBundle({
    packagesDir,
    outputDir,
    version,
    tag = `v${version}`,
    branch = `release/${version}`,
    headSha,
    treeSha,
    sourceSha = headSha,
    node,
    npm,
    repository = "scramjetorg/transform-hub",
    runner = execFileSync
}) {
    if (!version || !tag || !branch) throw new Error("Bundle version, tag, and branch are required.");
    const release = createRelease({ packagesDir, sourceSha, node, npm, version });
    assertSha(headSha, "candidate head SHA");
    assertTree(treeSha);
    mkdirSync(outputDir, { recursive: true });
    const tarballsDir = join(outputDir, "tarballs");
    rmSync(tarballsDir, { recursive: true, force: true });
    mkdirSync(tarballsDir);
    const tarballs = [];
    const entries = new Map(release.packages.map((entry) => [entry.name, entry]));
    for (const wave of release.waves)
        for (const name of wave.packages) {
            const entry = entries.get(name);
            const packageDir = resolve(packagesDir, entry.path, "..");
            const tarball = await packPackage(packageDir, tarballsDir, runner);
            tarballs.push({ package: name, version: entry.version, packageChecksum: entry.packageChecksum, name: tarball.name, size: tarball.size, sha256: tarball.sha256 });
        }
    const manifest = {
        format: FORMAT,
        version,
        tag,
        branch,
        candidate: { head: assertSha(headSha, "candidate head SHA"), tree: assertTree(treeSha) },
        repository,
        toolchain: release.identity.toolchain,
        source: release.identity.source,
        identity: release.identity,
        identityDigest: release.identityDigest,
        packages: release.packages,
        waves: release.waves,
        tarballs
    };
    manifest.outerChecksum = bundleChecksum(manifest);
    writeFileSync(join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const sums = tarballs.map((item) => `${item.sha256.slice(7)}  ${item.name}`).join("\n") + `\n${fileSha256(join(outputDir, "manifest.json")).slice(7)}  manifest.json\n`;
    writeFileSync(join(outputDir, "SHA256SUMS"), sums);
    return manifest;
}
function assertSafeAsset(name) {
    if (!SAFE_NAME.test(name) || name.includes("..") || name.startsWith("/") || name.includes("\\")) throw new Error(`Unsafe release asset name: ${name}`);
}
function expectedAssetNames(bundle) {
    return new Set(["manifest.json", "SHA256SUMS", ...bundle.tarballs.map((item) => item.name)]);
}
function assetNamesFromJson(path) {
    const value = JSON.parse(readFileSync(path, "utf8"));
    const assets = Array.isArray(value) ? value : value.assets;
    if (!Array.isArray(assets)) throw new Error("GitHub release assets JSON must be an array.");
    return assets.map((asset) => (typeof asset === "string" ? asset : asset.name));
}
function validateAssetList(bundle, bundleDir, assetsJsonPath, tarballsDir = join(bundleDir, "tarballs"), { manifestOnly = false } = {}) {
    const expected = expectedAssetNames(bundle);
    const local = manifestOnly ? [] : ["manifest.json", "SHA256SUMS", ...readdirSync(tarballsDir)];
    const actual = assetsJsonPath ? assetNamesFromJson(assetsJsonPath) : local;
    if (!manifestOnly) {
        const rootEntries = readdirSync(bundleDir);
        const hasLocalTarballs = resolve(tarballsDir) === resolve(join(bundleDir, "tarballs"));
        if (
            (hasLocalTarballs && (rootEntries.length !== 3 || !rootEntries.includes("tarballs") || !statSync(join(bundleDir, "tarballs")).isDirectory())) ||
            (!hasLocalTarballs && rootEntries.length !== 2) ||
            !rootEntries.includes("manifest.json") ||
            !rootEntries.includes("SHA256SUMS")
        )
            throw new Error("Bundle directory contains extra or missing release assets.");
        if (assetsJsonPath && (new Set(local).size !== local.length || local.length !== expected.size || local.some((name) => !expected.has(name))))
            throw new Error("Downloaded release assets do not exactly match the verified GitHub asset list.");
    }
    if (actual.some((name) => typeof name !== "string" || !name || !SAFE_NAME.test(name) || name.includes("..") || name.includes("/") || name.includes("\\")))
        throw new Error("Release assets contain an unsafe name.");
    if (new Set(actual).size !== actual.length || actual.length !== expected.size || actual.some((name) => !expected.has(name)))
        throw new Error("Release assets do not exactly match manifest.json, SHA256SUMS, and the 37 recorded tarballs.");
    return true;
}
function verifyBinding(bundle, { expectedVersion, expectedBranch, expectedCandidateHead, expectedCandidateTree, expectedMainTree } = {}) {
    if (expectedVersion && bundle.version !== expectedVersion) throw new Error("Release bundle version does not match the expected tag.");
    if (expectedBranch && bundle.branch !== expectedBranch) throw new Error("Release bundle branch binding is invalid.");
    if (expectedCandidateHead && bundle.candidate.head !== assertSha(expectedCandidateHead, "expected candidate head SHA"))
        throw new Error("Release bundle candidate head binding is invalid.");
    if (expectedCandidateTree && bundle.candidate.tree !== assertTree(expectedCandidateTree)) throw new Error("Release bundle candidate tree binding is invalid.");
    if (expectedMainTree && bundle.candidate.tree !== assertTree(expectedMainTree)) throw new Error("Release bundle candidate tree does not match the resulting main tree.");
    return true;
}
async function verifyBundle({
    bundle,
    bundleDir,
    packagesDir,
    tarballsDir = join(bundleDir, "tarballs"),
    assetsJsonPath,
    expectedVersion,
    expectedBranch,
    expectedCandidateHead,
    expectedCandidateTree,
    expectedMainTree
}) {
    if (!bundle || bundle.format !== FORMAT || bundle.outerChecksum !== bundleChecksum(bundle)) throw new Error("Immutable bundle manifest checksum is invalid.");
    if (!bundle.identity || bundle.identityDigest !== identityDigest(bundle.identity)) throw new Error("Immutable bundle identity digest is invalid.");
    if (!bundle.version || bundle.tag !== `v${bundle.version}` || bundle.branch !== `release/${bundle.version}`) throw new Error("Bundle version, tag, or branch is invalid.");
    assertSha(bundle.candidate.head, "candidate head SHA");
    assertTree(bundle.candidate.tree);
    assertApprovedWaves(
        bundle.waves.map((wave) => wave.packages),
        INCLUDED_PACKAGES
    );
    if (bundle.identity.source?.sha !== bundle.candidate.head) throw new Error("Bundle source identity does not match candidate head.");
    verifyBinding(bundle, { expectedVersion, expectedBranch, expectedCandidateHead, expectedCandidateTree, expectedMainTree });
    validateAssetList(bundle, bundleDir, assetsJsonPath, tarballsDir);
    const identityPackages = new Map((bundle.identity.packages || []).map((entry) => [entry.name, entry]));
    const packageNames = new Set(bundle.packages.map((entry) => entry.name));
    if (
        bundle.packages.length !== INCLUDED_PACKAGES.size ||
        packageNames.size !== bundle.packages.length ||
        identityPackages.size !== INCLUDED_PACKAGES.size ||
        [...packageNames].some((name) => !INCLUDED_PACKAGES.has(name)) ||
        [...INCLUDED_PACKAGES].some((name) => !packageNames.has(name)) ||
        bundle.tarballs.length !== INCLUDED_PACKAGES.size
    )
        throw new Error("Bundle does not contain exactly the release boundary assets.");
    for (const entry of bundle.packages) {
        const identityEntry = identityPackages.get(entry.name);
        if (
            !identityEntry ||
            entry.version !== bundle.version ||
            identityEntry.version !== entry.version ||
            identityEntry.sourceChecksum !== entry.sourceChecksum ||
            !DIGEST.test(entry.packageChecksum)
        )
            throw new Error(`Bundle package identity is invalid for ${entry.name}.`);
    }
    const seen = new Set();
    const tarballNames = new Set();
    for (const item of bundle.tarballs) {
        assertSafeAsset(item.name);
        if (tarballNames.has(item.name)) throw new Error(`Duplicate tarball: ${item.name}`);
        tarballNames.add(item.name);
        const path = join(tarballsDir, item.name);
        if (!existsSync(path) || statSync(path).size !== item.size || fileSha256(path) !== item.sha256) throw new Error(`Tarball checksum mismatch for ${item.package}.`);
        let packageJson;
        try {
            packageJson = JSON.parse(execFileSync("tar", ["-xOf", path, "package/package.json"], { encoding: "utf8" }));
        } catch {
            throw new Error(`Tarball package identity is missing for ${item.package}.`);
        }
        const expected = bundle.packages.find((entry) => entry.name === item.package);
        if (
            !expected ||
            item.version !== bundle.version ||
            packageJson.name !== item.package ||
            packageJson.version !== item.version ||
            packageJson.scramjet?.release?.identityDigest !== bundle.identityDigest ||
            packageJson.scramjet?.release?.packageChecksum !== expected.packageChecksum ||
            releasePackageChecksum(packageJson) !== expected.packageChecksum
        )
            throw new Error(`Embedded package identity mismatch for ${item.package}.`);
        seen.add(item.package);
    }
    if (seen.size !== INCLUDED_PACKAGES.size || [...INCLUDED_PACKAGES].some((name) => !seen.has(name)) || [...seen].some((name) => !INCLUDED_PACKAGES.has(name)))
        throw new Error("Bundle tarballs contain duplicate, missing, or extra packages.");
    const sums = readFileSync(join(bundleDir, "SHA256SUMS"), "utf8")
        .trim()
        .split(/\r?\n/)
        .map((line) => {
            const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
            if (!match) throw new Error("SHA256SUMS contains an invalid line.");
            assertSafeAsset(match[2]);
            return match.slice(1);
        });
    const expectedSums = new Map([["manifest.json", fileSha256(join(bundleDir, "manifest.json")).slice(7)], ...bundle.tarballs.map((item) => [item.name, item.sha256.slice(7)])]);
    if (sums.length !== expectedSums.size || sums.some(([, name]) => !expectedSums.has(name) || sums.filter(([, candidate]) => candidate === name).length !== 1))
        throw new Error("SHA256SUMS contains duplicate, missing, or extra assets.");
    for (const [digest, name] of sums) if (digest !== expectedSums.get(name)) throw new Error(`SHA256SUMS checksum mismatch for ${name}.`);
    if (packagesDir) verifyRelease({ ...bundle, checksum: releaseChecksum(bundle), identity: { ...bundle.identity, packages: bundle.packages } }, packagesDir);
    return true;
}
async function verifyDraft(options) {
    const { bundle, bundleDir, assetsJsonPath } = options;
    if (!bundle || bundle.format !== FORMAT || bundle.outerChecksum !== bundleChecksum(bundle)) throw new Error("Immutable bundle manifest checksum is invalid.");
    if (!bundle.identity || bundle.identityDigest !== identityDigest(bundle.identity)) throw new Error("Immutable bundle identity digest is invalid.");
    if (!bundle.version || bundle.tag !== `v${bundle.version}` || bundle.branch !== `release/${bundle.version}`) throw new Error("Bundle version, tag, or branch is invalid.");
    assertApprovedWaves(
        bundle.waves.map((wave) => wave.packages),
        INCLUDED_PACKAGES
    );
    assertSha(bundle.candidate?.head, "candidate head SHA");
    assertTree(bundle.candidate?.tree);
    if (bundle.identity.source?.sha !== bundle.candidate.head) throw new Error("Bundle source identity does not match candidate head.");
    const packageNames = new Set((bundle.packages || []).map((entry) => entry.name));
    const identityNames = new Set((bundle.identity.packages || []).map((entry) => entry.name));
    if (
        packageNames.size !== INCLUDED_PACKAGES.size ||
        identityNames.size !== INCLUDED_PACKAGES.size ||
        [...INCLUDED_PACKAGES].some((name) => !packageNames.has(name) || !identityNames.has(name))
    )
        throw new Error("Draft manifest does not contain the complete release boundary.");
    for (const entry of bundle.packages)
        if (entry.version !== bundle.version || !DIGEST.test(entry.packageChecksum)) throw new Error(`Draft manifest package identity is invalid for ${entry.name}.`);
    verifyBinding(bundle, options);
    validateAssetList(bundle, bundleDir, assetsJsonPath, undefined, { manifestOnly: true });
    return true;
}
function verifyRelease(release, packagesDir) {
    if (!release || release.format !== FORMAT || release.identityDigest !== identityDigest(release.identity)) throw new Error("Main release identity is invalid.");
    const manifests = releasePackages(packagesDir);
    for (const entry of release.packages) {
        const packageJson = JSON.parse(readFileSync(resolve(packagesDir, entry.path), "utf8"));
        if (
            !manifests.has(entry.name) ||
            packageJson.name !== entry.name ||
            packageJson.version !== entry.version ||
            packageJson.scramjet?.release?.identityDigest !== release.identityDigest ||
            packageJson.scramjet?.release?.packageChecksum !== entry.packageChecksum ||
            releasePackageChecksum(packageJson) !== entry.packageChecksum
        )
            throw new Error(`Main release package checksum mismatch for ${entry.name}.`);
    }
    return true;
}
function assertOidcPublication(environment = process.env) {
    if (environment.MAIN_RELEASE_PUBLISH_ENABLED !== "true") throw new Error("Main release publishing is disabled by remote configuration.");
    if (!environment.ACTIONS_ID_TOKEN_REQUEST_URL || !environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN) throw new Error("Protected production OIDC credentials are unavailable.");
    if (environment.NPM_TOKEN || environment.NODE_AUTH_TOKEN) throw new Error("Long-lived npm credentials are forbidden for main release publication.");
}
function npmArgs(args) {
    return [resolve(__dirname, "..", NPM_CLI), ...args];
}
function publishedReuse(entry, release, runner, environment) {
    try {
        const output = runner(process.execPath, npmArgs(["view", `${entry.name}@${entry.version}`, "name", "version", "scramjet", "--json", "--registry", REGISTRY]), {
            encoding: "utf8",
            env: environment
        });
        const published = JSON.parse(String(output));
        if (
            published.name === entry.name &&
            published.version === entry.version &&
            published.scramjet?.release?.identityDigest === release.identityDigest &&
            published.scramjet?.release?.packageChecksum === entry.packageChecksum
        )
            return true;
        throw new Error(`Immutable production version ${entry.name}@${entry.version} exists without the matching release identity and package checksum.`);
    } catch (error) {
        if (/Immutable production/.test(String(error.message))) throw error;
        if (/404|not found/i.test(`${error.message}\n${error.stderr || ""}`)) return false;
        throw error;
    }
}
function defaultSleep(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
function publishBundle({ bundle, bundleDir, tarballsDir = join(bundleDir, "tarballs"), environment = process.env, runner = execFileSync, sleep = defaultSleep }) {
    assertOidcPublication(environment);
    const result = { published: [], reused: [], waves: [] };
    for (const wave of bundle.waves) {
        const waveResult = { number: wave.number, published: [], reused: [] };
        for (const name of wave.packages) {
            const item = bundle.tarballs.find((tarball) => tarball.package === name);
            const entry = bundle.packages.find((pkg) => pkg.name === name);
            if (publishedReuse({ ...entry, checksum: entry.packageChecksum }, bundle, runner, environment)) {
                waveResult.reused.push(name);
                result.reused.push(name);
            } else {
                runner(process.execPath, npmArgs(["publish", join(tarballsDir, item.name), "--provenance", "--access", "public", "--tag", "latest", "--registry", REGISTRY]), {
                    env: environment,
                    stdio: "inherit"
                });
                waveResult.published.push(name);
                result.published.push(name);
            }
        }
        result.waves.push(waveResult);
        if (wave.number !== bundle.waves.length) sleep(10000);
    }
    return {
        ...result,
        publication: {
            format: PUBLICATION_FORMAT,
            identityDigest: bundle.identityDigest,
            publicationVerified: true,
            waves: result.waves,
            checksum: sha256(canonicalJson({ format: PUBLICATION_FORMAT, identityDigest: bundle.identityDigest, publicationVerified: true, waves: result.waves }))
        }
    };
}
function option(args, name) {
    const index = args.indexOf(name);
    if (index < 0 || !args[index + 1]) throw new Error(`${name} is required.`);
    return args[index + 1];
}
function optionalOption(args, name) {
    const index = args.indexOf(name);
    return index < 0 ? undefined : option(args, name);
}
function bindingOptions(args) {
    return {
        assetsJsonPath: optionalOption(args, "--assets-json"),
        expectedVersion: optionalOption(args, "--expected-version"),
        expectedBranch: optionalOption(args, "--expected-branch"),
        expectedCandidateHead: optionalOption(args, "--expected-candidate-head"),
        expectedCandidateTree: optionalOption(args, "--expected-candidate-tree"),
        expectedMainTree: optionalOption(args, "--expected-main-tree")
    };
}
async function main() {
    const [command, ...args] = process.argv.slice(2);
    if (command === "bundle")
        await createBundle({
            packagesDir: option(args, "--packages-dir"),
            outputDir: option(args, "--output-dir"),
            version: option(args, "--version"),
            branch: option(args, "--branch"),
            headSha: option(args, "--head-sha"),
            treeSha: option(args, "--tree-sha"),
            sourceSha: option(args, "--source-sha"),
            node: option(args, "--node"),
            npm: option(args, "--npm")
        });
    else if (command === "verify-bundle") {
        const bundleDir = option(args, "--bundle");
        await verifyBundle({
            bundle: JSON.parse(readFileSync(join(bundleDir, "manifest.json"), "utf8")),
            bundleDir,
            tarballsDir: optionalOption(args, "--tarballs-dir"),
            ...bindingOptions(args)
        });
    } else if (command === "verify-draft") {
        const bundleDir = option(args, "--bundle");
        await verifyDraft({ bundle: JSON.parse(readFileSync(join(bundleDir, "manifest.json"), "utf8")), bundleDir, ...bindingOptions(args) });
    } else if (command === "publish") {
        const bundleDir = option(args, "--bundle");
        const tarballsDir = option(args, "--tarballs-dir");
        const bundle = JSON.parse(readFileSync(join(bundleDir, "manifest.json"), "utf8"));
        await verifyBundle({ bundle, bundleDir, tarballsDir, ...bindingOptions(args) });
        console.log(JSON.stringify(publishBundle({ bundle, bundleDir, tarballsDir })));
    } else throw new Error("Usage: release-main.js bundle|verify-bundle|verify-draft|publish");
}
if (require.main === module)
    main().catch((error) => {
        console.error(`[release-main] ${error.message}`);
        process.exitCode = 1;
    });
module.exports = {
    FORMAT,
    PUBLICATION_FORMAT,
    REGISTRY,
    NPM_CLI,
    canonicalJson,
    bundleChecksum,
    createBundle,
    createRelease,
    fileSha256,
    identityDigest,
    publishBundle,
    publishedReuse,
    releasePackageChecksum,
    validateAssetList,
    verifyBinding,
    verifyBundle,
    verifyDraft,
    verifyRelease,
    writeRelease
};
