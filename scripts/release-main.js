#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } = require("node:fs");
const { join, relative, resolve, sep } = require("node:path");

const { INCLUDED_PACKAGES, RELEASE_WAVES, validateReleaseWaves } = require("./lib/release-boundary.js");

const FORMAT = "transform-hub-main-release-v1";
const PUBLICATION_FORMAT = "transform-hub-main-release-publication-v1";
const REGISTRY = "https://registry.npmjs.org";
const NPM_CLI = "node_modules/npm/bin/npm-cli.js";
const SHA = /^[a-f0-9]{40}$/i;
const DIGEST = /^sha256:[a-f0-9]{64}$/i;
// npm metadata propagation is eventually consistent. Each exact registry check
// is preceded by a bounded exponential wait, avoiding an immediate stale read
// without adding workflow-level sleeps or remote configuration.
const REGISTRY_VISIBILITY_BACKOFF_MS = Object.freeze([500, 1000, 2000, 4000, 8000, 16000]);

function canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    if (value && typeof value === "object") {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(",")}}`;
    }
    return JSON.stringify(value);
}

function sha256(value) {
    return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function assertSha(value) {
    if (!SHA.test(String(value))) throw new Error("A 40-character main source SHA is required.");
    return String(value).toLowerCase();
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
        if (!boundary.has(packageJson.name)) {
            throw new Error(`Publish directory contains a package outside the release boundary: ${packageJson.name}`);
        }
        if (manifests.has(packageJson.name)) throw new Error(`Duplicate release package: ${packageJson.name}`);
        const sourceChecksum = DIGEST.test(packageJson.scramjet?.release?.sourceChecksum || "")
            ? packageJson.scramjet.release.sourceChecksum
            : sha256(source);
        manifests.set(packageJson.name, {
            packageJson,
            path,
            relativePath: relative(root, path).split(sep).join("/"),
            sourceChecksum,
        });
    }
    for (const name of boundary) {
        if (!manifests.has(name)) throw new Error(`Release boundary package is missing from the clean build: ${name}`);
    }
    return manifests;
}

function orderedPackages(manifests, boundary = INCLUDED_PACKAGES) {
    const ordered = [];
    const visited = new Set();
    const visiting = new Set();
    function visit(name) {
        if (visited.has(name)) return;
        if (visiting.has(name)) throw new Error(`Release dependency cycle includes ${name}`);
        visiting.add(name);
        const packageJson = manifests.get(name).packageJson;
        for (const section of ["dependencies", "optionalDependencies"]) {
            for (const dependency of Object.keys(packageJson[section] || {})) {
                if (manifests.has(dependency)) visit(dependency);
            }
        }
        visiting.delete(name);
        visited.add(name);
        ordered.push(name);
    }
    for (const name of boundary) visit(name);
    return ordered;
}

function normalizedWaves(waves) {
    return waves.map((packages, index) => ({ number: index + 1, packages: [...packages] }));
}

function wavePackages(waves) {
    if (!Array.isArray(waves)) throw new Error("Main release wave plan is invalid.");
    return waves.map((wave, index) => {
        if (!wave || wave.number !== index + 1 || !Array.isArray(wave.packages)) {
            throw new Error(`Main release wave ${index + 1} is invalid.`);
        }
        return wave.packages;
    });
}

function samePackageSet(left, right) {
    return left.size === right.size && [...left].every((name) => right.has(name));
}

function assertApprovedWaves(waves, boundary, manifests) {
    validateReleaseWaves(waves, { boundary, manifests });
    if (samePackageSet(boundary, INCLUDED_PACKAGES) && canonicalJson(waves) !== canonicalJson(RELEASE_WAVES)) {
        throw new Error("Main release wave plan does not match the approved complete release plan.");
    }
}

function assertCompleteReleaseBoundary(release) {
    const packageEntries = release.packages || [];
    const packageNames = new Set(packageEntries.map((entry) => entry.name));
    if (packageNames.size !== packageEntries.length) throw new Error("Main release package list contains duplicates.");
    if (!samePackageSet(packageNames, INCLUDED_PACKAGES)) {
        throw new Error("Main release document must contain the complete included package boundary exactly once.");
    }

    const identityPackages = release.identity?.packages || [];
    const identityNames = new Set(identityPackages.map((entry) => entry.name));
    if (identityNames.size !== identityPackages.length || !samePackageSet(identityNames, INCLUDED_PACKAGES)) {
        throw new Error("Main release identity must contain the complete included package boundary exactly once.");
    }

    const waves = wavePackages(release.waves);
    assertApprovedWaves(waves, INCLUDED_PACKAGES);
    if (canonicalJson(packageEntries.map((entry) => entry.name)) !== canonicalJson(waves.flat())) {
        throw new Error("Main release packages do not match the complete wave plan.");
    }
    if (canonicalJson(identityPackages.map((entry) => entry.name)) !== canonicalJson(waves.flat())) {
        throw new Error("Main release identity packages do not match the complete wave plan.");
    }
    return waves;
}

function identityDocument({ manifests, ordered, sourceSha, node, npm, waves }) {
    return {
        schema: "https://scramjet.org/transform-hub/release/identity/v1",
        source: { repository: "https://github.com/scramjetorg/transform-hub", sha: assertSha(sourceSha) },
        toolchain: { node, npm },
        packages: ordered.map((name) => ({
            name,
            sourceChecksum: manifests.get(name).sourceChecksum,
            version: manifests.get(name).packageJson.version,
        })),
        waves: normalizedWaves(waves),
    };
}

function identityDigest(identity) {
    return sha256(canonicalJson(identity));
}

function annotatePackages({ manifests, ordered, identityDigest: digest }) {
    return ordered.map((name) => {
        const entry = manifests.get(name);
        const updated = {
            ...entry.packageJson,
            scramjet: {
                ...entry.packageJson.scramjet,
                release: { identityDigest: digest, sourceChecksum: entry.sourceChecksum },
            },
        };
        updated.scramjet.release.packageChecksum = releasePackageChecksum(updated);
        writeFileSync(entry.path, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
        return { checksum: updated.scramjet.release.packageChecksum, name, path: entry.relativePath, version: updated.version };
    });
}

function createRelease({ packagesDir, sourceSha, node, npm, boundary = INCLUDED_PACKAGES, waves = RELEASE_WAVES }) {
    const manifests = releasePackages(packagesDir, boundary);
    assertApprovedWaves(waves, boundary, manifests);
    orderedPackages(manifests, boundary);
    const ordered = waves.flat();
    const identity = identityDocument({ manifests, ordered, sourceSha, node, npm, waves });
    const digest = identityDigest(identity);
    return {
        format: FORMAT,
        identity,
        identityDigest: digest,
        packages: annotatePackages({ manifests, ordered, identityDigest: digest }),
        registry: REGISTRY,
        waves: normalizedWaves(waves),
    };
}

function releaseChecksum(release) {
    const { checksum, ...unsigned } = release;
    return sha256(canonicalJson(unsigned));
}

function writeRelease(output, release) {
    const document = { ...release, checksum: releaseChecksum(release) };
    if (existsSync(output)) {
        const existing = JSON.parse(readFileSync(output, "utf8"));
        if (existing.checksum === document.checksum) return { document: existing, status: "reused" };
        throw new Error(`Refusing to replace a different main release identity at ${output}.`);
    }
    writeFileSync(`${output}.tmp`, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    renameSync(`${output}.tmp`, output);
    return { document, status: "created" };
}

function verifyRelease(release, packagesDir) {
    if (!release || release.format !== FORMAT || release.registry !== REGISTRY || release.checksum !== releaseChecksum(release)) {
        throw new Error("Main release identity is invalid.");
    }
    if (!DIGEST.test(release.identityDigest) || release.identityDigest !== identityDigest(release.identity)) {
        throw new Error("Main release identity digest is invalid.");
    }
    assertCompleteReleaseBoundary(release);
    if (canonicalJson(release.identity.waves) !== canonicalJson(release.waves)) {
        throw new Error("Main release identity wave plan is invalid.");
    }
    for (const entry of release.packages || []) {
        const identityPackage = release.identity.packages.find((item) => item.name === entry.name);
        const packageJson = JSON.parse(readFileSync(resolve(packagesDir, entry.path), "utf8"));
        if (
            !identityPackage ||
            identityPackage.version !== entry.version ||
            identityPackage.sourceChecksum !== packageJson.scramjet?.release?.sourceChecksum ||
            packageJson.name !== entry.name ||
            packageJson.version !== entry.version ||
            packageJson.scramjet?.release?.identityDigest !== release.identityDigest ||
            packageJson.scramjet?.release?.packageChecksum !== entry.checksum ||
            releasePackageChecksum(packageJson) !== entry.checksum
        ) {
            throw new Error(`Main release package checksum mismatch for ${entry.name}.`);
        }
    }
}

function assertOidcPublication(environment = process.env) {
    if (environment.MAIN_RELEASE_PUBLISH_ENABLED !== "true") {
        throw new Error("Main release publishing is disabled by remote configuration.");
    }
    if (!environment.ACTIONS_ID_TOKEN_REQUEST_URL || !environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
        throw new Error("Protected production OIDC credentials are unavailable.");
    }
    if (environment.NPM_TOKEN || environment.NODE_AUTH_TOKEN) {
        throw new Error("Long-lived npm credentials are forbidden for main release publication.");
    }
}

function npmArgs(args) {
    return [resolve(__dirname, "..", NPM_CLI), ...args];
}

function publishedReuse(entry, release, runner, environment) {
    try {
        const output = runner(process.execPath, npmArgs(["view", `${entry.name}@${entry.version}`, "name", "version", "scramjet", "--json", "--registry", REGISTRY]), {
            encoding: "utf8",
            env: environment,
        });
        const published = JSON.parse(String(output));
        if (
            published.name === entry.name &&
            published.version === entry.version &&
            published.scramjet?.release?.identityDigest === release.identityDigest &&
            published.scramjet?.release?.packageChecksum === entry.checksum
        ) {
            return true;
        }
        throw new Error(`Immutable production version ${entry.name}@${entry.version} exists without the matching release identity and package checksum.`);
    } catch (error) {
        if (/Immutable production/.test(String(error?.message || ""))) throw error;
        if (/(?:E404|\b404\b|not found)/i.test(`${error.message || ""}\n${error.stderr || ""}`)) return false;
        throw new Error(`Unable to verify immutable production version ${entry.name}@${entry.version}.`);
    }
}

function defaultSleep(milliseconds) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function waitForRegistryVisibility(entries, release, runner, environment, options = {}) {
    const sleep = options.sleep || defaultSleep;

    let missing = [];
    for (const [attempt, delay] of REGISTRY_VISIBILITY_BACKOFF_MS.entries()) {
        sleep(delay);
        missing = entries.filter((entry) => !publishedReuse(entry, release, runner, environment));
        if (missing.length === 0) return { attempts: attempt + 1, packages: entries.map((entry) => entry.name) };
    }
    throw new Error(`Timed out waiting for npm registry visibility of ${missing.map((entry) => `${entry.name}@${entry.version}`).join(", ")}.`);
}

function publicationChecksum(publication) {
    const { checksum, ...unsigned } = publication;
    return sha256(canonicalJson(unsigned));
}

function verifyPublication(publication, release) {
    if (!publication || publication.format !== PUBLICATION_FORMAT || publication.checksum !== publicationChecksum(publication)) {
        throw new Error("Main release publication evidence is invalid.");
    }
    if (publication.identityDigest !== release.identityDigest || publication.releaseChecksum !== release.checksum) {
        throw new Error("Main release publication evidence does not match the immutable release identity.");
    }
    const expectedWaves = assertCompleteReleaseBoundary(release);
    if (!publication.publicationVerified || !Array.isArray(publication.waves) || publication.waves.length !== expectedWaves.length) {
        throw new Error("Main release publication did not verify every wave.");
    }
    for (const [index, wave] of publication.waves.entries()) {
        if (
            wave.number !== index + 1 ||
            wave.registryVerified !== true ||
            canonicalJson([...wave.published, ...wave.reused].sort()) !== canonicalJson([...expectedWaves[index]].sort())
        ) {
            throw new Error(`Main release publication evidence for wave ${index + 1} is incomplete.`);
        }
    }
    return true;
}

function publishRelease({ release, packagesDir, environment = process.env, runner = execFileSync, visibility = {} }) {
    assertOidcPublication(environment);
    verifyRelease(release, packagesDir);
    const entriesByName = new Map(release.packages.map((entry) => [entry.name, entry]));
    const result = { published: [], reused: [], waves: [] };
    const priorEntries = [];

    for (const wave of release.waves) {
        if (priorEntries.length > 0) {
            waitForRegistryVisibility(priorEntries, release, runner, environment, visibility);
        }
        const entries = wave.packages.map((name) => entriesByName.get(name));
        const waveResult = { number: wave.number, published: [], registryVerified: false, reused: [] };
        for (const entry of entries) {
            if (publishedReuse(entry, release, runner, environment)) {
                waveResult.reused.push(entry.name);
                result.reused.push(entry.name);
            } else {
                runner(process.execPath, npmArgs(["publish", "--provenance", "--access", "public", "--tag", "latest", "--registry", REGISTRY]), {
                    cwd: resolve(packagesDir, entry.path, ".."),
                    env: environment,
                    stdio: "inherit",
                });
                waveResult.published.push(entry.name);
                result.published.push(entry.name);
            }
        }
        waveResult.registry = waitForRegistryVisibility([...priorEntries, ...entries], release, runner, environment, visibility);
        waveResult.registryVerified = true;
        result.waves.push(waveResult);
        priorEntries.push(...entries);
    }

    const publication = {
        format: PUBLICATION_FORMAT,
        identityDigest: release.identityDigest,
        publicationVerified: result.waves.every((wave) => wave.registryVerified),
        releaseChecksum: release.checksum,
        waves: result.waves,
    };
    return { ...result, publication: { ...publication, checksum: publicationChecksum(publication) } };
}

function writePublication(output, publication) {
    writeFileSync(`${output}.tmp`, `${JSON.stringify(publication, null, 2)}\n`, "utf8");
    renameSync(`${output}.tmp`, output);
}

function option(args, name) {
    const index = args.indexOf(name);
    if (index < 0 || !args[index + 1]) throw new Error(`${name} is required.`);
    return args[index + 1];
}

function optionalOption(args, name) {
    const index = args.indexOf(name);
    if (index < 0) return undefined;
    if (!args[index + 1]) throw new Error(`${name} requires a value.`);
    return args[index + 1];
}

function main() {
    try {
        const [command, ...args] = process.argv.slice(2);
        if (command === "prepare") {
            const release = createRelease({
                packagesDir: option(args, "--packages-dir"),
                sourceSha: option(args, "--source-sha"),
                node: option(args, "--node"),
                npm: option(args, "--npm"),
            });
            const result = writeRelease(option(args, "--output"), release);
            console.log(JSON.stringify({ identityDigest: result.document.identityDigest, status: result.status }));
        } else if (command === "publish") {
            const release = JSON.parse(readFileSync(option(args, "--release"), "utf8"));
            const result = publishRelease({ release, packagesDir: option(args, "--packages-dir") });
            const output = optionalOption(args, "--output");
            if (output) writePublication(output, result.publication);
            console.log(JSON.stringify(result.publication));
        } else {
            throw new Error("Usage: release-main.js prepare|publish ...");
        }
    } catch (error) {
        console.error(`[release-main] ${error.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();

module.exports = {
    FORMAT,
    NPM_CLI,
    PUBLICATION_FORMAT,
    REGISTRY,
    REGISTRY_VISIBILITY_BACKOFF_MS,
    assertOidcPublication,
    createRelease,
    identityDigest,
    orderedPackages,
    publicationChecksum,
    publishRelease,
    publishedReuse,
    releaseChecksum,
    releasePackageChecksum,
    verifyPublication,
    verifyRelease,
    waitForRegistryVisibility,
    writePublication,
    writeRelease,
};
