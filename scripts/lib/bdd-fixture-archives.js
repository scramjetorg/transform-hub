const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const tar = require("tar");

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function filesUnder(root, current = root) {
    return fs
        .readdirSync(current, { withFileTypes: true })
        .flatMap((entry) => {
            const absolute = path.join(current, entry.name);
            if (entry.isDirectory()) return filesUnder(root, absolute);
            if (!entry.isFile()) throw new Error(`Unsupported fixture entry: ${absolute}`);
            return [path.relative(root, absolute).split(path.sep).join("/")];
        })
        .sort();
}

function sourceManifest(root) {
    return filesUnder(root).map((relative) => ({
        path: relative,
        sha256: sha256(fs.readFileSync(path.join(root, relative)))
    }));
}

async function validateArchive(archive, expected) {
    const expectedByPath = new Map(expected.map((entry) => [entry.path, entry.sha256]));
    const seen = new Set();
    await tar.t({
        file: archive,
        onentry: (entry) => {
            const hash = crypto.createHash("sha256");
            entry.on("data", (chunk) => hash.update(chunk));
            entry.on("end", () => {
                if (entry.path === "") return;
                const digest = hash.digest("hex");
                if (!expectedByPath.has(entry.path) || expectedByPath.get(entry.path) !== digest) {
                    throw new Error(`Archive integrity mismatch for ${archive}: ${entry.path}`);
                }
                seen.add(entry.path);
            });
        }
    });
    if (seen.size !== expectedByPath.size || [...expectedByPath.keys()].some((entryPath) => !seen.has(entryPath))) {
        throw new Error(`Archive integrity mismatch for ${archive}`);
    }
    return expected;
}

async function packFixtureSet({ fixturesDir, outputDir, prefix, outputName = (name) => `${name}.tar.gz`, fixtureNames }) {
    const root = path.resolve(fixturesDir);
    const out = path.resolve(outputDir);
    if (!fs.existsSync(root)) throw new Error(`Fixtures directory not found: ${root}`);
    const relativeOutput = path.relative(root, out);
    if (!relativeOutput.startsWith("..") && !path.isAbsolute(relativeOutput)) {
        throw new Error(`Archive output must be outside the fixture source tree: ${out}`);
    }
    fs.mkdirSync(out, { recursive: true });

    const fixtureDirs = (fixtureNames || fs.readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
        .map((entry) => entry.name)
        .sort());
    if (!fixtureDirs.length) throw new Error(`No ${prefix} fixture directories found.`);

    const expectedNames = new Set(fixtureDirs.map((name) => outputName(name)));
    for (const entry of fs.readdirSync(out)) {
        if (fs.statSync(path.join(out, entry)).isDirectory()) throw new Error(`Unexpected archive output directory: ${entry}`);
        if (entry.endsWith(".tar.gz") && !expectedNames.has(entry)) fs.rmSync(path.join(out, entry), { force: true });
    }

    const manifest = { version: 1, sourceRoot: root, archives: [] };
    for (const name of fixtureDirs) {
        const source = path.join(root, name);
        const sourceFiles = sourceManifest(source);
        const archiveFile = outputName(name);
        const archive = path.join(out, archiveFile);
        await tar.c({ cwd: source, gzip: true, portable: true, file: archive }, filesUnder(source));
        const entries = await validateArchive(archive, sourceFiles);
        manifest.archives.push({ name, source: name, output: archiveFile, files: sourceFiles, entries, archiveSha256: sha256(fs.readFileSync(archive)) });
    }
    const manifestPath = path.join(out, "manifest.json");
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return { outputDir: out, manifestPath, manifest };
}

async function packCanonicalFixtureSet({ fixturesDir, outputDir, manifestPath, key, prefix, ...options }) {
    const canonicalManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const canonical = canonicalManifest[key];
    if (!Array.isArray(canonical) || canonical.length === 0) throw new Error(`Empty canonical fixture manifest: ${key}`);
    const root = path.resolve(fixturesDir);
    const generatedNames = new Set([`${key}-packages`]);
    const unexpected = fs.readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
        .filter((entry) => !generatedNames.has(entry.name))
        .map((entry) => entry.name)
        .filter((name) => !canonical.includes(name));
    if (unexpected.length) throw new Error(`Unexpected ${key} fixture directories: ${unexpected.join(", ")}`);
    for (const name of canonical) {
        const source = path.join(root, name);
        if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) throw new Error(`Canonical fixture directory is missing: ${name}`);
    }
    return packFixtureSet({ ...options, fixturesDir, outputDir, prefix, fixtureNames: canonical });
}

function validateManifest(manifestPath) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifest.version !== 1 || !Array.isArray(manifest.archives)) throw new Error(`Invalid BDD archive manifest: ${manifestPath}`);
    for (const archive of manifest.archives) {
        const archivePath = path.join(path.dirname(manifestPath), archive.output);
        if (!fs.existsSync(archivePath)) throw new Error(`Manifest archive is missing: ${archive.output}`);
        if (sha256(fs.readFileSync(archivePath)) !== archive.archiveSha256) throw new Error(`Archive changed after packing: ${archive.output}`);
        const source = path.join(manifest.sourceRoot, archive.source);
        if (JSON.stringify(sourceManifest(source)) !== JSON.stringify(archive.files)) {
            throw new Error(`Fixture source changed after packing: ${archive.source}`);
        }
    }
    return manifest;
}

module.exports = { filesUnder, sourceManifest, packFixtureSet, packCanonicalFixtureSet, validateArchive, validateManifest, sha256 };
