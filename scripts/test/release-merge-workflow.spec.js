"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

test("main merge reconstructs devel and only release branches may create tags", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/release-merge.yml"), "utf8");

    t.deepEqual(checkWorkflowSource(source, ".github/workflows/release-merge.yml"), []);
    t.true(source.includes("node scripts/release-align.js apply-development --development-version=\"$(node scripts/release-flow.js development-version \"$version\")\""));
    t.true(source.includes("npm run build:lockfile"));
    t.true(source.includes("node scripts/release-align.js check-development --development-version=\"$(node scripts/release-flow.js development-version \"$version\")\""));
    t.true(
        source.indexOf("node scripts/release-align.js apply-development") < source.indexOf("npm run build:lockfile") &&
            source.indexOf("npm run build:lockfile") < source.indexOf("node scripts/release-align.js check-development") &&
            source.indexOf("npm run build:lockfile") < source.indexOf("git add -A"),
        "lockfile rebuild follows development reconstruction before alignment check and staging",
    );
    t.true(source.includes("development-version \"$version\""), "reconstruction uses the deterministic next-patch helper");
    t.true(source.includes("persist-credentials: false"));
    t.true(source.includes("pull-requests: read"));
    t.true(source.includes("releases\" --paginate"));
    t.true(source.includes("verify-bundle"));
    t.true(source.includes("candidate_tree"));
    t.true(source.includes("actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1"));
    t.true(source.includes("id: app-token"));
    t.true(source.includes("client-id: ${{ vars.RELEASE_APP_CLIENT_ID }}"));
    t.true(source.includes("private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}"));
    t.true(source.includes("owner: ${{ github.repository_owner }}"));
    t.true(source.includes("repositories: transform-hub"));
    t.true(source.includes("permission-contents: write"));
    t.true(source.includes("run: gh auth setup-git"));
    t.is((source.match(/GH_TOKEN: \$\{\{ steps\.app-token\.outputs\.token \}\}/g) || []).length, 2);
    t.is((source.match(/git push origin /g) || []).length, 2);
    t.false(source.includes("github.token"));
    t.false(source.includes("http.https://github.com/.extraheader"));
    t.false(source.includes("AUTHORIZATION:"));
    t.false(source.includes("base64"));
    t.true(source.includes("if [[ \"$head_ref\" == release/* ]]; then"));
    t.true(source.includes("reconstructing devel without publishing"));
    t.true(source.includes("git/ref/tags/v$version"));
    t.true(source.includes("already exists; skipping tag creation"));
    t.true(source.includes("push origin \"v$version\""));
    t.false(source.includes("release:align:apply -- --development-version"));
    t.false(source.includes("release:align:check -- --development-version"));
});
