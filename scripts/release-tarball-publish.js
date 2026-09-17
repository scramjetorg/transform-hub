#!/usr/bin/env node
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { https } = require("node:https");
const { lstatSync, mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { isAbsolute, join, resolve } = require("node:path");
const tar = require("tar");

const { digestDocument, validateArtifactContent, validateReleaseSet } = require("./release-contract");
const { validatePublicationJournal } = require("./release-production");

const DEFAULT_REGISTRY = "https://registry.npmjs.org";

function sha256(bytes) {
    return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
function sri(bytes) {
    return `sha256-${createHash("sha256").update(bytes).digest("base64")}`;
}

function immutableSnapshot(value) {
    if (value && typeof value === "object") {
        for (const child of Object.values(value)) immutableSnapshot(child);
        Object.freeze(value);
    }
    return value;
}

function manifestOf(file) {
    const directory = mkdtempSync(join(tmpdir(), "release-publish-"));
    try {
        tar.x({ file, cwd: directory, sync: true, strict: true });
        return JSON.parse(readFileSync(join(directory, "package", "package.json"), "utf8"));
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
}

function request(url) {
    return new Promise((resolvePromise, reject) => {
        https
            .get(url, (response) => {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    response.resume();
                    reject(new Error(`Registry download failed with HTTP ${response.statusCode}.`));
                    return;
                }
                const chunks = [];
                response.on("data", (chunk) => chunks.push(chunk));
                response.on("end", () => resolvePromise(Buffer.concat(chunks)));
                response.on("error", reject);
            })
            .on("error", reject);
    });
}

async function downloadRegistryTarball(name, version, registry) {
    let metadata;
    try {
        metadata = JSON.parse((await request(`${registry.replace(/\/$/, "")}/${encodeURIComponent(name)}`)).toString("utf8"));
    } catch (error) {
        if (/HTTP 404/.test(error.message)) return null;
        throw error;
    }
    const versionData = metadata.versions?.[version];
    const tarball = versionData?.dist?.tarball;
    if (!tarball) return null;
    return request(tarball);
}

function registryDownloader(registry) {
    return ({ name, version }) => downloadRegistryTarball(name, version, registry);
}

function assertInputs({ releaseSet, root, tarballPaths }) {
    validateReleaseSet(releaseSet);
    if (!isAbsolute(resolve(root || process.cwd()))) throw new Error("Publisher root must be absolute.");
    if (!Array.isArray(tarballPaths) || tarballPaths.length !== releaseSet.artifacts.tarballs.length) throw new Error("Publisher must receive exactly the release-set tarballs.");
    const expected = new Map(releaseSet.artifacts.tarballs.map((artifact) => [resolve(root, artifact.path), artifact]));
    const seen = new Set();
    return tarballPaths.map((file) => {
        if (typeof file !== "string" || !isAbsolute(file) || !file.endsWith(".tgz")) throw new Error("Publisher tarball paths must be absolute .tgz files.");
        const absolute = resolve(file);
        const artifact = expected.get(absolute);
        if (!artifact) throw new Error(`Tarball is not listed in the release set: ${file}`);
        if (seen.has(absolute)) throw new Error(`Duplicate publisher tarball: ${file}`);
        seen.add(absolute);
        const stat = lstatSync(absolute, { throwIfNoEntry: false });
        if (!stat || !stat.isFile() || stat.isSymbolicLink()) throw new Error(`Publisher tarball must be a regular file: ${file}`);
        validateArtifactContent(root, artifact);
        return { file: absolute, artifact };
    });
}

async function publishTarballs({
    releaseSet,
    root = process.cwd(),
    tarballPaths,
    release,
    registry = process.env.npm_config_registry || process.env.NPM_CONFIG_REGISTRY || DEFAULT_REGISTRY,
    npmRunner = execFileSync,
    registryDownloader: download = registryDownloader(registry),
    priorJournal = null,
    onJournalSnapshot = null,
    now = () => new Date(),
    producer = { workflow: process.env.GITHUB_WORKFLOW || "github-actions", runId: process.env.GITHUB_RUN_ID || "unknown", actor: process.env.GITHUB_ACTOR || "unknown" },
    onlyPackages = null
}) {
    if (typeof registry !== "string" || !registry || /\s/.test(registry)) throw new Error("A configured registry is required.");
    if (onJournalSnapshot !== null && typeof onJournalSnapshot !== "function") throw new Error("onJournalSnapshot must be a function.");
    if (release?.tag && release.tag !== "latest") throw new Error("Only the latest npm tag may be published.");
    const entries = assertInputs({ releaseSet, root: resolve(root), tarballPaths });
    const manifests = entries.map(({ file, artifact }) => {
        const manifest = manifestOf(file);
        if (manifest.name !== artifact.name) throw new Error(`Tarball manifest name does not match release set: ${artifact.name}`);
        if (typeof manifest.version !== "string" || !manifest.version) throw new Error(`${artifact.name} tarball version is required.`);
        return { file, artifact, manifest };
    });
    const byName = new Map(manifests.map((entry) => [entry.manifest.name, entry]));
    if (priorJournal) validatePublicationJournal(priorJournal);
    const events = priorJournal ? [...priorJournal.events] : [];
    const selected = onlyPackages ? new Set(onlyPackages) : null;
    const publishedNames = new Set(events.map((event) => event.package));
    if (selected) for (const name of selected) publishedNames.delete(name);
    const priorDigest = () => (events.length ? events[events.length - 1].digest : null);
    const releaseInfo = release || {};
    const version = releaseInfo.version || manifests[0].manifest.version;
    if (manifests.some((entry) => entry.manifest.version !== version)) throw new Error("Release tarball versions must match the release tuple.");
    const journalRelease = {
        releaseId: releaseInfo.releaseId,
        version,
        sourceSha: releaseInfo.sourceSha || releaseSet.source.sha,
        releaseSetDigest: releaseInfo.releaseSetDigest || digestDocument(releaseSet),
        sealedStateDigest: releaseInfo.sealedStateDigest
    };
    if (!Number.isSafeInteger(journalRelease.releaseId) || journalRelease.releaseId <= 0) throw new Error("A positive releaseId is required for the publication journal.");
    if (!journalRelease.sealedStateDigest) throw new Error("A sealedStateDigest is required for the publication journal.");
    if (selected && [...selected].some((name) => !byName.has(name))) throw new Error("Recovery may publish only release-set packages.");
    // Preflight is the only registry read performed by the publisher.  It is
    // deliberately complete before the first npm publish is accepted.
    const preflight = new Map();
    for (const entry of manifests) {
        if (publishedNames.has(entry.manifest.name) || selected && !selected.has(entry.manifest.name)) continue;
        const existingResult = await download({ name: entry.manifest.name, version: entry.manifest.version, tag: "latest" });
        const existing = existingResult && Buffer.isBuffer(existingResult) ? existingResult : existingResult?.bytes;
        if (existingResult?.tag && existingResult.tag !== "latest") throw new Error(`Only the latest npm tag may be reused for ${entry.manifest.name}.`);
        if (existing && sha256(existing) !== sha256(readFileSync(entry.file))) throw new Error(`Existing registry tarball for ${entry.manifest.name}@${version} does not match the requested tarball.`);
        preflight.set(entry.manifest.name, existing || null);
    }
    for (const wave of releaseSet.waves) {
        for (const name of wave) {
            const entry = byName.get(name);
            if (!entry) throw new Error(`Release wave package is missing a tarball: ${name}`);
            if (publishedNames.has(name)) continue;
            const bytes = readFileSync(entry.file);
            const localSha = sha256(bytes);
            const localSri = sri(bytes);
            const existing = preflight.get(name);
            let action = "published";
            let registryBytes = existing;
            if (registryBytes) {
                if (sha256(registryBytes) !== localSha) throw new Error(`Existing registry tarball for ${name}@${version} does not match the requested tarball.`);
                action = "reused";
            } else {
                npmRunner("npm", ["publish", entry.file, "--ignore-scripts", "--provenance", "--access", "public", "--tag", "latest", "--registry", registry], {
                    stdio: "inherit"
                });
                registryBytes = bytes;
            }
            const verifiedManifest = manifestOfBuffer(registryBytes);
            if (verifiedManifest.name !== name || verifiedManifest.version !== entry.manifest.version) throw new Error(`Registry tarball identity mismatch for ${name}.`);
            // Recovery republishes only the verifier's missing names; the
            // original accepted event remains the immutable publication fact.
            if (selected && priorJournal?.events.some((event) => event.package === name)) {
                publishedNames.add(name);
                continue;
            }
            const body = {
                sequence: events.length + 1,
                package: name,
                version: entry.manifest.version,
                action,
                tarballSha256: localSha,
                tarballSri: localSri,
                registryTarballSha256: sha256(registryBytes),
                registryTarballSri: sri(registryBytes),
                priorDigest: priorDigest(),
                acceptedAt: now().toISOString()
            };
            events.push({ ...body, digest: digestDocument(body) });
            publishedNames.add(name);
            validatePublicationJournal({
                schema: "publication-journal.v1",
                releaseSetDigest: journalRelease.releaseSetDigest,
                release: journalRelease,
                events,
                headDigest: events.at(-1).digest
            });
            if (onJournalSnapshot) {
                const snapshot = immutableSnapshot(JSON.parse(JSON.stringify({
                    schema: "publication-journal.v1",
                    releaseSetDigest: journalRelease.releaseSetDigest,
                    release: journalRelease,
                    events,
                    headDigest: events.at(-1).digest
                })));
                await onJournalSnapshot(snapshot);
            }
        }
    }
    const journal = {
        schema: "publication-journal.v1",
        status: "final",
        publicationCompletedAt: now().toISOString(),
        producer,
        releaseSetDigest: journalRelease.releaseSetDigest,
        release: journalRelease,
        events,
        headDigest: events.at(-1)?.digest || null
    };
    validatePublicationJournal(journal);
    return journal;
}

// Buffer tarball verification without writing registry bytes into the workspace.
function manifestOfBuffer(bytes) {
    const directory = mkdtempSync(join(tmpdir(), "release-publish-registry-"));
    const file = join(directory, "registry.tgz");
    require("node:fs").writeFileSync(file, bytes);
    try {
        return manifestOf(file);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
}

module.exports = { publishTarballs, manifestOf, sha256, sri };
