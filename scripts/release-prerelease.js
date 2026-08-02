#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { existsSync, readFileSync, renameSync, writeFileSync } = require("node:fs");
const { resolve, relative, sep } = require("node:path");

const FORMAT = "transform-hub-release-prerelease-v1";
const REGISTRY = "https://npm.pkg.github.com";
const PUBLISHER_CONFIGURATION = "github-packages";
const SHA_LENGTH = 12;
const DIGEST = /^sha256:[a-f0-9]{64}$/i;

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

function finalPackageChecksum(packageJson) {
    const prerelease = { ...packageJson.scramjet?.prerelease };
    delete prerelease.packageChecksum;
    return sha256(
        canonicalJson({
            ...packageJson,
            scramjet: {
                ...packageJson.scramjet,
                prerelease
            }
        })
    );
}

function assertPullRequestNumber(value) {
    if (!/^\d+$/.test(String(value)) || Number(value) < 1) throw new Error("A positive pull request number is required.");
    return String(Number(value));
}

function assertSha(value) {
    if (!/^[a-f0-9]{40}$/i.test(String(value))) throw new Error("A 40-character commit SHA is required.");
    return String(value).toLowerCase();
}

function assertAttempt(value) {
    if (!/^r[1-9]\d*\.a[1-9]\d*$/.test(String(value))) {
        throw new Error("A prerelease attempt must use the r<run-id>.a<attempt> format.");
    }
    return String(value);
}

function releasePrereleaseVersion(sourceVersion, pullRequest, sha, attempt) {
    const match = String(sourceVersion).match(/^(\d+)\.(\d+)\.(\d+)(?:-pr\.\d+\.[a-f0-9]{12}\.(r[1-9]\d*\.a[1-9]\d*))?$/i);
    if (!match) throw new Error(`Package version ${JSON.stringify(sourceVersion)} must be a stable SemVer version or this release PR prerelease format.`);
    return `${match[1]}.${match[2]}.${match[3]}-pr.${assertPullRequestNumber(pullRequest)}.${assertSha(sha).slice(0, SHA_LENGTH)}.${assertAttempt(attempt || match[4])}`;
}

function releaseBaseVersion(version) {
    const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)(?:-pr\.\d+\.[a-f0-9]{12}\.r[1-9]\d*\.a[1-9]\d*)?$/i);
    if (!match) throw new Error(`Package version ${JSON.stringify(version)} must be a stable SemVer version or this release PR prerelease format.`);
    return `${match[1]}.${match[2]}.${match[3]}`;
}

function packageManifestPaths(directory) {
    const { readdirSync, statSync } = require("node:fs");
    const result = [];
    function visit(current) {
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            if (entry.name === "node_modules") continue;
            const path = resolve(current, entry.name);
            if (entry.isDirectory()) visit(path);
            else if (entry.name === "package.json" && statSync(path).isFile()) result.push(path);
        }
    }
    visit(resolve(directory));
    return result.sort();
}

function packageEntries({ packagesDir, pullRequest, sha, attempt }) {
    const root = resolve(packagesDir);
    const versions = new Map();
    const entries = [];
    for (const manifestPath of packageManifestPaths(root)) {
        const source = readFileSync(manifestPath, "utf8");
        const manifest = JSON.parse(source);
        if (!manifest.name || manifest.private === true) continue;
        if (!manifest.name.startsWith("@scramjet/")) throw new Error(`Only @scramjet packages may be prereleased: ${manifest.name}`);
        if (versions.has(manifest.name)) throw new Error(`Duplicate package name in publish directory: ${manifest.name}`);
        const sourceVersion = releaseBaseVersion(manifest.version);
        const version = releasePrereleaseVersion(sourceVersion, pullRequest, sha, attempt);
        versions.set(manifest.name, version);
        entries.push({
            manifest,
            manifestPath,
            name: manifest.name,
            relativePath: relative(root, manifestPath).split(sep).join("/"),
            sourceVersion,
            sourceChecksum: DIGEST.test(manifest.scramjet?.prerelease?.sourceChecksum || "") ? manifest.scramjet.prerelease.sourceChecksum : sha256(source),
            version
        });
    }
    if (entries.length === 0) throw new Error("No public @scramjet package manifests were found for prerelease publication.");
    return entries.sort((left, right) => left.name.localeCompare(right.name));
}

function updatePackageManifest(entry, versions) {
    const updated = { ...entry.manifest, version: entry.version };
    updated.scramjet = {
        ...updated.scramjet,
        prerelease: {
            attempt: entry.attempt,
            sourceChecksum: entry.sourceChecksum
        }
    };
    for (const section of ["dependencies", "optionalDependencies", "peerDependencies"]) {
        if (!updated[section]) continue;
        updated[section] = { ...updated[section] };
        for (const name of Object.keys(updated[section])) {
            if (versions.has(name)) updated[section][name] = versions.get(name);
        }
    }
    updated.scramjet.prerelease.packageChecksum = finalPackageChecksum(updated);
    const content = `${JSON.stringify(updated, null, 2)}\n`;
    if (readFileSync(entry.manifestPath, "utf8") !== content) writeFileSync(entry.manifestPath, content, "utf8");
    return { ...entry, checksum: updated.scramjet.prerelease.packageChecksum };
}

function manifestChecksum(manifest) {
    const { checksum, ...unsigned } = manifest;
    return sha256(canonicalJson(unsigned));
}

function createManifest({ packagesDir, pullRequest, sha, attempt }) {
    const normalizedPullRequest = assertPullRequestNumber(pullRequest);
    const normalizedSha = assertSha(sha);
    const normalizedAttempt = assertAttempt(attempt);
    const entries = packageEntries({ packagesDir, pullRequest: normalizedPullRequest, sha: normalizedSha, attempt: normalizedAttempt }).map((entry) => ({
        ...entry,
        attempt: normalizedAttempt
    }));
    const versions = new Map(entries.map((entry) => [entry.name, entry.version]));
    const manifest = {
        format: FORMAT,
        pullRequest: normalizedPullRequest,
        sourceSha: normalizedSha,
        attempt: normalizedAttempt,
        distTag: `release-pr-${normalizedPullRequest}`,
        registry: REGISTRY,
        packages: entries.map((entry) => {
            const updated = updatePackageManifest(entry, versions);
            return {
                checksum: updated.checksum,
                name: updated.name,
                path: updated.relativePath,
                baseVersion: updated.sourceVersion,
                sourceVersion: updated.version,
                sourceChecksum: updated.sourceChecksum,
                version: updated.version
            };
        })
    };
    return { ...manifest, checksum: manifestChecksum(manifest) };
}

function writeManifest(outputPath, manifest) {
    const content = `${JSON.stringify(manifest, null, 2)}\n`;
    if (existsSync(outputPath)) {
        const existing = JSON.parse(readFileSync(outputPath, "utf8"));
        if (existing.checksum === manifest.checksum) return { status: "reused", manifest };
        throw new Error(`Refusing to replace a different prerelease manifest at ${outputPath}.`);
    }
    writeFileSync(`${outputPath}.tmp`, content, "utf8");
    renameSync(`${outputPath}.tmp`, outputPath);
    return { status: "created", manifest };
}

function verifyManifest(manifest, packagesDir) {
    if (!manifest || manifest.format !== FORMAT) throw new Error("Unsupported prerelease manifest format.");
    if (manifest.registry !== REGISTRY) throw new Error("Prerelease manifest registry must be GitHub Packages.");
    assertAttempt(manifest.attempt);
    if (manifest.distTag !== `release-pr-${assertPullRequestNumber(manifest.pullRequest)}`) throw new Error("Prerelease manifest has an invalid dist-tag.");
    if (manifest.checksum !== manifestChecksum(manifest)) throw new Error("Prerelease manifest checksum does not match its contents.");
    for (const entry of manifest.packages || []) {
        const expected = releasePrereleaseVersion(entry.sourceVersion, manifest.pullRequest, manifest.sourceSha, manifest.attempt);
        if (entry.version !== expected) throw new Error(`Prerelease version mismatch for ${entry.name}.`);
        const packagePath = resolve(packagesDir, entry.path);
        const contents = readFileSync(packagePath, "utf8");
        const packageJson = JSON.parse(contents);
        if (
            packageJson.name !== entry.name ||
            packageJson.version !== entry.version ||
            packageJson.scramjet?.prerelease?.attempt !== manifest.attempt ||
            packageJson.scramjet?.prerelease?.sourceChecksum !== entry.sourceChecksum ||
            packageJson.scramjet?.prerelease?.packageChecksum !== entry.checksum ||
            finalPackageChecksum(packageJson) !== entry.checksum
        ) {
            throw new Error(`Prerelease package checksum mismatch for ${entry.name}.`);
        }
    }
}

function assertLivePublicationConfigured(environment = process.env) {
    if (environment.PRERELEASE_PUBLISH_ENABLED !== "true") throw new Error("Live prerelease publication is disabled.");
    if (environment.SCRAMJET_GH_PACKAGES_PRERELEASE_PUBLISHER !== PUBLISHER_CONFIGURATION) {
        throw new Error("Scoped GitHub Packages publisher configuration is unavailable.");
    }
    if (!environment.NODE_AUTH_TOKEN) throw new Error("Scoped GitHub Packages credentials are unavailable.");
    if (!environment.NPM_CONFIG_USERCONFIG) throw new Error("A scoped npm user configuration is required for live publication.");
    if (!existsSync(environment.NPM_CONFIG_USERCONFIG)) throw new Error("The scoped npm user configuration is unavailable.");
    const npmrc = readFileSync(environment.NPM_CONFIG_USERCONFIG, "utf8");
    if (!npmrc.includes(`@scramjet:registry=${REGISTRY}`) || !npmrc.includes("//npm.pkg.github.com/:_authToken=")) {
        throw new Error("npm authentication must be scoped to GitHub Packages.");
    }
    const authenticatedHosts = [...npmrc.matchAll(/^\/\/([^/]+)\/:_authToken=/gm)].map((match) => match[1]);
    if (/registry\.npmjs\.org/i.test(npmrc) || authenticatedHosts.some((host) => host !== "npm.pkg.github.com")) {
        throw new Error("npm authentication must not target registries other than GitHub Packages.");
    }
}

function publishedPackageReuse(entry, manifest, runner, environment) {
    try {
        const output = runner("npm", ["view", `${entry.name}@${entry.version}`, "name", "version", "scramjet", "--json", "--registry", REGISTRY], {
            env: environment,
            encoding: "utf8"
        });
        const published = JSON.parse(String(output));
        if (
            published.name === entry.name &&
            published.version === entry.version &&
            published.scramjet?.prerelease?.attempt === manifest.attempt &&
            published.scramjet?.prerelease?.sourceChecksum === entry.sourceChecksum &&
            published.scramjet?.prerelease?.packageChecksum === entry.checksum
        ) {
            return true;
        }
        throw new Error(`Immutable prerelease ${entry.name}@${entry.version} exists without the matching package checksum.`);
    } catch (error) {
        if (/Immutable prerelease/.test(error.message)) throw error;
        const details = `${error.message || ""}\n${error.stderr || ""}`;
        if (/(?:E404|\b404\b|not found)/i.test(details)) return false;
        throw new Error(`Unable to verify immutable prerelease ${entry.name}@${entry.version} for safe reuse.`);
    }
}

function publishManifest({ manifest, packagesDir, environment = process.env, runner = execFileSync }) {
    assertLivePublicationConfigured(environment);
    verifyManifest(manifest, packagesDir);
    const result = { published: [], reused: [] };
    for (const entry of manifest.packages) {
        if (publishedPackageReuse(entry, manifest, runner, environment)) {
            result.reused.push(entry.name);
            continue;
        }
        runner("npm", ["publish", "--registry", REGISTRY, "--tag", manifest.distTag, "--access", "restricted"], {
            cwd: resolve(packagesDir, entry.path, ".."),
            env: environment,
            stdio: "inherit"
        });
        result.published.push(entry.name);
    }
    return result;
}

function readOption(args, name) {
    const index = args.indexOf(name);
    if (index < 0 || !args[index + 1]) throw new Error(`${name} is required.`);
    return args[index + 1];
}

function main() {
    try {
        const [command] = process.argv.slice(2);
        if (command === "plan") {
            const args = process.argv.slice(3);
            const manifest = createManifest({
                packagesDir: readOption(args, "--packages-dir"),
                pullRequest: readOption(args, "--pr"),
                sha: readOption(args, "--sha"),
                attempt: readOption(args, "--attempt")
            });
            const result = writeManifest(readOption(args, "--output"), manifest);
            console.log(JSON.stringify({ checksum: manifest.checksum, status: result.status }));
        } else if (command === "publish") {
            const args = process.argv.slice(3);
            const manifest = JSON.parse(readFileSync(readOption(args, "--manifest"), "utf8"));
            publishManifest({ manifest, packagesDir: readOption(args, "--packages-dir") });
        } else {
            throw new Error("Usage: release-prerelease.js plan|publish ...");
        }
    } catch (error) {
        console.error(`[release-prerelease] ${error.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();

module.exports = {
    FORMAT,
    PUBLISHER_CONFIGURATION,
    REGISTRY,
    assertAttempt,
    assertLivePublicationConfigured,
    createManifest,
    finalPackageChecksum,
    manifestChecksum,
    publishManifest,
    publishedPackageReuse,
    releaseBaseVersion,
    releasePrereleaseVersion,
    verifyManifest,
    writeManifest
};
