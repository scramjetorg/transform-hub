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
