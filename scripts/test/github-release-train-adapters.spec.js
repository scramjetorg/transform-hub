"use strict";

const test = require("ava").default;
const { existsSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { createGithubReleaseTrainAdapters } = require("../lib/github-release-train-adapters");

test("release-train adapters are factory-scoped and inject the runner/token", (t) => {
    const calls = [];
    const adapters = createGithubReleaseTrainAdapters({ githubToken: "scoped-token", runner: (command, args, options) => {
        calls.push({ command, args, options });
        return "a".repeat(40);
    } });
    t.is(adapters.git.ref("devel"), "a".repeat(40));
    t.false(Object.hasOwn(global, "releaseTrainAdapters"));
    t.is(calls[0].options.env.GH_TOKEN, "scoped-token");
});

test("missing identity-scoped start marker is absent without a rev-parse diagnostic", (t) => {
    const calls = [];
    const adapters = createGithubReleaseTrainAdapters({ runner: (command, args) => {
        calls.push({ command, args });
        if (args[0] === "rev-parse") throw new Error("not found");
        return "";
    } });
    t.is(adapters.reservation.readMarker({ stableVersion: "2.1.1", nextDevelopmentVersion: "2.1.2-devel" }), null);
    t.deepEqual(calls[0], { command: "git", args: ["rev-parse", "--verify", "--quiet", "refs/tags/release-train-start.v1/2.1.1/2.1.2-devel^{}"] });
});

test("release validation pins its worktree to expected R1, not the mutable release branch", (t) => {
    const calls = [];
    const branch = "release/2.1.1";
    const branchRevision = "D0".repeat(20);
    const expected = "R1".repeat(20);
    const adapters = createGithubReleaseTrainAdapters({ runner: (command, args, options) => {
        calls.push({ command, args, options });
        return "alignment is valid";
    } });

    adapters.align.validateRelease({ version: "2.1.1", branch, expected });

    t.deepEqual(calls[0].args, ["worktree", "add", "--detach", calls[0].args[3], expected]);
    t.not(calls[0].args[4], branch);
    t.not(calls[0].args[4], branchRevision);
});

test("development validation pins its worktree to expected D1, not devel", (t) => {
    const calls = [];
    const expected = "D1".repeat(20);
    const adapters = createGithubReleaseTrainAdapters({ runner: (command, args, options) => {
        calls.push({ command, args, options });
        return "alignment is valid";
    } });

    adapters.align.validateDevelopment({ version: "2.1.2-devel", branch: "devel", expected });

    t.deepEqual(calls[0].args, ["worktree", "add", "--detach", calls[0].args[3], expected]);
    t.not(calls[0].args[4], "devel");
});

test("release validation surfaces child stdout and stderr when check fails", (t) => {
    const calls = [];
    const adapters = createGithubReleaseTrainAdapters({ runner: (command, args) => {
        calls.push({ command, args });
        if (command === process.execPath) {
            const error = new Error("child failed");
            error.stdout = "\nrelease drift report\n";
            error.stderr = "\ncheck diagnostics\n";
            throw error;
        }
        return "";
    } });

    const error = t.throws(() => adapters.align.validateRelease({ version: "2.1.1", branch: "release/2.1.1", expected: "R1" }));
    t.regex(error.message, /release drift report/);
    t.regex(error.message, /check diagnostics/);
});

test("adapter lock reset refuses to clear an existing lock without failed-partial proof", (t) => {
    const directory = mkdtempSync(join(tmpdir(), "release-train-adapter-test-"));
    try {
        const lockPath = join(directory, "lock.json");
        writeFileSync(lockPath, "existing lock");
        const adapters = createGithubReleaseTrainAdapters({ lockPath, runner: () => "" });
        t.throws(() => adapters.lockStore.clearResetState({}, { kind: "failed-partial" }), { message: /while lock state exists/ });
        t.true(existsSync(lockPath));
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});
