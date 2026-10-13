"use strict";

const test = require("ava").default;
const { execFileSync, spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { INCLUDED_PACKAGES, RELEASE_WAVES, validateReleaseWaves } = require("../lib/release-boundary.js");
const { DEFAULT_REPOSITORY, INVOCATION_FORMAT, bundleChecksum, createRelease, downloadReleaseAssets, fileSha256, finalizeRelease, publicationBindings, publishBundle, publishedReuse, releasePackageChecksum, resolvePublicationIdentity, selectExactMergedReleasePr, selectExactRelease, validateAssetList, verifyBundle, verifyRelease } = require("../release-main.js");

const SHA = "a".repeat(40);
const ENVIRONMENT = { ACTIONS_ID_TOKEN_REQUEST_TOKEN: "token", ACTIONS_ID_TOKEN_REQUEST_URL: "url", MAIN_RELEASE_PUBLISH_ENABLED: "true" };
const SUBSET_BOUNDARY = new Set(["@scramjet/a", "@scramjet/b"]);

function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), "immutable-release-"));
    t.teardown(() => rmSync(root, { force: true, recursive: true }));
    for (const name of INCLUDED_PACKAGES) { const directory = join(root, name.replace("@scramjet/", "")); mkdirSync(directory, { recursive: true }); writeFileSync(join(directory, "package.json"), `${JSON.stringify({ name, version: "2.2.0-devel" }, null, 2)}\n`); }
    return root;
}

function sha256(value) {
    return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function scriptedRunner(t, steps) {
    return (command, args, options) => {
        const step = steps.shift();
        t.truthy(step, `unexpected command ${command} ${args.join(" ")}`);
        t.is(command, step.command);
        t.deepEqual(args, step.args);
        t.deepEqual(options.env, step.environment);
        if (step.error) throw step.error;
        return step.stdout;
    };
}

function resolverQueue({ environment, mode, releaseDraft = false }) {
    const execution = environment.GITHUB_SHA;
    const tagCommit = mode === "tag-push" ? execution : "b".repeat(40);
    const tagObject = "c".repeat(40);
    const candidate = "d".repeat(40);
    const tree = "e".repeat(40);
    const repo = DEFAULT_REPOSITORY;
    const pr = { number: 456, merged_at: "2026-10-13T00:00:00Z", merge_commit_sha: tagCommit, base: { ref: "main", repo: { full_name: repo } }, head: { ref: "release/2.2.0", sha: candidate, repo: { full_name: repo } } };
    const release = { id: 123, tag_name: "v2.2.0", draft: releaseDraft, prerelease: false, target_commitish: candidate };
    const git = (args, stdout = "\n") => ({ command: "git", args, environment, stdout });
    const gh = (args, stdout) => ({ command: "gh", args, environment, stdout });
    const projectionPage = (projection, endpoint, page, items) => ({
        command: "gh",
        args: ["api", "--method", "GET", `${endpoint}?per_page=100&page=${page}`, "--jq", `if type != "array" then error("Expected GitHub collection array") else {count: length, items: map(${projection})} end`],
        environment,
        stdout: JSON.stringify({ count: items.length, items })
    });
    const unrelatedPrs = Array.from({ length: 100 }, (_, index) => ({ number: index + 900, merged_at: null, merge_commit_sha: null, base: { ref: "maintenance", repo: { full_name: repo } }, head: { ref: "maintenance", sha: candidate, repo: { full_name: repo } } }));
    const unrelatedReleases = Array.from({ length: 100 }, (_, index) => ({ id: index + 900, tag_name: `v9.${index}.0`, draft: false, prerelease: false }));
    const steps = [
        git(["rev-parse", "--verify", "HEAD^{commit}"], `${execution}\n`),
        git(["fetch", "--no-tags", "origin", "+refs/heads/main:refs/remotes/origin/main"]),
        git(["rev-parse", "--verify", "refs/remotes/origin/main^{commit}"], `${execution}\n`),
        git(["fetch", "--no-tags", "origin", "refs/tags/v2.2.0"]),
        git(["rev-parse", "--verify", "FETCH_HEAD"], `${tagObject}\n`),
        git(["rev-parse", "--verify", "FETCH_HEAD^{commit}"], `${tagCommit}\n`)
    ];
    if (mode === "recovery") steps.push(git(["merge-base", "--is-ancestor", tagCommit, execution]));
    steps.push(
        git(["show", `${tagCommit}:package.json`], JSON.stringify({ version: "2.2.0" })),
        git(["rev-parse", "--verify", `${tagCommit}^{tree}`], `${tree}\n`),
        projectionPage("{number,merged_at,merge_commit_sha,base:{ref:.base.ref,repo:{full_name:.base.repo.full_name}},head:{ref:.head.ref,sha:.head.sha,repo:{full_name:.head.repo.full_name}}}", `repos/${repo}/commits/${tagCommit}/pulls`, 1, unrelatedPrs),
        projectionPage("{number,merged_at,merge_commit_sha,base:{ref:.base.ref,repo:{full_name:.base.repo.full_name}},head:{ref:.head.ref,sha:.head.sha,repo:{full_name:.head.repo.full_name}}}", `repos/${repo}/commits/${tagCommit}/pulls`, 2, [pr]),
        git(["fetch", "--no-tags", "origin", candidate]),
        git(["rev-parse", "--verify", `${candidate}^{tree}`], `${tree}\n`),
        projectionPage("{id,tag_name,draft,prerelease}", `repos/${repo}/releases`, 1, unrelatedReleases),
        projectionPage("{id,tag_name,draft,prerelease}", `repos/${repo}/releases`, 2, [release])
    );
    return { steps, execution, tagCommit, tagObject, candidate, tree, pr, release };
}

function writeBundleFiles(bundle, root) {
    writeFileSync(join(root, "manifest.json"), `${JSON.stringify(bundle, null, 2)}\n`);
    const sums = bundle.tarballs.map((item) => `${item.sha256.slice(7)}  ${item.name}`).concat(`${fileSha256(join(root, "manifest.json")).slice(7)}  manifest.json`);
    writeFileSync(join(root, "SHA256SUMS"), `${sums.join("\n")}\n`);
}

function createVerifiedBundle(t) {
    const packagesDir = fixture(t);
    const release = createRelease({ packagesDir, sourceSha: SHA, node: "v22.16.0", npm: "11.19.0", version: "2.2.0" });
    const root = mkdtempSync(join(tmpdir(), "verified-release-bundle-"));
    const tarballsDir = join(root, "tarballs");
    mkdirSync(tarballsDir);
    t.teardown(() => rmSync(root, { force: true, recursive: true }));
    const stages = new Map();
    const tarballs = release.packages.map((entry, index) => {
        const stage = mkdtempSync(join(tmpdir(), "release-tar-stage-"));
        const packageStage = join(stage, "package");
        mkdirSync(packageStage);
        const packageJson = JSON.parse(readFileSync(join(packagesDir, entry.path), "utf8"));
        writeFileSync(join(packageStage, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
        stages.set(entry.name, { stage, packageJson });
        const name = `package-${index}.tgz`;
        const path = join(tarballsDir, name);
        execFileSync("tar", ["-czf", path, "-C", stage, "package"]);
        return { package: entry.name, version: entry.version, packageChecksum: entry.packageChecksum, name, size: statSync(path).size, sha256: fileSha256(path) };
    });
    t.teardown(() => { for (const { stage } of stages.values()) rmSync(stage, { force: true, recursive: true }); });
    const bundle = {
        format: "transform-hub-main-release-v2",
        version: "2.2.0",
        tag: "v2.2.0",
        branch: "release/2.2.0",
        candidate: { head: SHA, tree: "b".repeat(40) },
        repository: "scramjetorg/transform-hub",
        toolchain: release.identity.toolchain,
        source: release.identity.source,
        identity: release.identity,
        identityDigest: release.identityDigest,
        packages: release.packages,
        waves: release.waves,
        tarballs
    };
    bundle.outerChecksum = bundleChecksum(bundle);
    writeBundleFiles(bundle, root);
    return { bundle, packagesDir, root, tarballsDir, stages };
}

test("approved release topology remains 38 packages in 12 waves", (t) => {
    t.is(RELEASE_WAVES.length, 12);
    t.is(validateReleaseWaves(RELEASE_WAVES).size, 38);
    t.true(INCLUDED_PACKAGES.has("@scramjet/hub-state"));
});

test("exact release and merged PR selectors enforce uniqueness before recorded-ID matching", (t) => {
    const release = { id: 123, tag_name: "v2.2.0", draft: false, prerelease: false, target_commitish: "d".repeat(40) };
    t.is(selectExactRelease([release], { tag: "v2.2.0", releaseId: "123", requirePublic: true }), release);
    t.throws(() => selectExactRelease([release, { ...release, draft: true }], { tag: "v2.2.0", releaseId: "999" }), { message: /exactly one/ });
    t.throws(() => selectExactRelease([{ ...release, prerelease: true }], { tag: "v2.2.0" }), { message: /prerelease/ });
    const commit = "b".repeat(40);
    const pr = { number: 456, merged_at: "2026-10-13T00:00:00Z", merge_commit_sha: commit, base: { ref: "main", repo: { full_name: DEFAULT_REPOSITORY } }, head: { ref: "release/2.2.0", sha: "d".repeat(40), repo: { full_name: DEFAULT_REPOSITORY } } };
    t.is(selectExactMergedReleasePr([pr], { repository: DEFAULT_REPOSITORY, version: "2.2.0", tagCommitSha: commit, prNumber: "456" }), pr);
    t.throws(() => selectExactMergedReleasePr([pr, pr], { repository: DEFAULT_REPOSITORY, version: "2.2.0", tagCommitSha: commit, prNumber: "456" }), { message: /exactly one/ });
    t.throws(() => selectExactMergedReleasePr([pr], { repository: DEFAULT_REPOSITORY, version: "2.2.0", tagCommitSha: commit, prNumber: "457" }), { message: /does not match/ });
});

test("publication identity binds historical tag tree and accepts an optional recovery checksum", (t) => {
    const identity = { format: INVOCATION_FORMAT, mode: "recovery", repository: DEFAULT_REPOSITORY, executionSha: "a".repeat(40), tag: "v2.2.0", tagObjectSha: "c".repeat(40), tagCommitSha: "b".repeat(40), version: "2.2.0", branch: "release/2.2.0", releaseId: "123", releaseDraft: false, prNumber: "456", candidateHead: "d".repeat(40), candidateTree: "e".repeat(40), tagTree: "e".repeat(40), expectedBundleChecksum: `sha256:${"f".repeat(64)}` };
    t.deepEqual(publicationBindings(identity), { expectedVersion: "2.2.0", expectedBranch: "release/2.2.0", expectedCandidateHead: "d".repeat(40), expectedCandidateTree: "e".repeat(40), expectedMainTree: "e".repeat(40), expectedRepository: DEFAULT_REPOSITORY, expectedBundleChecksum: identity.expectedBundleChecksum });
    t.deepEqual(publicationBindings({ ...identity, expectedBundleChecksum: null }), { expectedVersion: "2.2.0", expectedBranch: "release/2.2.0", expectedCandidateHead: "d".repeat(40), expectedCandidateTree: "e".repeat(40), expectedMainTree: "e".repeat(40), expectedRepository: DEFAULT_REPOSITORY });
    t.throws(() => publicationBindings({ ...identity, releaseDraft: true }), { message: /public release/ });
    t.throws(() => publicationBindings({ ...identity, expectedBundleChecksum: undefined }), { message: /checksum must be null/ });
});

test("recovery identity resolves a pinned historical tag against protected current main", (t) => {
    const environment = { GITHUB_REPOSITORY: DEFAULT_REPOSITORY, GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/main", GITHUB_REF_PROTECTED: "true", GITHUB_SHA: "a".repeat(40), GH_TOKEN: "fixture-only" };
    for (const optionalChecksum of [undefined, "", `sha256:${"f".repeat(64)}`]) {
        const { steps, tagCommit, tagObject, tree, candidate } = resolverQueue({ environment, mode: "recovery" });
        const inputs = { stable_tag: "v2.2.0", expected_tag_sha: tagCommit, ...(optionalChecksum === undefined ? {} : { expected_bundle_checksum: optionalChecksum }) };
        const identity = resolvePublicationIdentity({ environment, event: { inputs, release_id: "wrong-ignored", release_pr: "also-ignored" }, runner: scriptedRunner(t, steps) });
        t.is(identity.mode, "recovery");
        t.is(identity.executionSha, environment.GITHUB_SHA);
        t.is(identity.tagCommitSha, tagCommit);
        t.is(identity.tagObjectSha, tagObject);
        t.is(identity.releaseId, "123");
        t.is(identity.prNumber, "456");
        t.is(identity.candidateHead, candidate);
        t.is(identity.candidateTree, tree);
        t.is(identity.expectedBundleChecksum, optionalChecksum || null);
        t.is(steps.length, 0);
    }
});

test("tag-push identity accepts an exact tag and either a draft or public release", (t) => {
    for (const releaseDraft of [true, false]) {
        const environment = { GITHUB_REPOSITORY: DEFAULT_REPOSITORY, GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/tags/v2.2.0", GITHUB_REF_PROTECTED: "true", GITHUB_SHA: SHA, GH_TOKEN: "fixture-only" };
        const { steps, execution } = resolverQueue({ environment, mode: "tag-push", releaseDraft });
        const identity = resolvePublicationIdentity({ environment, event: {}, runner: scriptedRunner(t, steps) });
        t.is(identity.mode, "tag-push");
        t.is(identity.tagCommitSha, execution);
        t.is(identity.releaseDraft, releaseDraft);
        t.is(identity.expectedBundleChecksum, null);
        t.is(steps.length, 0);
    }
});

test("resolver fails closed before later GitHub operations when commit or release bindings differ", (t) => {
    const scenarios = [
        { name: "checkout SHA", index: 0, stdout: `${"f".repeat(40)}\n`, error: /Checked-out commit mismatch/ },
        { name: "main SHA", index: 2, stdout: `${"f".repeat(40)}\n`, error: /Remote main commit mismatch/ },
        { name: "tag commit", index: 5, stdout: `${"f".repeat(40)}\n`, error: /Tag commit mismatch/ },
        { name: "tag ancestry", mode: "recovery", index: 6, errorValue: Object.assign(new Error("not an ancestor"), { code: 1 }), error: /not an ancestor/ },
        { name: "tag package version", index: 6, stdout: JSON.stringify({ version: "2.3.0" }), error: /Tagged package version mismatch/ },
        { name: "candidate tree", index: 11, stdout: `${"f".repeat(40)}\n`, error: /Candidate\/tag tree mismatch/, noReleaseList: true }
    ];
    for (const scenario of scenarios) {
        const mode = scenario.mode || "tag-push";
        const environment = { GITHUB_REPOSITORY: DEFAULT_REPOSITORY, GITHUB_EVENT_NAME: mode === "recovery" ? "workflow_dispatch" : "push", GITHUB_REF: mode === "recovery" ? "refs/heads/main" : "refs/tags/v2.2.0", GITHUB_REF_PROTECTED: "true", GITHUB_SHA: SHA, GH_TOKEN: "fixture-only" };
        const { steps } = resolverQueue({ environment, mode });
        steps[scenario.index].stdout = scenario.stdout;
        if (scenario.errorValue) steps[scenario.index].error = scenario.errorValue;
        if (scenario.noReleaseList) steps.splice(-2);
        let calls = 0;
        const runner = (...args) => { calls++; return scriptedRunner(t, steps)(...args); };
        const event = mode === "recovery" ? { inputs: { stable_tag: "v2.2.0", expected_tag_sha: "b".repeat(40), release_id: "123", release_pr: "456", expected_bundle_checksum: `sha256:${"f".repeat(64)}` } } : {};
        t.throws(() => resolvePublicationIdentity({ environment, event, runner }), { message: scenario.error });
        t.is(calls, scenario.index + 1, `${scenario.name}: no command after failure`);
        if (scenario.noReleaseList) t.false(steps.some((step) => step.args.includes("repos/scramjetorg/transform-hub/releases")));
    }
});

test("recovery refuses a mismatched expected tag SHA before reading package metadata", (t) => {
    const environment = { GITHUB_REPOSITORY: DEFAULT_REPOSITORY, GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/main", GITHUB_REF_PROTECTED: "true", GITHUB_SHA: SHA, GH_TOKEN: "fixture-only" };
    const { steps } = resolverQueue({ environment, mode: "recovery" });
    let calls = 0;
    const runner = (...args) => { calls++; return scriptedRunner(t, steps)(...args); };
    const event = { inputs: { stable_tag: "v2.2.0", expected_tag_sha: "f".repeat(40), release_id: "123", release_pr: "456", expected_bundle_checksum: `sha256:${"f".repeat(64)}` } };
    t.throws(() => resolvePublicationIdentity({ environment, event, runner }), { message: /Recorded tag commit mismatch/ });
    t.is(calls, 6);
});

test("resolver scans later pages for ambiguity and does not return a match before a later page error", (t) => {
    const environment = { GITHUB_REPOSITORY: DEFAULT_REPOSITORY, GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/tags/v2.2.0", GITHUB_REF_PROTECTED: "true", GITHUB_SHA: SHA, GH_TOKEN: "fixture-only" };
    const cases = [
        { pageIndex: 8, matching: (fixture) => fixture.pr, unrelated: (index) => ({ number: 900 + index, merged_at: null, merge_commit_sha: null, base: { ref: "maintenance", repo: { full_name: DEFAULT_REPOSITORY } }, head: { ref: "maintenance", sha: SHA, repo: { full_name: DEFAULT_REPOSITORY } } }), error: /more than one across pages/ },
        { pageIndex: 12, matching: (fixture) => fixture.release, unrelated: (index) => ({ id: 900 + index, tag_name: `v8.${index}.0`, draft: false, prerelease: false }), error: /more than one across pages/ }
    ];
    for (const scenario of cases) {
        const fixture = resolverQueue({ environment, mode: "tag-push" });
        const records = [scenario.matching(fixture), ...Array.from({ length: 99 }, (_, index) => scenario.unrelated(index))];
        fixture.steps[scenario.pageIndex].stdout = JSON.stringify({ count: 100, items: records });
        t.throws(() => resolvePublicationIdentity({ environment, event: {}, runner: scriptedRunner(t, fixture.steps) }), { message: scenario.error });
    }
    const { steps, release } = resolverQueue({ environment, mode: "tag-push" });
    steps[13].stdout = JSON.stringify({ count: 100, items: [release, ...Array.from({ length: 99 }, (_, index) => ({ id: 500 + index, tag_name: `v8.${index}.0`, draft: false, prerelease: false }))] });
    steps.push({ command: "gh", args: ["api", "--method", "GET", "repos/scramjetorg/transform-hub/releases?per_page=100&page=3", "--jq", 'if type != "array" then error("Expected GitHub collection array") else {count: length, items: map({id,tag_name,draft,prerelease})} end'], environment, error: Object.assign(new Error("later page failed"), { code: "EHOSTUNREACH", stdout: "", stderr: "SENSITIVE RESPONSE" }) });
    t.throws(() => resolvePublicationIdentity({ environment, event: {}, runner: scriptedRunner(t, steps) }), { message: /GitHub API GET repos\/scramjetorg\/transform-hub\/releases\?per_page=100&page=3 failed: code=EHOSTUNREACH/ });
});

test("projected GitHub metadata stays below the default subprocess buffer and labels safe failures", (t) => {
    const fullMetadataEmitter = `const rows=Array.from({length:100},(_,id)=>({id,tag_name:'v2.3.0',draft:false,prerelease:false,body:'x'.repeat(25000)}));process.stdout.write(JSON.stringify(rows));`;
    let fullError;
    try { execFileSync(process.execPath, ["-e", fullMetadataEmitter], { encoding: "utf8" }); }
    catch (error) { fullError = error; }
    t.is(fullError?.code, "ENOBUFS");
    t.true(Buffer.byteLength(fullError.stdout) >= 1024 * 1024);
    const projectedEmitter = `const rows=Array.from({length:100},(_,id)=>({id,tag_name:'v2.3.0',draft:false,prerelease:false,body:'x'.repeat(25000)}));process.stdout.write(JSON.stringify({count:rows.length,items:rows.map(({id,tag_name,draft,prerelease})=>({id,tag_name,draft,prerelease}))}));`;
    const projectedOutput = execFileSync(process.execPath, ["-e", projectedEmitter], { encoding: "utf8" });
    t.true(Buffer.byteLength(projectedOutput) < 1024 * 1024);
    t.is(JSON.parse(projectedOutput).count, 100);

    const environment = { GITHUB_REPOSITORY: DEFAULT_REPOSITORY, GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/tags/v2.2.0", GITHUB_REF_PROTECTED: "true", GITHUB_SHA: SHA, GH_TOKEN: "fixture-only" };
    const { steps } = resolverQueue({ environment, mode: "tag-push" });
    const tokenSentinel = "GH_TOKEN_SENTINEL_MUST_NOT_LEAK";
    const runner = (command, args, options) => {
        const step = steps.shift();
        t.truthy(step);
        t.is(command, step.command);
        t.deepEqual(args, step.args);
        t.deepEqual(options, { encoding: "utf8", env: environment });
        if (command !== "gh") return step.stdout;
        t.true(args.includes("--jq"));
        t.false(args.includes("--paginate"));
        t.false(args.includes("--slurp"));
        if (step.args[3].endsWith("page=1")) {
            const emitProjected = args.at(-1).includes("number")
                ? `const rows=Array.from({length:100},(_,number)=>({number,merged_at:null,merge_commit_sha:null,base:{ref:'maintenance',repo:{full_name:'${DEFAULT_REPOSITORY}'}},head:{ref:'maintenance',sha:'${"d".repeat(40)}',repo:{full_name:'${DEFAULT_REPOSITORY}'}},body:'x'.repeat(25000)}));process.stdout.write(JSON.stringify({count:rows.length,items:rows.map(({number,merged_at,merge_commit_sha,base,head})=>({number,merged_at,merge_commit_sha,base,head}))}));`
                : `const rows=Array.from({length:100},(_,id)=>({id,tag_name:'v8.'+id+'.0',draft:false,prerelease:false,body:'x'.repeat(25000)}));process.stdout.write(JSON.stringify({count:rows.length,items:rows.map(({id,tag_name,draft,prerelease})=>({id,tag_name,draft,prerelease}))}));`;
            return execFileSync(process.execPath, ["-e", emitProjected], { encoding: "utf8" });
        }
        return execFileSync(process.execPath, ["-e", `process.stdout.write(${JSON.stringify(step.stdout)})`], { encoding: "utf8" });
    };
    resolvePublicationIdentity({ environment, event: {}, runner });
    t.is(steps.length, 0);

    const { steps: failedSteps } = resolverQueue({ environment, mode: "tag-push" });
    const apiError = Object.assign(new Error(`${tokenSentinel} raw stderr must not escape`), { code: "ENOBUFS", status: null, signal: "SIGTERM", stdout: Buffer.alloc(17), stderr: Buffer.from(tokenSentinel) });
    failedSteps[8].error = apiError;
    const failureRunner = scriptedRunner(t, failedSteps);
    let wrapped;
    try { resolvePublicationIdentity({ environment, event: {}, runner: failureRunner }); }
    catch (error) { wrapped = error; }
    t.regex(wrapped.message, /GitHub API GET repos\/scramjetorg\/transform-hub\/commits\/.*\/pulls\?per_page=100&page=1 failed: code=ENOBUFS status=null signal=SIGTERM stdoutBytes=17 stderrBytes=/);
    t.false(wrapped.message.includes(tokenSentinel));
});

test("publication context validation rejects malformed input before git or GitHub calls", (t) => {
    let calls = 0;
    const environment = { GITHUB_REPOSITORY: DEFAULT_REPOSITORY, GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/main", GITHUB_REF_PROTECTED: "true", GITHUB_SHA: SHA, GH_TOKEN: "fixture-only" };
    t.throws(() => resolvePublicationIdentity({ environment, event: { inputs: { stable_tag: "v2.2.0" } }, runner: () => calls++ }), { message: /expected_tag_sha/ });
    t.is(calls, 0);
    t.throws(() => resolvePublicationIdentity({ environment: { ...environment, GITHUB_REF_PROTECTED: "false" }, event: { inputs: {} }, runner: () => calls++ }), { message: /protected/ });
    t.is(calls, 0);
    for (const checksum of [null, true, 7, "   ", "not-a-digest"]) {
        t.throws(() => resolvePublicationIdentity({ environment, event: { inputs: { stable_tag: "v2.2.0", expected_tag_sha: "b".repeat(40), expected_bundle_checksum: checksum } }, runner: () => calls++ }), { message: /optional sha256 digest/ });
        t.is(calls, 0);
    }
});

test("public recovery finalization verifies assets with optional pin before metadata read and never patches", async (t) => {
    const { bundle, root } = createVerifiedBundle(t);
    const assetsJsonPath = `${root}-assets.json`;
    t.teardown(() => rmSync(assetsJsonPath, { force: true }));
    writeFileSync(assetsJsonPath, JSON.stringify([ ...bundle.tarballs.map((item, id) => ({ id: id + 1, name: item.name })), { id: 39, name: "manifest.json" }, { id: 40, name: "SHA256SUMS" } ]));
    const env = { GH_TOKEN: "fixture-only" };
    const steps = [0, 1].map(() => ({ command: "gh", args: ["api", "--method", "GET", "repos/scramjetorg/transform-hub/releases/123", "--jq", "{id,tag_name,draft,prerelease}"], environment: env, stdout: JSON.stringify({ id: 123, tag_name: "v2.2.0", draft: false, prerelease: false }) }));
    const identity = { format: INVOCATION_FORMAT, mode: "recovery", repository: DEFAULT_REPOSITORY, executionSha: "c".repeat(40), tag: "v2.2.0", tagObjectSha: "d".repeat(40), tagCommitSha: "e".repeat(40), version: "2.2.0", branch: "release/2.2.0", releaseId: "123", releaseDraft: false, prNumber: "456", candidateHead: SHA, candidateTree: "b".repeat(40), tagTree: "b".repeat(40), expectedBundleChecksum: bundle.outerChecksum };
    for (const checksum of [null, bundle.outerChecksum]) {
        const result = await finalizeRelease({ identity: { ...identity, expectedBundleChecksum: checksum }, bundle, bundleDir: root, assetsJsonPath, environment: env, runner: scriptedRunner(t, steps) });
        t.deepEqual(result, { releaseId: "123", status: "already-public" });
    }
    t.is(steps.length, 0);
});

test("normal tag finalization patches a verified draft once and validates the public response", async (t) => {
    const { bundle, root } = createVerifiedBundle(t);
    const assetsJsonPath = `${root}-assets.json`;
    t.teardown(() => rmSync(assetsJsonPath, { force: true }));
    writeFileSync(assetsJsonPath, JSON.stringify([...bundle.tarballs.map((item, id) => ({ id: id + 1, name: item.name })), { id: 39, name: "manifest.json" }, { id: 40, name: "SHA256SUMS" }]));
    const environment = { GH_TOKEN: "fixture-only" };
    const endpoint = "repos/scramjetorg/transform-hub/releases/123";
    const steps = [
        { command: "gh", args: ["api", "--method", "GET", endpoint, "--jq", "{id,tag_name,draft,prerelease}"], environment, stdout: JSON.stringify({ id: 123, tag_name: "v2.2.0", draft: true, prerelease: false }) },
        { command: "gh", args: ["api", "--method", "PATCH", endpoint, "--jq", "{id,tag_name,draft,prerelease}", "-F", "draft=false"], environment, stdout: JSON.stringify({ id: 123, tag_name: "v2.2.0", draft: false, prerelease: false }) }
    ];
    const identity = { format: INVOCATION_FORMAT, mode: "tag-push", repository: DEFAULT_REPOSITORY, executionSha: SHA, tag: "v2.2.0", tagObjectSha: "c".repeat(40), tagCommitSha: SHA, version: "2.2.0", branch: "release/2.2.0", releaseId: "123", releaseDraft: true, prNumber: "456", candidateHead: SHA, candidateTree: "b".repeat(40), tagTree: "b".repeat(40), expectedBundleChecksum: null };
    const result = await finalizeRelease({ identity, bundle, bundleDir: root, assetsJsonPath, environment, runner: scriptedRunner(t, steps) });
    t.deepEqual(result, { releaseId: "123", status: "published" });
    t.is(steps.length, 0);
});

test("finalization rejects tampered or mismatched bundle bindings before any GitHub call", async (t) => {
    const { bundle, root } = createVerifiedBundle(t);
    const assetsJsonPath = `${root}-assets.json`;
    t.teardown(() => rmSync(assetsJsonPath, { force: true }));
    writeFileSync(assetsJsonPath, JSON.stringify([...bundle.tarballs.map((item, id) => ({ id: id + 1, name: item.name })), { id: 39, name: "manifest.json" }, { id: 40, name: "SHA256SUMS" }]));
    const identity = { format: INVOCATION_FORMAT, mode: "recovery", repository: DEFAULT_REPOSITORY, executionSha: "c".repeat(40), tag: "v2.2.0", tagObjectSha: "d".repeat(40), tagCommitSha: "e".repeat(40), version: "2.2.0", branch: "release/2.2.0", releaseId: "123", releaseDraft: false, prNumber: "456", candidateHead: SHA, candidateTree: "b".repeat(40), tagTree: "b".repeat(40), expectedBundleChecksum: bundle.outerChecksum };
    const variants = [
        { identity: { ...identity, expectedBundleChecksum: sha256("wrong") }, bundle, error: /outer checksum/ },
        { identity: { ...identity, candidateHead: "f".repeat(40) }, bundle, error: /candidate head binding/ },
        { identity, bundle: { ...bundle, repository: "attacker/other", outerChecksum: undefined }, error: /repository binding/ }
    ];
    variants[2].bundle.outerChecksum = bundleChecksum(variants[2].bundle);
    for (const variant of variants) {
        let calls = 0;
        await t.throwsAsync(() => finalizeRelease({ identity: variant.identity, bundle: variant.bundle, bundleDir: root, assetsJsonPath, environment: { GH_TOKEN: "fixture-only" }, runner: () => calls++ }), { message: variant.error });
        t.is(calls, 0);
    }
    writeFileSync(join(root, "tarballs", bundle.tarballs[0].name), "tampered");
    let calls = 0;
    await t.throwsAsync(() => finalizeRelease({ identity, bundle, bundleDir: root, assetsJsonPath, environment: { GH_TOKEN: "fixture-only" }, runner: () => calls++ }), { message: /Tarball checksum mismatch/ });
    t.is(calls, 0);
});

test("finalization enforces public/draft state transitions and rejects unexpected release metadata", async (t) => {
    const { bundle, root } = createVerifiedBundle(t);
    const assetsJsonPath = `${root}-assets.json`;
    t.teardown(() => rmSync(assetsJsonPath, { force: true }));
    writeFileSync(assetsJsonPath, JSON.stringify([...bundle.tarballs.map((item, id) => ({ id: id + 1, name: item.name })), { id: 39, name: "manifest.json" }, { id: 40, name: "SHA256SUMS" }]));
    const endpoint = "repos/scramjetorg/transform-hub/releases/123";
    const identity = { format: INVOCATION_FORMAT, mode: "tag-push", repository: DEFAULT_REPOSITORY, executionSha: SHA, tag: "v2.2.0", tagObjectSha: "c".repeat(40), tagCommitSha: SHA, version: "2.2.0", branch: "release/2.2.0", releaseId: "123", releaseDraft: true, prNumber: "456", candidateHead: SHA, candidateTree: "b".repeat(40), tagTree: "b".repeat(40), expectedBundleChecksum: null };
    const alreadyPublic = await finalizeRelease({ identity, bundle, bundleDir: root, assetsJsonPath, environment: { GH_TOKEN: "fixture-only" }, runner: () => JSON.stringify({ id: 123, tag_name: "v2.2.0", draft: false, prerelease: false }) });
    t.deepEqual(alreadyPublic, { releaseId: "123", status: "already-public" });
    for (const metadata of [
        { id: 123, tag_name: "v2.2.0", draft: true, prerelease: false },
        { id: 999, tag_name: "v2.2.0", draft: true, prerelease: false },
        { id: 123, tag_name: "v9.9.9", draft: true, prerelease: false },
        { id: 123, tag_name: "v2.2.0", draft: true, prerelease: true }
    ]) {
        let calls = 0;
        const runner = (command, args) => {
            calls++;
            t.is(command, "gh");
            t.deepEqual(args, ["api", "--method", "GET", endpoint, "--jq", "{id,tag_name,draft,prerelease}"]);
            return JSON.stringify(metadata);
        };
        await t.throwsAsync(() => finalizeRelease({ identity: { ...identity, releaseDraft: false }, bundle, bundleDir: root, assetsJsonPath, environment: { GH_TOKEN: "fixture-only" }, runner }), { message: /release|prerelease/i });
        t.is(calls, 1, "invalid current metadata must not be patched");
    }
    let calls = 0;
    await t.throwsAsync(() => finalizeRelease({ identity: { ...identity, mode: "recovery", releaseDraft: true, expectedBundleChecksum: bundle.outerChecksum }, bundle, bundleDir: root, assetsJsonPath, environment: { GH_TOKEN: "fixture-only" }, runner: () => calls++ }), { message: /public release/ });
    t.is(calls, 0, "a recovery identity recorded as draft fails before GitHub access");
});

test("identity CLI rejects coexistence with any expected-binding option", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-cli-identity-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const bundleDir = join(root, "bundle");
    mkdirSync(bundleDir);
    writeFileSync(join(bundleDir, "manifest.json"), JSON.stringify({}));
    const identityPath = join(root, "identity.json");
    writeFileSync(identityPath, JSON.stringify({}));
    const result = spawnSync(process.execPath, [join(__dirname, "..", "release-main.js"), "verify-bundle", "--bundle", bundleDir, "--identity", identityPath, "--expected-version", "2.2.0"], { encoding: "utf8" });
    t.not(result.status, 0);
    t.regex(result.stderr, /--identity cannot be combined with --expected-\* flags/);
    t.false(result.stderr.includes("ACTIONS_ID_TOKEN"));
});

test("asset downloader paginates once and streams binary assets into nested bundle layout", (t) => {
    const parent = mkdtempSync(join(tmpdir(), "release-download-test-"));
    const root = join(parent, "bundle");
    const assetsJsonPath = join(parent, "assets.json");
    t.teardown(() => rmSync(parent, { recursive: true, force: true }));
    const names = ["manifest.json", "SHA256SUMS", ...Array.from({ length: INCLUDED_PACKAGES.size }, (_, index) => `package-${index}.tgz`)];
    const assets = names.map((name, index) => ({ id: index + 100, name, url: "must-not-use" }));
    const environment = { GH_TOKEN: "fixture-only" };
    let listCalls = 0;
    let downloadCalls = 0;
    const runner = (command, args, options) => {
        t.is(command, "gh");
        t.deepEqual(options.env, environment);
        if (args[0] === "api" && args.includes("--jq")) {
            listCalls++;
            t.deepEqual(args, ["api", "--method", "GET", "repos/scramjetorg/transform-hub/releases/123/assets?per_page=100&page=1", "--jq", 'if type != "array" then error("Expected GitHub collection array") else {count: length, items: map({id,name})} end']);
            return JSON.stringify({ count: assets.length, items: assets.map(({ id, name }) => ({ id, name })) });
        }
        downloadCalls++;
        const item = assets.find((asset) => args[3] === `repos/scramjetorg/transform-hub/releases/assets/${asset.id}`);
        t.truthy(item);
        t.deepEqual(args, ["api", "--method", "GET", `repos/scramjetorg/transform-hub/releases/assets/${item.id}`, "--header", "Accept: application/octet-stream"]);
        writeFileSync(options.stdio[1], Buffer.from([0xff, item.id & 0xff]));
        return Buffer.alloc(0);
    };
    const identity = { format: INVOCATION_FORMAT, mode: "recovery", repository: DEFAULT_REPOSITORY, executionSha: "a".repeat(40), tag: "v2.2.0", tagObjectSha: "c".repeat(40), tagCommitSha: "b".repeat(40), version: "2.2.0", branch: "release/2.2.0", releaseId: "123", releaseDraft: false, prNumber: "456", candidateHead: "d".repeat(40), candidateTree: "e".repeat(40), tagTree: "e".repeat(40), expectedBundleChecksum: `sha256:${"f".repeat(64)}` };
    const result = downloadReleaseAssets({ identity, bundleDir: root, assetsJsonPath, environment, runner });
    t.is(result.assetCount, 40);
    t.is(listCalls, 1);
    t.is(downloadCalls, 40);
    t.deepEqual(JSON.parse(readFileSync(assetsJsonPath, "utf8")), assets.map(({ id, name }) => ({ id, name })));
    t.deepEqual([...readFileSync(join(root, "manifest.json"))], [255, assets[0].id & 0xff]);
    t.deepEqual([...readFileSync(join(root, "tarballs", "package-0.tgz"))], [255, assets[2].id & 0xff]);
});

test("asset downloader rejects a forty-first asset before cleanup or download", (t) => {
    const parent = mkdtempSync(join(tmpdir(), "release-download-overflow-"));
    const root = join(parent, "bundle");
    mkdirSync(root);
    const sentinel = join(root, "preserve.txt");
    writeFileSync(sentinel, "not cleaned before inventory validation");
    const environment = { GH_TOKEN: "fixture-only" };
    const assets = Array.from({ length: 41 }, (_, index) => ({ id: index + 1, name: index < 2 ? (index === 0 ? "manifest.json" : "SHA256SUMS") : `package-${index}.tgz` }));
    let calls = 0;
    const runner = (_command, args) => {
        calls++;
        t.true(args.includes("--jq"));
        return JSON.stringify({ count: assets.length, items: assets });
    };
    const identity = { format: INVOCATION_FORMAT, mode: "recovery", repository: DEFAULT_REPOSITORY, executionSha: "a".repeat(40), tag: "v2.2.0", tagObjectSha: "c".repeat(40), tagCommitSha: "b".repeat(40), version: "2.2.0", branch: "release/2.2.0", releaseId: "123", releaseDraft: false, prNumber: "456", candidateHead: "d".repeat(40), candidateTree: "e".repeat(40), tagTree: "e".repeat(40), expectedBundleChecksum: null };
    t.throws(() => downloadReleaseAssets({ identity, bundleDir: root, assetsJsonPath: join(parent, "assets.json"), environment, runner }), { message: /exceeds the complete release boundary/ });
    t.is(calls, 1);
    t.is(readFileSync(sentinel, "utf8"), "not cleaned before inventory validation");
    rmSync(parent, { recursive: true, force: true });
});

test("compatible wave validation preserves dependency ordering and boundary rejection", (t) => {
    const manifests = new Map([
        ["@scramjet/a", { packageJson: { name: "@scramjet/a", dependencies: { "@scramjet/b": "2.2.0" } } }],
        ["@scramjet/b", { packageJson: { name: "@scramjet/b" } }]
    ]);
    t.throws(() => validateReleaseWaves([["@scramjet/a", "@scramjet/b"]], { boundary: SUBSET_BOUNDARY, manifests }), { message: /earlier wave/ });
    t.throws(() => validateReleaseWaves([["@scramjet/b"], ["@scramjet/a"], ["@scramjet/a"]], { boundary: SUBSET_BOUNDARY }), { message: /more than once/ });
    t.throws(() => validateReleaseWaves([["@scramjet/b"]], { boundary: SUBSET_BOUNDARY }), { message: /omits boundary package/ });
    t.throws(() => validateReleaseWaves([["@scramjet/b"], ["@scramjet/a", "@scramjet/outside"]], { boundary: SUBSET_BOUNDARY }), { message: /outside the release boundary/ });
});

test("release identity annotates embedded package identity and verifies it", (t) => {
    const packagesDir = fixture(t);
    const release = createRelease({ packagesDir, sourceSha: SHA, node: "v22.16.0", npm: "11.19.0", version: "2.2.0" });
    verifyRelease(release, packagesDir);
    const manifest = JSON.parse(readFileSync(join(packagesDir, "api-types", "package.json"), "utf8"));
    const entry = release.packages.find((item) => item.name === "@scramjet/api-types");
    t.is(manifest.scramjet.release.identityDigest, release.identityDigest);
    t.is(manifest.scramjet.release.packageChecksum, entry.packageChecksum);
    t.is(releasePackageChecksum(manifest), entry.packageChecksum);
    manifest.scramjet.release.packageChecksum = "sha256:" + "0".repeat(64);
    writeFileSync(join(packagesDir, "api-types", "package.json"), JSON.stringify(manifest));
    t.throws(() => verifyRelease(release, packagesDir), { message: /checksum mismatch/ });
});

test("valid bundle verification rejects tampered tarball hashes and embedded package identity", async (t) => {
    const { bundle, root, tarballsDir, stages } = createVerifiedBundle(t);
    await t.notThrowsAsync(() => verifyBundle({ bundle, bundleDir: root, expectedVersion: "2.2.0", expectedBranch: "release/2.2.0", expectedCandidateHead: SHA, expectedCandidateTree: "b".repeat(40), expectedMainTree: "b".repeat(40) }));
    const first = bundle.tarballs[0];
    writeFileSync(join(tarballsDir, first.name), "tampered");
    await t.throwsAsync(() => verifyBundle({ bundle, bundleDir: root }), { message: /Tarball checksum mismatch/ });
    const staged = stages.get(first.package);
    const altered = { ...staged.packageJson, name: "@scramjet/tampered" };
    writeFileSync(join(staged.stage, "package", "package.json"), `${JSON.stringify(altered, null, 2)}\n`);
    execFileSync("tar", ["-czf", join(tarballsDir, first.name), "-C", staged.stage, "package"]);
    first.size = statSync(join(tarballsDir, first.name)).size;
    first.sha256 = fileSha256(join(tarballsDir, first.name));
    bundle.outerChecksum = bundleChecksum(bundle);
    writeBundleFiles(bundle, root);
    await t.throwsAsync(() => verifyBundle({ bundle, bundleDir: root }), { message: /Embedded package identity mismatch/ });
});

test("immutable npm reuse requires exact name, version, identity digest, and package checksum", (t) => {
    const release = { identityDigest: sha256("identity") };
    const entry = { name: "@scramjet/a", version: "2.2.0", packageChecksum: sha256("package") };
    const matching = () => JSON.stringify({ name: entry.name, version: entry.version, scramjet: { release: { identityDigest: release.identityDigest, packageChecksum: entry.packageChecksum } } });
    t.true(publishedReuse(entry, release, () => matching(), {}));
    for (const published of [
        { name: "@scramjet/other", version: entry.version },
        { name: entry.name, version: "2.2.1" },
        { name: entry.name, version: entry.version, scramjet: { release: { identityDigest: sha256("other"), packageChecksum: entry.packageChecksum } } },
        { name: entry.name, version: entry.version, scramjet: { release: { identityDigest: release.identityDigest, packageChecksum: sha256("other") } } }
    ]) {
        t.throws(() => publishedReuse(entry, release, () => JSON.stringify(published), {}), { message: /Immutable production/ });
    }
});

test("bundle publication publishes tarballs directly and sleeps exactly once between each pair of waves", (t) => {
    const calls = []; const sleeps = [];
    const bundle = { identityDigest: "sha256:" + "a".repeat(64), waves: [{ number: 1, packages: ["@scramjet/a"] }, { number: 2, packages: ["@scramjet/b"] }, { number: 3, packages: ["@scramjet/c"] }], packages: [{ name: "@scramjet/a", version: "2.2.0", packageChecksum: "sha256:" + "b".repeat(64) }, { name: "@scramjet/b", version: "2.2.0", packageChecksum: "sha256:" + "c".repeat(64) }, { name: "@scramjet/c", version: "2.2.0", packageChecksum: "sha256:" + "d".repeat(64) }], tarballs: [{ package: "@scramjet/a", name: "a.tgz" }, { package: "@scramjet/b", name: "b.tgz" }, { package: "@scramjet/c", name: "c.tgz" }] };
    const runner = (_command, args) => { calls.push(args.slice(1)); if (args[1] === "view") throw new Error("E404 not found"); };
    const result = publishBundle({ bundle, bundleDir: "/tmp/bundle", environment: ENVIRONMENT, runner, sleep: (ms) => sleeps.push(ms) });
    t.deepEqual(sleeps, [10000, 10000]);
    t.deepEqual(calls.filter((args) => args[0] === "publish").map((args) => args[1]), ["/tmp/bundle/tarballs/a.tgz", "/tmp/bundle/tarballs/b.tgz", "/tmp/bundle/tarballs/c.tgz"]);
    t.false(calls.some((args) => args[0] === "waitForRegistryVisibility"));
    t.true(result.publication.publicationVerified);
});

test("npm publication rejects credential fallback and propagates registry authorization failures", (t) => {
    const bundle = { identityDigest: sha256("identity"), waves: [{ number: 1, packages: ["@scramjet/a"] }], packages: [{ name: "@scramjet/a", version: "2.2.0", packageChecksum: sha256("package") }], tarballs: [{ package: "@scramjet/a", name: "a.tgz" }] };
    let calls = 0;
    for (const environment of [
        {},
        { ...ENVIRONMENT, MAIN_RELEASE_PUBLISH_ENABLED: "false" },
        { ...ENVIRONMENT, NPM_TOKEN: "forbidden" },
        { ...ENVIRONMENT, NODE_AUTH_TOKEN: "forbidden" }
    ]) {
        t.throws(() => publishBundle({ bundle, bundleDir: "/tmp/bundle", environment, runner: () => calls++ }));
    }
    t.is(calls, 0);
    const authError = Object.assign(new Error("ENEEDAUTH"), { stderr: "ENEEDAUTH" });
    const commands = [];
    t.throws(() => publishBundle({ bundle, bundleDir: "/tmp/bundle", environment: ENVIRONMENT, runner: (_command, args) => { commands.push(args[1]); throw authError; } }), { message: /ENEEDAUTH/ });
    t.deepEqual(commands, ["view"]);
});

test("partial npm publication retries reuse exact successes and publish only missing tarballs", (t) => {
    const packages = ["@scramjet/a", "@scramjet/b", "@scramjet/c"];
    const bundle = {
        identityDigest: sha256("retry-identity"),
        waves: [{ number: 1, packages: packages.slice(0, 2) }, { number: 2, packages: packages.slice(2) }],
        packages: packages.map((name, index) => ({ name, version: "2.2.0", packageChecksum: sha256(`package-${index}`) })),
        tarballs: packages.map((name, index) => ({ package: name, name: `package-${index}.tgz` }))
    };
    const registry = new Map([[packages[0], { name: packages[0], version: "2.2.0", scramjet: { release: { identityDigest: bundle.identityDigest, packageChecksum: bundle.packages[0].packageChecksum } } }]]);
    const publishAttempts = new Map();
    const calls = [];
    const sleeps = [];
    const runner = (_command, args) => {
        const command = args[1];
        calls.push(args.slice(1));
        if (command === "view") {
            const name = args[2].replace(/@2\.2\.0$/, "");
            if (!registry.has(name)) throw Object.assign(new Error("E404 not found"), { stderr: "E404 not found" });
            return JSON.stringify(registry.get(name));
        }
        t.is(command, "publish");
        const tarball = args[2];
        const item = bundle.tarballs.find((entry) => `/tmp/retry-bundle/tarballs/${entry.name}` === tarball);
        t.truthy(item);
        t.deepEqual(args.slice(2), [tarball, "--provenance", "--access", "public", "--tag", "latest", "--registry", "https://registry.npmjs.org"]);
        const attempts = (publishAttempts.get(item.package) || 0) + 1;
        publishAttempts.set(item.package, attempts);
        if (item.package === packages[1] && attempts === 1) throw Object.assign(new Error("ENEEDAUTH"), { stderr: "ENEEDAUTH" });
        const entry = bundle.packages.find((pkg) => pkg.name === item.package);
        registry.set(item.package, { name: entry.name, version: entry.version, scramjet: { release: { identityDigest: bundle.identityDigest, packageChecksum: entry.packageChecksum } } });
    };

    t.throws(() => publishBundle({ bundle, bundleDir: "/tmp/retry-bundle", environment: ENVIRONMENT, runner, sleep: (ms) => sleeps.push(ms) }), { message: /ENEEDAUTH/ });
    t.deepEqual([...registry.keys()], [packages[0]]);
    const firstAttemptPublishes = calls.filter((args) => args[0] === "publish").map((args) => args[1]);
    t.deepEqual(firstAttemptPublishes, ["/tmp/retry-bundle/tarballs/package-1.tgz"]);

    const retry = publishBundle({ bundle, bundleDir: "/tmp/retry-bundle", environment: ENVIRONMENT, runner, sleep: (ms) => sleeps.push(ms) });
    t.deepEqual(retry.reused, [packages[0]]);
    t.deepEqual(retry.published, [packages[1], packages[2]]);
    t.deepEqual([...registry.keys()], packages);
    t.is(publishAttempts.get(packages[0]), undefined);
    t.is(publishAttempts.get(packages[1]), 2);
    t.is(publishAttempts.get(packages[2]), 1);
    t.deepEqual(sleeps, [10000]);
    t.deepEqual(calls.filter((args) => args[0] === "publish").map((args) => args[1]), [
        "/tmp/retry-bundle/tarballs/package-1.tgz",
        "/tmp/retry-bundle/tarballs/package-1.tgz",
        "/tmp/retry-bundle/tarballs/package-2.tgz"
    ]);
});

test("GitHub asset validation rejects extra and missing release assets", (t) => {
    const bundle = { tarballs: [...INCLUDED_PACKAGES].map((name, index) => ({ package: name, name: `package-${index}.tgz` })) };
    const root = mkdtempSync(join(tmpdir(), "release-assets-"));
    t.teardown(() => rmSync(root, { force: true, recursive: true }));
    const assets = [...bundle.tarballs.map((item) => ({ name: item.name })), { name: "manifest.json" }, { name: "SHA256SUMS" }];
    const assetsRoot = mkdtempSync(join(tmpdir(), "release-assets-json-"));
    t.teardown(() => rmSync(assetsRoot, { force: true, recursive: true }));
    const assetsPath = join(assetsRoot, "assets.json");
    writeFileSync(assetsPath, JSON.stringify(assets));
    mkdirSync(join(root, "tarballs"));
    writeFileSync(join(root, "manifest.json"), "{}");
    writeFileSync(join(root, "SHA256SUMS"), "");
    for (const item of bundle.tarballs) writeFileSync(join(root, "tarballs", item.name), "tarball");
    t.notThrows(() => validateAssetList(bundle, root, assetsPath));
    writeFileSync(join(root, "tarballs", "extra.tgz"), "extra");
    t.throws(() => validateAssetList(bundle, root, assetsPath), { message: /Downloaded release assets/ });
    rmSync(join(root, "tarballs", "extra.tgz"));
    writeFileSync(assetsPath, JSON.stringify([...assets, { name: assets[0].name }]));
    t.throws(() => validateAssetList(bundle, root, assetsPath), { message: /exactly match/ });
    writeFileSync(assetsPath, JSON.stringify([...assets, { name: "unexpected.zip" }]));
    t.throws(() => validateAssetList(bundle, root, assetsPath), { message: /exactly match/ });
    writeFileSync(assetsPath, JSON.stringify(assets.slice(1)));
    t.throws(() => validateAssetList(bundle, root, assetsPath), { message: /exactly match/ });
});

test("bundle verification fails closed when candidate or main tree binding differs", async (t) => {
    const { bundle, root } = createVerifiedBundle(t);
    await t.throwsAsync(() => verifyBundle({ bundle, bundleDir: root, expectedCandidateTree: "c".repeat(40) }), { message: /candidate tree binding/ });
    await t.throwsAsync(() => verifyBundle({ bundle, bundleDir: root, expectedMainTree: "c".repeat(40) }), { message: /resulting main tree/ });
});

test("publish CLI rejects an unverified bundle before invoking npm", (t) => {
    const root = mkdtempSync(join(tmpdir(), "unverified-release-"));
    t.teardown(() => rmSync(root, { force: true, recursive: true }));
    writeFileSync(join(root, "manifest.json"), JSON.stringify({ format: "transform-hub-main-release-v2" }));
    const result = spawnSync(process.execPath, [join(__dirname, "..", "release-main.js"), "publish", "--bundle", root, "--tarballs-dir", root], { encoding: "utf8" });
    t.not(result.status, 0);
    t.regex(result.stderr, /manifest checksum|identity/i);
});
