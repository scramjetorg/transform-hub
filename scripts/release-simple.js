#!/usr/bin/env node

const { execFileSync, spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const tar = require("tar");
const { INCLUDED_PACKAGES, RELEASE_WAVES, validateReleaseWaves } = require("./lib/release-boundary.js");
const releaseMain = require("./release-main.js");

const FORMAT = "transform-hub-simple-release-v1";
const REGISTRY = releaseMain.REGISTRY;
const NPM_CLI = releaseMain.NPM_CLI;
const STABLE = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const DEVEL = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-devel$/;
const SOURCE_SHA = /^[a-f0-9]{40}$/i;

function digest(bytes) {
    return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
function integrity(bytes) {
    return `sha256-${createHash("sha256").update(bytes).digest("base64")}`;
}
function canonical(value) {
    return JSON.stringify(value, Object.keys(value || {}).sort());
}
function manifestChecksum(manifest) {
    const { checksum, ...unsigned } = manifest;
    return digest(canonical(unsigned));
}
function stablePart(version) {
    return version.replace(/-devel$/, "");
}
function compareStable(left, right) {
    const a = left.split(".").map(Number);
    const b = right.split(".").map(Number);
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}
function assertSourceSha(value) {
    if (!SOURCE_SHA.test(String(value))) throw new Error("A 40-character source SHA is required.");
    return String(value).toLowerCase();
}

function readTarballManifest(file) {
    const directory = mkdtempSync(join(tmpdir(), "simple-release-pack-"));
    try {
        tar.x({ file, cwd: directory, sync: true, strict: true });
        return JSON.parse(readFileSync(join(directory, "package", "package.json"), "utf8"));
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
}

function assertDevelEligibility({ developmentVersion, mainVersion, openReleasePrs = [], openReleasePrCount } = {}) {
    if (!DEVEL.test(String(developmentVersion))) throw new Error("Development version must be canonical X.Y.Z-devel.");
    if (!STABLE.test(String(mainVersion))) throw new Error("Main version must be stable X.Y.Z.");
    if (compareStable(stablePart(developmentVersion), mainVersion) <= 0) throw new Error("Development version must be greater than the main stable version.");
    const openCount = openReleasePrCount === undefined ? (Array.isArray(openReleasePrs) ? openReleasePrs.length : openReleasePrs) : openReleasePrCount;
    if (openCount !== 0) throw new Error("Open release PRs must be empty.");
    return { developmentVersion, mainVersion, releaseVersion: stablePart(developmentVersion) };
}

function files(root) {
    const result = new Map();
    function visit(directory) {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            if ([".git", "node_modules", "dist"].includes(entry.name)) continue;
            const path = join(directory, entry.name);
            if (entry.isDirectory()) visit(path);
            else result.set(path.slice(root.length + 1), readFileSync(path));
        }
    }
    visit(root);
    return result;
}

function assertSuffixOnly(before, after) {
    const names = new Set([...before.keys(), ...after.keys()]);
    for (const name of names) {
        if (!before.has(name) || !after.has(name)) throw new Error(`Promotion changed file set: ${name}`);
        const oldText = before.get(name).toString("utf8");
        const newText = after.get(name).toString("utf8");
        if (newText !== oldText.replaceAll("-devel", "")) throw new Error(`Promotion changed ${name} beyond removal of -devel.`);
    }
}

function promote({ root = process.cwd(), developmentVersion, stableVersion = stablePart(developmentVersion), align = null } = {}) {
    if (!DEVEL.test(String(developmentVersion)) || !STABLE.test(String(stableVersion)) || stableVersion !== stablePart(developmentVersion)) {
        throw new Error("Promotion requires a canonical X.Y.Z-devel version and its stable X.Y.Z form.");
    }
    const before = files(resolve(root));
    const result = align
        ? align({ root: resolve(root), releaseVersion: stableVersion })
        : spawnSync(process.execPath, [resolve(__dirname, "release-align.js"), "apply", `--release-version=${stableVersion}`], {
              cwd: root,
              env: { ...process.env, SCRAMJET_RELEASE_ROOT: resolve(root) },
              encoding: "utf8"
          });
    if (result && result.status !== undefined && result.status !== 0) throw new Error(result.stderr || "Stable release alignment failed.");
    assertSuffixOnly(before, files(resolve(root)));
    return { releaseVersion: stableVersion, result };
}

function packagePaths(packagesDir) {
    return new Map(
        readdirSync(packagesDir, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => {
                const path = join(packagesDir, entry.name, "package.json");
                return [JSON.parse(readFileSync(path, "utf8")).name, join(packagesDir, entry.name)];
            })
    );
}

function flatTarballs(packagesDir) {
    return readdirSync(packagesDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".tgz"))
        .map((entry) => resolve(packagesDir, entry.name));
}

function packCandidate({ packagesDir, output, sourceSha, stableVersion, pack = null, boundary = INCLUDED_PACKAGES } = {}) {
    if (!STABLE.test(String(stableVersion))) throw new Error("Candidate version must be stable X.Y.Z.");
    const flatAssets = flatTarballs(resolve(packagesDir));
    const assets = [];
    const candidates = flatAssets.length > 0 ? flatAssets : [...packagePaths(resolve(packagesDir)).entries()].map(([name, directory]) => ({ name, directory }));
    for (const candidate of candidates) {
        const directory = candidate.directory;
        const path = candidate.name
            ? resolve(
                  directory,
                  pack
                      ? pack({ name: candidate.name, directory, version: stableVersion })
                      : JSON.parse(
                            execFileSync(process.execPath, [resolve(__dirname, "..", NPM_CLI), "pack", "--json", "--ignore-scripts"], { cwd: directory, encoding: "utf8" })
                        )[0].filename
              )
            : candidate;
        const bytes = readFileSync(path);
        const manifest = candidate.name ? JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) : readTarballManifest(path);
        if (!boundary.has(manifest.name) || manifest.version !== stableVersion) throw new Error(`Candidate package ${manifest.name} has the wrong stable version.`);
        assets.push({ name: manifest.name, version: manifest.version, asset: path.split(/[\\/]/).pop(), size: bytes.length, sha256: digest(bytes), integrity: integrity(bytes) });
    }
    if (assets.length !== boundary.size || new Set(assets.map((asset) => asset.name)).size !== boundary.size)
        throw new Error("Candidate tarball output is missing an included package.");
    validateReleaseWaves(RELEASE_WAVES, { boundary });
    const document = {
        format: FORMAT,
        version: stableVersion,
        source: { sha: assertSourceSha(sourceSha) },
        packages: [...boundary].sort(),
        assets,
        waves: RELEASE_WAVES.filter((wave) => wave.some((name) => boundary.has(name))).map((wave) => wave.filter((name) => boundary.has(name)))
    };
    document.checksum = manifestChecksum(document);
    if (output) writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
    return document;
}

function verifyCandidate(candidate, { root = process.cwd(), boundary = INCLUDED_PACKAGES, expectedSourceSha, expectedVersion } = {}) {
    if (!candidate || candidate.format !== FORMAT || candidate.checksum !== manifestChecksum(candidate)) throw new Error("Candidate manifest checksum is invalid.");
    if (!STABLE.test(candidate.version) || candidate.source?.sha !== assertSourceSha(candidate.source.sha)) throw new Error("Candidate manifest identity is invalid.");
    if (expectedSourceSha !== undefined && candidate.source.sha !== assertSourceSha(expectedSourceSha))
        throw new Error("Candidate source SHA does not match the expected source SHA.");
    if (expectedVersion !== undefined && candidate.version !== expectedVersion) throw new Error("Candidate version does not match the expected version.");
    if (candidate.packages.length !== boundary.size || new Set(candidate.packages).size !== boundary.size || candidate.packages.some((name) => !boundary.has(name)))
        throw new Error("Candidate manifest package boundary is incomplete.");
    if (candidate.assets.length !== boundary.size) throw new Error("Candidate manifest tarball assets are incomplete.");
    for (const asset of candidate.assets) {
        const path = resolve(root, asset.asset);
        if (!existsSync(path) || !lstatSync(path).isFile()) throw new Error(`Candidate tarball is missing: ${asset.name}`);
        const bytes = readFileSync(path);
        if (asset.version !== candidate.version || asset.sha256 !== digest(bytes) || asset.integrity !== integrity(bytes))
            throw new Error(`Candidate tarball is tampered: ${asset.name}`);
    }
    return true;
}

async function publishCandidate({
    candidate,
    root = process.cwd(),
    environment = process.env,
    runner = execFileSync,
    registry = REGISTRY,
    download,
    expectedSourceSha,
    expectedVersion
} = {}) {
    verifyCandidate(candidate, { root, expectedSourceSha, expectedVersion });
    if (environment.NPM_TOKEN || environment.NODE_AUTH_TOKEN) throw new Error("Long-lived npm credentials are forbidden for release publication.");
    if (!environment.ACTIONS_ID_TOKEN_REQUEST_URL || !environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN) throw new Error("Protected production OIDC credentials are unavailable.");
    const events = [];
    const byName = new Map(candidate.assets.map((asset) => [asset.name, asset]));
    for (const wave of candidate.waves) {
        for (const name of wave) {
            const asset = byName.get(name);
            const bytes = readFileSync(resolve(root, asset.asset));
            const existing = download ? await download({ name, version: candidate.version, registry }) : null;
            if (existing !== null && existing !== undefined) {
                const existingBytes = Buffer.isBuffer(existing) ? existing : existing.bytes;
                if (!existingBytes || digest(existingBytes) !== asset.sha256) throw new Error(`Already-published ${name}@${candidate.version} does not match the candidate.`);
                events.push({ name, action: "reused" });
            } else {
                runner(
                    process.execPath,
                    [
                        resolve(__dirname, "..", NPM_CLI),
                        "publish",
                        resolve(root, asset.asset),
                        "--ignore-scripts",
                        "--provenance",
                        "--access",
                        "public",
                        "--tag",
                        "latest",
                        "--registry",
                        registry
                    ],
                    { stdio: "inherit", env: environment }
                );
                events.push({ name, action: "published" });
            }
            if (digest(bytes) !== asset.sha256) throw new Error(`Candidate tarball changed during publication: ${name}`);
        }
    }
    return { waves: candidate.waves.map((packages) => packages.map((name) => events.find((event) => event.name === name))), events };
}

async function verifyRegistry({ candidate, registry = REGISTRY, view = null, expectedSourceSha, expectedVersion } = {}) {
    verifyCandidateIdentity(candidate, { expectedSourceSha, expectedVersion });
    const inspect =
        view ||
        (async ({ name, version }) =>
            JSON.parse(
                execFileSync(
                    process.execPath,
                    [resolve(__dirname, "..", NPM_CLI), "view", `${name}@${version}`, "name", "version", "dist.integrity", "--json", "--registry", registry],
                    { encoding: "utf8" }
                )
            ));
    for (const asset of candidate.assets) {
        const metadata = await inspect({ name: asset.name, version: candidate.version, registry });
        if (metadata.name !== asset.name || metadata.version !== candidate.version || (metadata.dist?.integrity !== asset.integrity && metadata.integrity !== asset.integrity))
            throw new Error(`Registry verification failed for ${asset.name}@${candidate.version}.`);
    }
    return true;
}

function verifyCandidateIdentity(candidate, { expectedSourceSha, expectedVersion } = {}) {
    if (!candidate || candidate.format !== FORMAT || candidate.checksum !== manifestChecksum(candidate)) throw new Error("Candidate manifest checksum is invalid.");
    if (!STABLE.test(String(candidate.version)) || candidate.source?.sha !== assertSourceSha(candidate.source?.sha)) throw new Error("Candidate manifest identity is invalid.");
    if (expectedSourceSha !== undefined && candidate.source?.sha !== assertSourceSha(expectedSourceSha))
        throw new Error("Candidate source SHA does not match the expected source SHA.");
    if (expectedVersion !== undefined && candidate.version !== expectedVersion) throw new Error("Candidate version does not match the expected version.");
}

function option(args, name, required = true) {
    const index = args.findIndex((arg) => arg === name || arg.startsWith(`${name}=`));
    const value = index < 0 ? undefined : args[index].startsWith(`${name}=`) ? args[index].slice(name.length + 1) : args[index + 1];
    if (!value && required) throw new Error(`${name}=... is required.`);
    return value;
}

function parseCliArguments(args) {
    const [command] = args;
    const aliases = { eligibility: "assert-eligible", devel: "assert-eligible" };
    const normalized = aliases[command] || command;
    if (!normalized) throw new Error("A release-simple command is required.");
    return {
        command: normalized,
        developmentVersion: option(args, "--development-version", false) || option(args, "--head-version", false),
        mainVersion: option(args, "--main-version", false),
        stableVersion: option(args, "--stable-version", false),
        sourceSha: option(args, "--source-sha", false) || option(args, "--head-sha", false),
        version: option(args, "--version", false),
        openReleasePrCount: option(args, "--open-release-prs", false),
        root: option(args, "--root", false),
        assetsDir: option(args, "--assets-dir", false),
        packagesDir: option(args, "--packages-dir", false),
        output: option(args, "--output", false),
        manifest: option(args, "--manifest", false)
    };
}

async function main() {
    const parsed = parseCliArguments(process.argv.slice(2));
    const { command } = parsed;
    if (command === "assert-eligible") {
        const eligibility = assertDevelEligibility({
            developmentVersion: parsed.developmentVersion,
            mainVersion: parsed.mainVersion,
            openReleasePrCount: Number(parsed.openReleasePrCount || 0)
        });
        if (parsed.stableVersion !== undefined && parsed.stableVersion !== eligibility.releaseVersion) throw new Error("Stable version does not match the development version.");
        if (parsed.sourceSha !== undefined) assertSourceSha(parsed.sourceSha);
        console.log(JSON.stringify(eligibility));
    } else if (command === "promote") {
        console.log(
            JSON.stringify(
                promote({
                    root: parsed.root || process.cwd(),
                    developmentVersion: parsed.developmentVersion,
                    stableVersion: parsed.stableVersion
                })
            )
        );
    } else if (command === "pack") {
        console.log(
            JSON.stringify(
                packCandidate({
                    packagesDir: parsed.packagesDir,
                    output: parsed.output,
                    sourceSha: parsed.sourceSha,
                    stableVersion: parsed.stableVersion
                })
            )
        );
    } else if (command === "verify") {
        const manifestPath =
            parsed.manifest ||
            (() => {
                throw new Error("--manifest=... is required.");
            })();
        const candidate = JSON.parse(readFileSync(manifestPath, "utf8"));
        verifyCandidate(candidate, { root: parsed.assetsDir || parsed.root || dirname(manifestPath), expectedSourceSha: parsed.sourceSha, expectedVersion: parsed.version });
        console.log(JSON.stringify({ verified: true }));
    } else if (command === "publish") {
        const manifestPath =
            parsed.manifest ||
            (() => {
                throw new Error("--manifest=... is required.");
            })();
        const candidate = JSON.parse(readFileSync(manifestPath, "utf8"));
        console.log(
            JSON.stringify(
                await publishCandidate({
                    candidate,
                    root: parsed.assetsDir || parsed.root || dirname(manifestPath),
                    expectedSourceSha: parsed.sourceSha,
                    expectedVersion: parsed.version
                })
            )
        );
    } else if (command === "verify-registry") {
        const manifestPath =
            parsed.manifest ||
            (() => {
                throw new Error("--manifest=... is required.");
            })();
        const candidate = JSON.parse(readFileSync(manifestPath, "utf8"));
        console.log(JSON.stringify({ verified: await verifyRegistry({ candidate, expectedSourceSha: parsed.sourceSha, expectedVersion: parsed.version }) }));
    } else {
        throw new Error("Usage: release-simple.js assert-eligible|promote|pack|verify|publish|verify-registry");
    }
}

if (require.main === module)
    main().catch((error) => {
        console.error(`[release-simple] ${error.message}`);
        process.exitCode = 1;
    });

module.exports = {
    FORMAT,
    assertDevelEligibility,
    assertSuffixOnly,
    promote,
    packCandidate,
    verifyCandidate,
    publishCandidate,
    verifyRegistry,
    digest,
    integrity,
    manifestChecksum,
    parseCliArguments
};
