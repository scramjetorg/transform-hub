"use strict";

const test = require("ava").default;
const { existsSync, mkdtempSync, rmSync } = require("node:fs");
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

test("candidate workflow keeps preflight before build and install-free", (t) => {
    const workflow = require("node:fs").readFileSync(resolve(__dirname, "..", "..", ".github", "workflows", "build-release-candidate.yml"), "utf8");
    t.true(workflow.indexOf("  preflight:") < workflow.indexOf("  build:"));
    t.true(workflow.includes("release-candidate-runtime.js preflight"));
    t.false(workflow.includes("npm install"));
});
