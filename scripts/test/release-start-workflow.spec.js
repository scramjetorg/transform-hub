"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { checkWorkflowSource } = require("../check-workflow-policy.js");

test("release start keeps checkout credentials disabled and authenticates its push explicitly", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/release-start.yml"), "utf8");
    t.deepEqual(checkWorkflowSource(source, ".github/workflows/release-start.yml"), []);
    t.true(source.includes("persist-credentials: false"));
    t.true(source.includes("GH_TOKEN: ${{ github.token }}"));
    t.false(source.includes("GITHUB_TOKEN: ${{ github.token }}"));
    t.is((source.match(/git -c http\.https:\/\/github\.com\/.extraheader=/g) || []).length, 1);
    t.true(source.includes("printf 'x-access-token:%s' \"$GH_TOKEN\" | base64 -w 0"));
    t.true(source.includes("git -c http.https://github.com/.extraheader=\"AUTHORIZATION: basic"));
});

test("release start rebuilds the lockfile before alignment check and staging", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/release-start.yml"), "utf8");
    const apply = source.indexOf("npm run release:align:apply");
    const buildLockfile = source.indexOf("npm run build:lockfile");
    const check = source.indexOf("npm run release:align:check");
    const stage = source.indexOf("git add -A");

    t.true(apply >= 0);
    t.true(buildLockfile > apply);
    t.true(check > buildLockfile);
    t.true(stage > check);
});

test("release start installs and verifies pinned npm before npm ci", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/release-start.yml"), "utf8");
    const setupNode = source.indexOf("actions/setup-node@");
    const installNpm = source.indexOf("name: Install pinned npm");
    const installCommand = source.indexOf("npm install --global --ignore-scripts npm@11.19.0");
    const versionCheck = source.indexOf('test "$(npm --version)" = "11.19.0"');
    const ci = source.indexOf("npm ci --ignore-scripts");

    t.true(setupNode >= 0);
    t.true(installNpm > setupNode);
    t.true(installCommand > installNpm);
    t.true(versionCheck > installCommand);
    t.true(ci > versionCheck);
});
