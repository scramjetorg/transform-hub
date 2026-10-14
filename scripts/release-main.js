#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } = require("node:fs");
const { join, relative, resolve, sep } = require("node:path");

const { INCLUDED_PACKAGES, RELEASE_WAVES, validateReleaseWaves } = require("./lib/release-boundary.js");
const { stableVersion, releaseBranch } = require("./release-flow.js");

const FORMAT = "transform-hub-main-release-v2";
const PUBLICATION_FORMAT = "transform-hub-main-release-publication-v2";
const REGISTRY = "https://registry.npmjs.org";
const NPM_CLI = "node_modules/npm/bin/npm-cli.js";
const INVOCATION_FORMAT = "transform-hub-main-release-invocation-v1";
const DEFAULT_REPOSITORY = "scramjetorg/transform-hub";
const DEFAULT_MAIN_BRANCH = "main";
const DEFAULT_REMOTE = "origin";
const SOURCE_REPOSITORY = "https://github.com/scramjetorg/transform-hub";
const REPOSITORY_API_PATH = "repos/scramjetorg/transform-hub";
const RELEASES_ENDPOINT = `${REPOSITORY_API_PATH}/releases`;
const COMMIT_PULLS_ENDPOINT = `${REPOSITORY_API_PATH}/commits`;
const RELEASE_ASSET_ENDPOINT = `${RELEASES_ENDPOINT}/assets`;
const DEFAULT_GITHUB_PAGE_SIZE = 100;
const RELEASE_METADATA_PROJECTION = "{id,tag_name,draft,prerelease}";
const PR_METADATA_PROJECTION = "{number,merged_at,merge_commit_sha,base:{ref:.base.ref,repo:{full_name:.base.repo.full_name}},head:{ref:.head.ref,sha:.head.sha,repo:{full_name:.head.repo.full_name}}}";
const ASSET_METADATA_PROJECTION = "{id,name}";
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
function assertPositiveId(value, label) {
    if (typeof value === "number") {
        if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive safe integer.`);
        return String(value);
    }
    if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value)) || String(Number(value)) !== value)
        throw new Error(`${label} must be a canonical positive safe integer.`);
    return value;
}
function githubFailure(endpoint, method, error) {
    const byteCount = (value) => (Buffer.isBuffer(value) ? value.length : typeof value === "string" ? Buffer.byteLength(value) : 0);
    return new Error(
        `GitHub API ${method} ${endpoint} failed: code=${error?.code || "nonzero-exit"} status=${error?.status ?? "null"} signal=${error?.signal ?? "null"} stdoutBytes=${byteCount(error?.stdout)} stderrBytes=${byteCount(error?.stderr)}`,
        { cause: error }
    );
}
function githubJson(endpoint, { environment, runner, method = "GET", fields = [], jq }) {
    if (typeof environment?.GH_TOKEN !== "string" || !environment.GH_TOKEN) throw new Error("GH_TOKEN is required for GitHub API access.");
    if (typeof jq !== "string" || !jq) throw new Error("A static jq projection is required for GitHub API metadata.");
    const args = ["api", "--method", method, endpoint, "--jq", jq];
    for (const field of fields) args.push("-F", field);
    let output;
    try {
        output = runner("gh", args, { encoding: "utf8", env: environment });
    } catch (error) {
        throw githubFailure(endpoint, method, error);
    }
    let parsed;
    try {
        parsed = JSON.parse(String(output));
    } catch {
        throw new Error(`GitHub API ${method} ${endpoint} returned invalid projected JSON.`);
    }
    return parsed;
}
function readPaginated(endpoint, { environment, runner, projection, keep, maxItems, overflowMessage }) {
    const retained = [];
    for (let page = 1; ; page++) {
        const pageEndpoint = `${endpoint}?per_page=${DEFAULT_GITHUB_PAGE_SIZE}&page=${page}`;
        const jq = `if type != "array" then error("Expected GitHub collection array") else {count: length, items: map(${projection})} end`;
        const result = githubJson(pageEndpoint, { environment, runner, jq });
        if (!result || typeof result !== "object" || !Number.isInteger(result.count) || result.count < 0 || result.count > DEFAULT_GITHUB_PAGE_SIZE || !Array.isArray(result.items) || result.items.length !== result.count)
            throw new Error(`GitHub API GET ${pageEndpoint} returned an invalid projected page envelope.`);
        for (const row of result.items) {
            if (!keep(row)) continue;
            if (retained.length >= maxItems) throw new Error(overflowMessage);
            retained.push(row);
        }
        if (result.count < DEFAULT_GITHUB_PAGE_SIZE) return retained;
    }
}
function matchesMergedReleasePr(pr, expected) {
    return pr && typeof pr === "object" && typeof pr.merged_at === "string" && pr.merged_at.length > 0 &&
        typeof pr.merge_commit_sha === "string" && SHA.test(pr.merge_commit_sha) && pr.merge_commit_sha.toLowerCase() === expected.tagCommitSha &&
        pr.base?.ref === DEFAULT_MAIN_BRANCH && pr.base?.repo?.full_name === expected.repository &&
        pr.head?.repo?.full_name === expected.repository && pr.head?.ref === releaseBranch(expected.version);
}
function selectExactRelease(releases, expected) {
    if (!Array.isArray(releases)) throw new Error("GitHub releases response must be an array.");
    const matches = releases.filter((release) => release && typeof release === "object" && release.tag_name === expected.tag);
    if (matches.length !== 1) throw new Error(`Expected exactly one GitHub release for ${expected.tag}; found ${matches.length}.`);
    const release = matches[0];
    const id = assertPositiveId(release.id, "GitHub release ID");
    if (typeof release.draft !== "boolean") throw new Error(`GitHub release ${id} has an invalid draft state.`);
    if (release.prerelease !== false) throw new Error(`GitHub release ${id} must not be a prerelease.`);
    if (expected.releaseId !== undefined && id !== assertPositiveId(expected.releaseId, "Expected release ID"))
        throw new Error(`GitHub release ID ${id} does not match the expected release ID.`);
    if (expected.requirePublic && release.draft) throw new Error(`GitHub release ${id} must already be public for recovery.`);
    return release;
}
function selectExactMergedReleasePr(pulls, expected) {
    const version = stableVersion(expected.version);
    const tagCommitSha = assertSha(expected.tagCommitSha, "tag commit SHA");
    if (expected.repository !== DEFAULT_REPOSITORY) throw new Error(`Release PR repository must be ${DEFAULT_REPOSITORY}.`);
    if (!Array.isArray(pulls)) throw new Error("GitHub pull request response must be an array.");
    const matches = pulls.filter((pr) => matchesMergedReleasePr(pr, { repository: expected.repository, version, tagCommitSha }));
    if (matches.length !== 1) throw new Error(`Expected exactly one merged release PR for ${version}; found ${matches.length}.`);
    const pr = matches[0];
    const number = assertPositiveId(pr.number, "Release PR number");
    assertSha(pr.head?.sha, "release PR candidate head SHA");
    if (expected.prNumber !== undefined && number !== assertPositiveId(expected.prNumber, "Expected release PR number"))
        throw new Error(`Release PR number ${number} does not match the expected PR number.`);
    return pr;
}
function resolvePublicationIdentity({ environment = process.env, event, runner = execFileSync } = {}) {
    const invocation = event === undefined ? JSON.parse(readFileSync(environment.GITHUB_EVENT_PATH, "utf8")) : event;
    const executionSha = assertSha(environment.GITHUB_SHA, "execution SHA");
    if (environment.GITHUB_REPOSITORY !== DEFAULT_REPOSITORY) throw new Error(`Publication is restricted to ${DEFAULT_REPOSITORY}.`);
    const eventName = environment.GITHUB_EVENT_NAME;
    let mode;
    let tag;
    let version;
    let expectedTagSha;
    let expectedBundleChecksum = null;
    if (eventName === "push") {
        const prefix = "refs/tags/";
        if (typeof environment.GITHUB_REF !== "string" || !environment.GITHUB_REF.startsWith(prefix)) throw new Error("Tag publication requires a stable tag ref.");
        tag = environment.GITHUB_REF.slice(prefix.length);
        if (!tag.startsWith("v")) throw new Error("Stable tag must use canonical vX.Y.Z form.");
        version = stableVersion(tag.slice(1));
        if (tag !== `v${version}`) throw new Error("Stable tag is not canonical.");
        mode = "tag-push";
    } else if (eventName === "workflow_dispatch") {
        if (environment.GITHUB_REF !== "refs/heads/main") throw new Error("Recovery dispatch is allowed only on refs/heads/main.");
        if (environment.GITHUB_REF_PROTECTED !== "true") throw new Error("Recovery dispatch requires a protected Git ref.");
        const inputs = invocation?.inputs;
        if (!inputs || typeof inputs !== "object") throw new Error("Recovery dispatch inputs are required.");
        for (const name of ["stable_tag", "expected_tag_sha"])
            if (typeof inputs[name] !== "string") throw new Error(`Recovery input ${name} must be a string.`);
        tag = inputs.stable_tag;
        if (!tag.startsWith("v")) throw new Error("Recovery stable_tag must use canonical vX.Y.Z form.");
        version = stableVersion(tag.slice(1));
        if (tag !== `v${version}`) throw new Error("Recovery stable_tag is not canonical.");
        expectedTagSha = assertSha(inputs.expected_tag_sha, "expected tag SHA");
        if (inputs.expected_bundle_checksum !== undefined && inputs.expected_bundle_checksum !== "") {
            if (typeof inputs.expected_bundle_checksum !== "string" || !DIGEST.test(inputs.expected_bundle_checksum)) throw new Error("expected_bundle_checksum must be an optional sha256 digest.");
            expectedBundleChecksum = inputs.expected_bundle_checksum.toLowerCase();
        }
        mode = "recovery";
    } else throw new Error(`Unsupported publication event: ${String(eventName)}.`);
    if (typeof environment.GH_TOKEN !== "string" || !environment.GH_TOKEN) throw new Error("GH_TOKEN is required for publication identity resolution.");
    const run = (args) => String(runner("git", args, { encoding: "utf8", env: environment })).trim();
    const git = (args) => run(args);
    const requireMatch = (actual, expected, label) => {
        if (actual !== expected) throw new Error(`${label} mismatch: expected ${expected}, observed ${actual}.`);
    };
    requireMatch(assertSha(git(["rev-parse", "--verify", "HEAD^{commit}"]), "checked-out commit SHA"), executionSha, "Checked-out commit");
    runner("git", ["fetch", "--no-tags", DEFAULT_REMOTE, `+refs/heads/${DEFAULT_MAIN_BRANCH}:refs/remotes/${DEFAULT_REMOTE}/${DEFAULT_MAIN_BRANCH}`], { encoding: "utf8", env: environment });
    const mainSha = assertSha(git(["rev-parse", "--verify", `refs/remotes/${DEFAULT_REMOTE}/${DEFAULT_MAIN_BRANCH}^{commit}`]), "remote main SHA");
    requireMatch(mainSha, executionSha, "Remote main commit");
    runner("git", ["fetch", "--no-tags", DEFAULT_REMOTE, `refs/tags/${tag}`], { encoding: "utf8", env: environment });
    const tagObjectSha = assertSha(git(["rev-parse", "--verify", "FETCH_HEAD"]), "tag object SHA");
    const tagCommitSha = assertSha(git(["rev-parse", "--verify", "FETCH_HEAD^{commit}"]), "peeled tag commit SHA");
    if (mode === "tag-push") requireMatch(tagCommitSha, executionSha, "Tag commit");
    else {
        requireMatch(tagCommitSha, expectedTagSha, "Recorded tag commit");
        runner("git", ["merge-base", "--is-ancestor", tagCommitSha, mainSha], { encoding: "utf8", env: environment });
    }
    let packageJson;
    try { packageJson = JSON.parse(git(["show", `${tagCommitSha}:package.json`])); }
    catch { throw new Error("Tagged commit package.json is not valid JSON."); }
    requireMatch(packageJson.version, version, "Tagged package version");
    const tagTree = assertTree(git(["rev-parse", "--verify", `${tagCommitSha}^{tree}`]));
    const pulls = readPaginated(`${COMMIT_PULLS_ENDPOINT}/${tagCommitSha}/pulls`, {
        environment, runner, projection: PR_METADATA_PROJECTION,
        keep: (row) => matchesMergedReleasePr(row, { repository: DEFAULT_REPOSITORY, version, tagCommitSha }), maxItems: 1,
        overflowMessage: `Expected exactly one merged release PR for ${version}; found more than one across pages.`
    });
    const pr = selectExactMergedReleasePr(pulls, { repository: DEFAULT_REPOSITORY, version, tagCommitSha });
    const candidateHead = assertSha(pr.head.sha, "candidate head SHA");
    runner("git", ["fetch", "--no-tags", DEFAULT_REMOTE, candidateHead], { encoding: "utf8", env: environment });
    const candidateTree = assertTree(git(["rev-parse", "--verify", `${candidateHead}^{tree}`]));
    requireMatch(candidateTree, tagTree, "Candidate/tag tree");
    const releases = readPaginated(RELEASES_ENDPOINT, {
        environment, runner, projection: RELEASE_METADATA_PROJECTION,
        keep: (row) => row?.tag_name === tag, maxItems: 1,
        overflowMessage: `Expected exactly one GitHub release for ${tag}; found more than one across pages.`
    });
    const release = selectExactRelease(releases, { tag, requirePublic: mode === "recovery" });
    return {
        format: INVOCATION_FORMAT, mode, repository: DEFAULT_REPOSITORY, executionSha, tag,
        tagObjectSha, tagCommitSha, version, branch: releaseBranch(version), releaseId: assertPositiveId(release.id, "GitHub release ID"),
        releaseDraft: release.draft, prNumber: assertPositiveId(pr.number, "Release PR number"), candidateHead, candidateTree, tagTree, expectedBundleChecksum
    };
}
function publicationBindings(identity) {
    if (!identity || typeof identity !== "object" || identity.format !== INVOCATION_FORMAT) throw new Error("Publication identity format is invalid.");
    if (identity.repository !== DEFAULT_REPOSITORY || !["tag-push", "recovery"].includes(identity.mode)) throw new Error("Publication identity repository or mode is invalid.");
    const executionSha = assertSha(identity.executionSha, "execution SHA");
    assertSha(identity.tagObjectSha, "tag object SHA");
    const tagCommitSha = assertSha(identity.tagCommitSha, "tag commit SHA");
    const candidateHead = assertSha(identity.candidateHead, "candidate head SHA");
    const candidateTree = assertTree(identity.candidateTree);
    const tagTree = assertTree(identity.tagTree);
    const version = stableVersion(identity.version);
    const branch = releaseBranch(version);
    if (identity.tag !== `v${version}` || identity.branch !== branch || candidateTree !== tagTree) throw new Error("Publication identity tag, branch, or candidate/tag tree binding is invalid.");
    assertPositiveId(identity.releaseId, "release ID");
    assertPositiveId(identity.prNumber, "release PR number");
    if (typeof identity.releaseDraft !== "boolean") throw new Error("Publication identity releaseDraft must be boolean.");
    let expectedBundleChecksum;
    if (identity.mode === "tag-push") {
        if (executionSha !== tagCommitSha || identity.expectedBundleChecksum !== null) throw new Error("Tag-push publication identity has invalid commit or checksum bindings.");
    } else {
        if (identity.releaseDraft) throw new Error("Recovery publication identity requires a public release.");
        if (identity.expectedBundleChecksum !== null && (typeof identity.expectedBundleChecksum !== "string" || !DIGEST.test(identity.expectedBundleChecksum)))
            throw new Error("Recovery publication identity checksum must be null or a sha256 digest.");
        if (typeof identity.expectedBundleChecksum === "string") expectedBundleChecksum = identity.expectedBundleChecksum.toLowerCase();
    }
    return { expectedVersion: version, expectedBranch: branch, expectedCandidateHead: candidateHead, expectedCandidateTree: candidateTree, expectedMainTree: tagTree, expectedRepository: identity.repository, ...(expectedBundleChecksum ? { expectedBundleChecksum } : {}) };
}
function downloadReleaseAssets({ identity, bundleDir, assetsJsonPath, environment = process.env, runner = execFileSync }) {
    publicationBindings(identity);
    if (typeof bundleDir !== "string" || !bundleDir || typeof assetsJsonPath !== "string" || !assetsJsonPath) throw new Error("Bundle and assets JSON paths are required.");
    const root = resolve(bundleDir);
    const assetsPath = resolve(assetsJsonPath);
    const assetsRelative = relative(root, assetsPath);
    if (!assetsRelative || (assetsRelative !== ".." && !assetsRelative.startsWith(`..${sep}`))) throw new Error("Assets JSON path must be outside the bundle directory.");
    const assets = readPaginated(`${RELEASES_ENDPOINT}/${assertPositiveId(identity.releaseId, "release ID")}/assets`, {
        environment, runner, projection: ASSET_METADATA_PROJECTION, keep: () => true, maxItems: INCLUDED_PACKAGES.size + 2,
        overflowMessage: "Release asset inventory exceeds the complete release boundary."
    });
    const expectedCount = INCLUDED_PACKAGES.size + 2;
    if (assets.length !== expectedCount) throw new Error(`Expected ${expectedCount} release assets; found ${assets.length}.`);
    const ids = new Set(); const names = new Set(); let manifests = 0; let sums = 0; let tarballs = 0;
    for (const asset of assets) {
        assertPositiveId(asset?.id, "Release asset ID");
        if (ids.has(String(asset.id))) throw new Error("Release asset inventory contains duplicate IDs.");
        ids.add(String(asset.id));
        if (typeof asset.name !== "string") throw new Error("Release asset inventory contains an invalid name.");
        assertSafeAsset(asset.name);
        if (asset.name.includes("/")) throw new Error(`Unsafe release asset name: ${asset.name}`);
        if (names.has(asset.name)) throw new Error(`Duplicate release asset name: ${asset.name}`);
        names.add(asset.name);
        if (asset.name === "manifest.json") manifests++;
        else if (asset.name === "SHA256SUMS") sums++;
        else if (asset.name.endsWith(".tgz")) tarballs++;
        else throw new Error(`Unexpected release asset name: ${asset.name}`);
    }
    if (manifests !== 1 || sums !== 1 || tarballs !== INCLUDED_PACKAGES.size) throw new Error("Release asset inventory must contain manifest.json, SHA256SUMS, and the complete tarball set.");
    rmSync(root, { recursive: true, force: true });
    mkdirSync(join(root, "tarballs"), { recursive: true });
    writeFileSync(assetsPath, `${JSON.stringify(assets, null, 2)}\n`);
    for (const asset of assets) {
        const destination = asset.name === "manifest.json" || asset.name === "SHA256SUMS" ? join(root, asset.name) : join(root, "tarballs", asset.name);
        const fd = openSync(destination, "w");
        try {
            const endpoint = `${RELEASE_ASSET_ENDPOINT}/${assertPositiveId(asset.id, "Release asset ID")}`;
            try {
                runner("gh", ["api", "--method", "GET", endpoint, "--header", "Accept: application/octet-stream"], { env: environment, stdio: ["ignore", fd, "pipe"] });
            } catch (error) {
                throw githubFailure(endpoint, "GET", error);
            }
        } finally { closeSync(fd); }
    }
    return { bundleDir: root, assetsJsonPath: assetsPath, assetCount: assets.length };
}
async function finalizeRelease({ identity, bundle, bundleDir, assetsJsonPath, environment = process.env, runner = execFileSync }) {
    const bindings = publicationBindings(identity);
    await verifyBundle({ bundle, bundleDir, assetsJsonPath, ...bindings });
    const endpoint = `${RELEASES_ENDPOINT}/${assertPositiveId(identity.releaseId, "release ID")}`;
    const fresh = githubJson(endpoint, { environment, runner, jq: RELEASE_METADATA_PROJECTION });
    const selected = selectExactRelease([fresh], { tag: identity.tag, releaseId: identity.releaseId, requirePublic: identity.mode === "recovery" || !identity.releaseDraft });
    if (!selected.draft) return { releaseId: identity.releaseId, status: "already-public" };
    if (identity.mode !== "tag-push" || !identity.releaseDraft) throw new Error("Only a normal tag-push may finalize its originally draft release.");
    const patched = githubJson(endpoint, { environment, runner, method: "PATCH", fields: ["draft=false"], jq: RELEASE_METADATA_PROJECTION });
    selectExactRelease([patched], { tag: identity.tag, releaseId: identity.releaseId, requirePublic: true });
    return { releaseId: identity.releaseId, status: "published" };
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
        throw new Error(`Release assets do not exactly match manifest.json, SHA256SUMS, and the ${INCLUDED_PACKAGES.size} recorded tarballs.`);
    return true;
}
function verifyBinding(bundle, { expectedVersion, expectedBranch, expectedCandidateHead, expectedCandidateTree, expectedMainTree, expectedRepository, expectedBundleChecksum } = {}) {
    if (expectedVersion && bundle.version !== expectedVersion) throw new Error("Release bundle version does not match the expected tag.");
    if (expectedBranch && bundle.branch !== expectedBranch) throw new Error("Release bundle branch binding is invalid.");
    if (expectedCandidateHead && bundle.candidate.head !== assertSha(expectedCandidateHead, "expected candidate head SHA"))
        throw new Error("Release bundle candidate head binding is invalid.");
    if (expectedCandidateTree && bundle.candidate.tree !== assertTree(expectedCandidateTree)) throw new Error("Release bundle candidate tree binding is invalid.");
    if (expectedMainTree && bundle.candidate.tree !== assertTree(expectedMainTree)) throw new Error("Release bundle candidate tree does not match the resulting main tree.");
    if (expectedRepository) {
        if (expectedRepository !== DEFAULT_REPOSITORY || bundle.repository !== expectedRepository || bundle.source?.repository !== SOURCE_REPOSITORY || bundle.identity?.source?.repository !== SOURCE_REPOSITORY)
            throw new Error("Release bundle repository binding is invalid.");
        if (assertSha(bundle.source?.sha, "bundle source SHA") !== assertSha(bundle.candidate?.head, "candidate head SHA") || assertSha(bundle.identity?.source?.sha, "identity source SHA") !== assertSha(bundle.candidate?.head, "candidate head SHA"))
            throw new Error("Release bundle source SHA binding is invalid.");
    }
    if (expectedBundleChecksum !== undefined) {
        if (!DIGEST.test(expectedBundleChecksum) || bundle.outerChecksum !== expectedBundleChecksum.toLowerCase()) throw new Error("Release bundle outer checksum does not match the recorded checksum.");
    }
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
    expectedMainTree,
    expectedRepository,
    expectedBundleChecksum
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
    verifyBinding(bundle, { expectedVersion, expectedBranch, expectedCandidateHead, expectedCandidateTree, expectedMainTree, expectedRepository, expectedBundleChecksum });
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
                console.log(`[release-main] INFO ${name}@${entry.version} wave=${wave.number} reused`);
            } else {
                runner(process.execPath, npmArgs(["publish", join(tarballsDir, item.name), "--provenance", "--access", "public", "--tag", "latest", "--registry", REGISTRY]), {
                    env: environment,
                    stdio: "inherit"
                });
                waveResult.published.push(name);
                result.published.push(name);
                console.log(`[release-main] INFO ${name}@${entry.version} wave=${wave.number} published`);
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
    const identityPath = optionalOption(args, "--identity");
    const expectedFlags = ["--expected-version", "--expected-branch", "--expected-candidate-head", "--expected-candidate-tree", "--expected-main-tree", "--expected-repository", "--expected-bundle-checksum"];
    if (identityPath) {
        if (expectedFlags.some((flag) => args.includes(flag))) throw new Error("--identity cannot be combined with --expected-* flags.");
        return { assetsJsonPath: optionalOption(args, "--assets-json"), ...publicationBindings(JSON.parse(readFileSync(identityPath, "utf8"))) };
    }
    return {
        assetsJsonPath: optionalOption(args, "--assets-json"),
        expectedVersion: optionalOption(args, "--expected-version"),
        expectedBranch: optionalOption(args, "--expected-branch"),
        expectedCandidateHead: optionalOption(args, "--expected-candidate-head"),
        expectedCandidateTree: optionalOption(args, "--expected-candidate-tree"),
        expectedMainTree: optionalOption(args, "--expected-main-tree"),
        expectedRepository: optionalOption(args, "--expected-repository"),
        expectedBundleChecksum: optionalOption(args, "--expected-bundle-checksum")
    };
}
async function main() {
    const [command, ...args] = process.argv.slice(2);
    if (command === "resolve-publication") {
        const identity = resolvePublicationIdentity();
        const output = option(args, "--output");
        writeFileSync(output, `${JSON.stringify(identity, null, 2)}\n`);
        console.log(`[release-main] INFO resolved mode=${identity.mode} repository=${identity.repository} execution=${identity.executionSha} tag=${identity.tag} tagObject=${identity.tagObjectSha} tagCommit=${identity.tagCommitSha} pr=${identity.prNumber} candidate=${identity.candidateHead} candidateTree=${identity.candidateTree} tagTree=${identity.tagTree} release=${identity.releaseId} draft=${identity.releaseDraft} checksum=${identity.expectedBundleChecksum || "not-supplied"}`);
    } else if (command === "download-assets") {
        const result = downloadReleaseAssets({ identity: JSON.parse(readFileSync(option(args, "--identity"), "utf8")), bundleDir: option(args, "--bundle"), assetsJsonPath: option(args, "--assets-json") });
        console.log(`[release-main] INFO downloaded ${result.assetCount} assets to ${result.bundleDir}; inventory=${result.assetsJsonPath}`);
    } else if (command === "finalize-release") {
        const identity = JSON.parse(readFileSync(option(args, "--identity"), "utf8"));
        const bundleDir = option(args, "--bundle");
        const result = await finalizeRelease({ identity, bundle: JSON.parse(readFileSync(join(bundleDir, "manifest.json"), "utf8")), bundleDir, assetsJsonPath: option(args, "--assets-json") });
        console.log(`[release-main] INFO release ${result.releaseId} ${result.status}`);
    } else if (command === "bundle")
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
    } else throw new Error("Usage: release-main.js bundle|verify-bundle|verify-draft|publish|resolve-publication|download-assets|finalize-release");
}
if (require.main === module)
    main().catch((error) => {
        console.error(`[release-main] ${error.message}`);
        process.exitCode = 1;
    });
module.exports = {
    FORMAT,
    INVOCATION_FORMAT,
    DEFAULT_REPOSITORY,
    SOURCE_REPOSITORY,
    PUBLICATION_FORMAT,
    REGISTRY,
    NPM_CLI,
    canonicalJson,
    bundleChecksum,
    createBundle,
    createRelease,
    selectExactRelease,
    selectExactMergedReleasePr,
    resolvePublicationIdentity,
    publicationBindings,
    downloadReleaseAssets,
    finalizeRelease,
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
