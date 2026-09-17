"use strict";

const test = require("ava").default;
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
