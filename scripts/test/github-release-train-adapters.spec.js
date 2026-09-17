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
