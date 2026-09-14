const { createHash } = require("node:crypto");
const { copyFileSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, writeFileSync } = require("node:fs");
const { execFileSync, spawnSync } = require("node:child_process");
const { dirname, isAbsolute, join, relative, resolve, sep } = require("node:path");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { digestDocument } = require("./provenance.js");

const PROFILE_PATH = join(__dirname, "runtime-profile.v1.json");
const DIGEST = /^sha256:[a-f0-9]{64}$/i;
function filesUnder(root, prefix = "") {
    return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
        const relative = join(prefix, entry.name);
        return entry.isDirectory() ? filesUnder(root, relative) : [relative];
    });
}

function fileDigest(path) {
    return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

function symlinkTarget(path) {
    const target = readlinkSync(path);
    if (isAbsolute(target) || target.includes("\0")) throw new Error(`Unsafe runtime dependency symlink: ${path}`);
    return target;
}

function assertSafeSymlink(root, path, target) {
    const destination = resolve(dirname(path), target);
    const escaped = relative(resolve(root), destination);
    if (escaped === ".." || escaped.startsWith(`..${sep}`) || isAbsolute(escaped)) {
        throw new Error(`Unsafe runtime dependency symlink: ${path}`);
    }
}

function manifestEntry(root, path) {
    const stat = lstatSync(path);
    const relativePath = path.slice(resolve(root).length + 1);
    if (stat.isSymbolicLink()) {
        const target = symlinkTarget(path);
        assertSafeSymlink(root, path, target);
        return { path: relativePath, type: "symlink", target };
    }
    return { path: relativePath, sha256: fileDigest(path), size: stat.size };
}

function loadRuntimeProfile(root = resolve(__dirname, "../..")) {
    const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8"));
    for (const artifact of [profile.bun, profile.yarn]) {
        if (!artifact?.url || !/^https:\/\//.test(artifact.url) || !/^[a-f0-9]{64}$/i.test(artifact.sha256)) {
            throw new Error("Runtime profile contains an invalid artifact pin.");
        }
    }
    for (const entry of [profile.python.requirements, profile.python.config]) {
        if (!entry?.path || !DIGEST.test(entry.sha256) || fileDigest(join(root, entry.path)) !== entry.sha256.toLowerCase()) {
            throw new Error(`Runtime profile Python digest mismatch: ${entry?.path || "missing"}`);
        }
    }
    return profile;
}

function runtimeDependencyDigest(profile = loadRuntimeProfile()) {
    return digestDocument(profile);
}

function download(url) {
    const temporary = mkdtempSync(join(tmpdir(), "scramjet-runtime-download-"));
    const destination = join(temporary, "artifact");
    try {
        execFileSync("curl", ["--fail", "--location", "--retry", "3", "--retry-all-errors", "--silent", "--show-error", "--output", destination, url], { stdio: "pipe" });
        return Promise.resolve(readFileSync(destination));
    } finally {
        rmSync(temporary, { recursive: true, force: true });
    }
}

async function prefetchPythonWheels({ root, wheelhouse, fetch = download }) {
    const profile = loadRuntimeProfile(root);
    const verser2 = profile.python.wheelhouse.verser2;
    const verser2Payload = await fetch(verser2.url);
    const verser2Actual = createHash("sha256").update(verser2Payload).digest("hex");
    if (verser2Actual !== verser2.sha256.toLowerCase()) throw new Error("Runtime dependency hash mismatch: verser2");
    writeFileSync(join(wheelhouse, "verser2_guest_python-0.4.2-py3-none-any.whl"), verser2Payload);
    const requirements = join(root, profile.python.requirements.path);
    const result = spawnSync("python3", [
        "-m", "pip", "download", "--disable-pip-version-check", "--only-binary=:all:",
        "--platform", profile.python.wheelhouse.platform, "--implementation", "cp", "--python-version", profile.python.wheelhouse.python,
        "--require-hashes", "--find-links", wheelhouse, "--dest", wheelhouse, "-r", requirements,
    ], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(`Python runtime wheel prefetch failed: ${result.stderr || result.stdout}`);
}
async function prefetchRunnerYarnCache({ root, cache, version }) {
    const packagePath = join(root, "packages/runner");
    const packageJsonPath = join(packagePath, "package.json");
    const lockfilePath = join(packagePath, "yarn.lock");
    const stagingFolder = mkdtempSync(join(tmpdir(), "scramjet-runner-yarn-project-"));
    const modulesFolder = mkdtempSync(join(tmpdir(), "scramjet-runner-yarn-modules-"));
    try {
        // The repository root is an npm workspace, so Yarn v1 otherwise walks up
        // to it and silently resolves without packages/runner/yarn.lock. Stage
        // the committed package metadata unchanged to make --frozen-lockfile
        // enforce the runner lockfile without manufacturing a new dependency set.
        copyFileSync(packageJsonPath, join(stagingFolder, "package.json"));
        copyFileSync(lockfilePath, join(stagingFolder, "yarn.lock"));
        const result = spawnSync("npx", ["--yes", `yarn@${version}`, "install", "--production", "--ignore-engines", "--ignore-scripts", "--frozen-lockfile", "--modules-folder", modulesFolder, "--cache-folder", cache], { cwd: stagingFolder, encoding: "utf8", env: { ...process.env, RAYON_NUM_THREADS: "1" } });
        if (result.status !== 0) throw new Error(`Runner Yarn cache prefetch failed: ${result.stderr || result.stdout}`);
        return {
            lockfileSha256: fileDigest(lockfilePath),
            packageJsonSha256: fileDigest(packageJsonPath),
            cacheFiles: filesUnder(cache).sort()
        };
    } finally {
        rmSync(stagingFolder, { recursive: true, force: true });
        rmSync(modulesFolder, { recursive: true, force: true });
    }
}

async function prefetchRuntimeDependencies({ root = resolve(__dirname, "../.."), output, fetch = download, prefetchPython = prefetchPythonWheels } = {}) {
    if (!output) throw new Error("Runtime dependency prefetch requires an output directory.");
    const profile = loadRuntimeProfile(root);
    const bundle = resolve(output);
    mkdirSync(join(bundle, "python", "wheelhouse"), { recursive: true });
    mkdirSync(join(bundle, "yarn"), { recursive: true });
    const files = [];
    for (const [name, artifact] of [["bun", profile.bun], ["yarn", profile.yarn]]) {
        const payload = await fetch(artifact.url);
        const actual = createHash("sha256").update(payload).digest("hex");
        if (actual !== artifact.sha256.toLowerCase()) throw new Error(`Runtime dependency hash mismatch: ${name}`);
        const path = join(bundle, name, name === "bun" ? "bun-linux-x64.zip" : "yarn.tar.gz");
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, payload);
        files.push({ path: path.slice(bundle.length + 1), sha256: `sha256:${actual}`, size: payload.length });
    }
    const runner = await prefetchRunnerYarnCache({ root, cache: join(bundle, "yarn", "cache"), version: profile.yarn.version });
    for (const path of filesUnder(join(bundle, "yarn", "cache"))) {
        const entry = manifestEntry(bundle, join(bundle, "yarn", "cache", path));
        files.push({ ...entry, path: join("yarn", "cache", path) });
    }
    await prefetchPython({ root, wheelhouse: join(bundle, "python", "wheelhouse"), fetch });
    for (const name of readdirSync(join(bundle, "python", "wheelhouse")).sort()) {
        if (!name.endsWith(".whl")) throw new Error(`Unexpected Python wheelhouse file: ${name}`);
        const path = join(bundle, "python", "wheelhouse", name);
        const payload = readFileSync(path);
        const actual = createHash("sha256").update(payload).digest("hex");
        files.push({ path: path.slice(bundle.length + 1), sha256: `sha256:${actual}`, size: payload.length });
    }
    const manifest = {
        schema: "https://scramjet.org/transform-hub/checkpoint/runtime-dependencies-manifest/v1",
        platform: profile.platform,
        profileDigest: runtimeDependencyDigest(profile),
        runner,
        files: files.sort((left, right) => left.path.localeCompare(right.path))
    };
    mkdirSync(bundle, { recursive: true });
    writeFileSync(join(bundle, "manifest.v1.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest;
}

function verifyRuntimeManifest(bundle, profile = loadRuntimeProfile()) {
    const manifest = JSON.parse(readFileSync(join(bundle, "manifest.v1.json"), "utf8"));
    if (manifest.profileDigest !== runtimeDependencyDigest(profile)) throw new Error("Runtime dependency profile digest mismatch.");
    if (!manifest.runner || !DIGEST.test(manifest.runner.lockfileSha256) || !DIGEST.test(manifest.runner.packageJsonSha256) || !Array.isArray(manifest.runner.cacheFiles) || manifest.runner.cacheFiles.length === 0) {
        throw new Error("Runtime dependency manifest does not prove the runner production lockfile cache.");
    }
    const listed = new Set((manifest.files || []).map(({ path }) => path));
    const cacheFiles = filesUnder(join(bundle, "yarn", "cache")).sort();
    if (JSON.stringify(cacheFiles) !== JSON.stringify(manifest.runner.cacheFiles.map((path) => path.replace(/^yarn\/cache\//, "")).sort())) {
        throw new Error("Runtime dependency manifest runner cache does not match the committed cache.");
    }
    for (const path of filesUnder(bundle)) if (path !== "manifest.v1.json" && !listed.has(path)) throw new Error(`Unlisted runtime dependency file: ${path}`);
    for (const file of manifest.files || []) {
        if (file.path === "manifest.v1.json" || file.path.includes("..") || file.path.startsWith("/")) throw new Error("Invalid runtime dependency manifest path.");
        const actualPath = join(bundle, file.path);
        const stat = lstatSync(actualPath, { throwIfNoEntry: false });
        if (!stat) throw new Error(`Missing runtime dependency file: ${file.path}`);
        if (file.type === "symlink") {
            if (!stat.isSymbolicLink() || typeof file.target !== "string") throw new Error(`Runtime dependency symlink mismatch: ${file.path}`);
            const target = symlinkTarget(actualPath);
            assertSafeSymlink(bundle, actualPath, target);
            if (target !== file.target) throw new Error(`Runtime dependency symlink target mismatch: ${file.path}`);
        } else {
            if (stat.isSymbolicLink() || file.type) throw new Error(`Runtime dependency file type mismatch: ${file.path}`);
            if (fileDigest(actualPath) !== file.sha256) throw new Error(`Runtime dependency file hash mismatch: ${file.path}`);
        }
    }
    return manifest;
}

module.exports = { fileDigest, loadRuntimeProfile, prefetchRuntimeDependencies, runtimeDependencyDigest, verifyRuntimeManifest };
