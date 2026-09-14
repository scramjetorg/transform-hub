"use strict";

const test = require("ava").default;
const { existsSync, mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const runtime = require("../release-candidate-runtime");
const shared = require("../lib/candidate-identity");
const state = require("../lib/release-bundle-state");

const SHA = "a".repeat(40);
const identityInput = { sourceSha: SHA, sourceTree: `sha256:${"b".repeat(64)}`, lockfileDigest: `sha256:${"c".repeat(64)}`, configRevision: "runtime-test", configDigest: `sha256:${"d".repeat(64)}`, buildIdentity: `sha256:${"e".repeat(64)}` };

test("runtime module loads without loading glob or operational dependencies", (t) => {
    const script = "const Module=require('node:module'); const load=Module._load; Module._load=(request,...args)=>{if(request==='glob') throw new Error('glob loaded'); return load.call(Module,request,...args)}; require('./scripts/release-candidate-runtime');";
    const result = spawnSync(process.execPath, ["-e", script], { cwd: resolve(__dirname, "..", ".."), encoding: "utf8" });
    t.is(result.status, 0, result.stderr);
});

test("missing remote policy fails before remote, lockfile, or output work", (t) => {
    const root = mkdtempSync(join(tmpdir(), "candidate-preflight-order-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const output = join(root, "identity.json");
    t.throws(() => runtime.preflight({ repository: "scramjetorg/transform-hub", branch: "devel", sourceSha: SHA, output, env: {}, runner: () => { throw new Error("remote called"); } }), { message: /unconfirmed/ });
    t.false(existsSync(output));
});

test("candidate identity remains compatible with state schema and key algorithm", (t) => {
    t.deepEqual(shared.candidateIdentity(identityInput), state.candidateIdentity(identityInput));
});

test("preflight rejects a moved protected remote before tree or lockfile work", (t) => {
    const calls = [];
    t.throws(() => runtime.preflight({ repository: "scramjetorg/transform-hub", branch: "devel", sourceSha: SHA, output: join(tmpdir(), "unused-candidate-identity.json"), env: { RELEASE_REMOTE_POLICY_CONFIRMED: "true" }, runner: (_command, args) => { calls.push(args); return `${"b".repeat(40)} refs/heads/devel\n`; } }), { message: /moved/ });
    t.is(calls.length, 1);
    t.deepEqual(calls[0], ["ls-remote", "https://github.com/scramjetorg/transform-hub.git", "refs/heads/devel"]);
});

test("preflight hashes the SHA-1 Git tree object ID into a valid SHA-256 identity digest", (t) => {
    const root = mkdtempSync(join(tmpdir(), "candidate-preflight-tree-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const calls = [];
    const identity = runtime.preflight({ repository: "scramjetorg/transform-hub", branch: "devel", sourceSha: SHA, output: join(root, "identity.json"), env: { RELEASE_REMOTE_POLICY_CONFIRMED: "true" }, runner: (_command, args) => {
        calls.push(args);
        if (args[0] === "ls-remote") return `${SHA} refs/heads/devel\n`;
        return `${"b".repeat(40)}\n`;
    } });
    t.regex(identity.sourceTree, /^sha256:[a-f0-9]{64}$/);
    t.is(calls.length, 2);
    t.deepEqual(calls[1], ["rev-parse", `${SHA}^{tree}`]);
});

test("preflight rejects malformed Git tree object output before creating candidate identity", (t) => {
    const root = mkdtempSync(join(tmpdir(), "candidate-preflight-malformed-tree-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const output = join(root, "identity.json");
    t.throws(() => runtime.preflight({ repository: "scramjetorg/transform-hub", branch: "devel", sourceSha: SHA, output, env: { RELEASE_REMOTE_POLICY_CONFIRMED: "true" }, runner: (_command, args) => args[0] === "ls-remote" ? `${SHA} refs/heads/devel\n` : "not-a-git-tree\n" }), { message: /Git tree object ID must be a 40-character Git SHA/ });
    t.false(existsSync(output));
});

test("candidate workflow keeps preflight before build and install-free", (t) => {
    const workflow = require("node:fs").readFileSync(resolve(__dirname, "..", "..", ".github", "workflows", "build-release-candidate.yml"), "utf8");
    t.true(workflow.indexOf("  preflight:") < workflow.indexOf("  build:"));
    t.true(workflow.includes("release-candidate-runtime.js preflight"));
    t.false(workflow.includes("npm install"));
});

test("candidate workflow replaces the runtime dependency destination with the verified checkpoint", (t) => {
    const workflow = readFileSync(resolve(__dirname, "..", "..", ".github", "workflows", "build-release-candidate.yml"), "utf8");
    const consume = workflow.indexOf("checkpoint/consume.js --branch devel --require-runtime-dependencies");
    const replace = workflow.indexOf("rm -rf runtime-dependencies", consume);
    const copy = workflow.indexOf('cp -a "$CHECKPOINT_RUNTIME_DEPENDENCIES" runtime-dependencies', consume);
    t.true(consume >= 0 && replace > consume && copy > replace);
    t.true(workflow.includes("test -s runtime-dependencies/manifest.v1.json"));
});

test("candidate workflow supplies the verified dependency bundle to every runtime image build", (t) => {
    const workflow = readFileSync(resolve(__dirname, "..", "..", ".github", "workflows", "build-release-candidate.yml"), "utf8");
    const build = workflow.slice(workflow.indexOf("build_image()"), workflow.indexOf(" > \"$RUNNER_TEMP/images.tsv\""));
    t.is((build.match(/--build-arg CHECKPOINT_RUNTIME_DEPENDENCIES=true/g) || []).length, 1);
    for (const role of ["bdd-node", "runner-node", "runner-python", "runner-bun", "pre-runner"]) t.true(build.includes(`build_image ${role} `));
});

test("candidate runtime Dockerfiles verify staged artifacts and install fully offline", (t) => {
    const verifier = readFileSync(resolve(__dirname, "..", "checkpoint", "verify-runtime-dependencies.js"), "utf8");
    const dockerfiles = [
        ["bdd-bun", resolve(__dirname, "..", "..", "docker", "Dockerfile.bdd-bun")],
        ["runner", resolve(__dirname, "..", "..", "packages", "runner", "Dockerfile")],
        ["runner-bun", resolve(__dirname, "..", "..", "packages", "runner-bun", "Dockerfile")],
        ["runner-python", resolve(__dirname, "..", "..", "packages", "runner-python", "Dockerfile")],
        ["pre-runner", resolve(__dirname, "..", "..", "packages", "pre-runner", "Dockerfile")],
    ];
    for (const [name, file] of dockerfiles) {
        const dockerfile = readFileSync(file, "utf8");
        if (name !== "pre-runner") {
            t.true(dockerfile.includes('CHECKPOINT_RUNTIME_DEPENDENCIES}" = "true"'));
            t.true(verifier.includes("Runtime dependency file hash mismatch"));
        }
        if (name === "bdd-bun" || name === "runner-bun" || name === "runner-python") t.true(dockerfile.includes("bun/bun-linux-x64.zip"));
        if (name === "runner" || name === "runner-bun" || name === "runner-python") {
            t.true(dockerfile.includes("yarn/yarn.tar.gz"));
            t.true(dockerfile.includes("yarn install --offline"));
        }
        t.false(dockerfile.includes("deb.nodesource.com"));
        if (name === "bdd-bun") t.true(dockerfile.includes("curl -fsSL https://bun.sh/install"));
    }
});

test("candidate lookup treats gh's missing-release response as a first-build state", (t) => {
    const root = mkdtempSync(join(tmpdir(), "candidate-locate-missing-release-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const output = join(root, "locate.json");
    const result = runtime.locate({
        repository: "scramjetorg/transform-hub",
        tag: `candidate-${SHA}`,
        sourceSha: SHA,
        output,
        runner: () => {
            const error = new Error("Command failed");
            error.stderr = "release not found\n";
            throw error;
        },
    });
    t.deepEqual(result, { status: "not-found" });
    t.deepEqual(JSON.parse(readFileSync(output, "utf8")), { status: "not-found", tag: `candidate-${SHA}` });
});

test("candidate lookup distinguishes an existing unsealed draft from a missing release", (t) => {
    const root = mkdtempSync(join(tmpdir(), "candidate-locate-unsealed-release-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const output = join(root, "locate.json");
    const result = runtime.locate({
        repository: "scramjetorg/transform-hub",
        tag: `candidate-${SHA}`,
        sourceSha: SHA,
        output,
        runner: (_command, args) => args[1] === "view" ? JSON.stringify({ databaseId: 17, isDraft: true, tagName: `candidate-${SHA}`, targetCommitish: SHA, assets: [{ name: "release-set.json" }] }) : "",
    });
    t.deepEqual(result, { status: "unsealed", tag: `candidate-${SHA}`, releaseId: 17 });
    t.deepEqual(JSON.parse(readFileSync(output, "utf8")), result);
});
