"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { parseCliArguments } = require("../release-simple.js");

const root = resolve(__dirname, "..", "..", ".github", "workflows");
const read = (name) => readFileSync(resolve(root, name), "utf8");

test("workflow invocations match the release-simple CLI contract", (t) => {
	const eligibility = parseCliArguments(["assert-eligible", "--development-version", "2.2.0-devel", "--main-version", "2.1.0", "--open-release-prs", "0", "--stable-version", "2.2.0", "--source-sha", "a".repeat(40)]);
	t.is(eligibility.command, "assert-eligible");
	t.is(eligibility.developmentVersion, "2.2.0-devel");
	t.is(eligibility.stableVersion, "2.2.0");
	t.is(eligibility.sourceSha.length, 40);
	const pack = parseCliArguments(["pack", "--stable-version", "2.2.0", "--source-sha", "b".repeat(40), "--packages-dir", "/tmp/assets", "--output", "/tmp/candidate-manifest.json"]);
	t.is(pack.command, "pack");
	t.is(pack.packagesDir, "/tmp/assets");
	t.is(pack.output, "/tmp/candidate-manifest.json");
});

test("devel eligibility is read-only and checks the live promotion set", (t) => {
	const source = read("pr-fast-validation.yml");
	t.true(source.includes("name: Release / devel promotion eligibility"));
	t.true(source.includes("pull-requests: read"));
	t.true(source.includes("github.event.pull_request.base.ref == 'devel'"));
	t.true(source.includes("contents: read"));
	t.true(source.includes("contents: write") === false);
	t.true(source.includes("release-simple.js assert-eligible"));
	t.true(source.includes("head_version"));
	t.true(source.includes("main_version"));
	t.true(source.includes("open_promotions"));
});

test("release start is manually restricted to devel and performs only stable promotion", (t) => {
	const source = read("release-start.yml");
	t.true(source.includes("workflow_dispatch:"));
	t.true(source.includes("github.ref == 'refs/heads/devel'"));
	t.true(source.includes("release-simple.js assert-eligible"));
	t.true(source.includes("eligible_stable"));
	t.true(source.includes('test "$eligible_stable" = "$STABLE_VERSION"'));
	t.true(source.includes("git switch --create \"$branch\" \"$GITHUB_SHA\""));
	t.true(source.includes("release-simple.js promote"));
	t.false(source.includes("--branch \"$branch\""));
	t.true(source.includes("git push --set-upstream origin \"$branch\""));
	t.true(source.includes("gh pr create --base main"));
	for (const retired of ["release-train", "recovery", "reset", "force-with-lease"]) t.false(source.toLowerCase().includes(retired));
});

test("release candidate validates same-repository release branches and creates a fresh draft", (t) => {
	const source = read("release-candidate.yml");
	t.true(source.includes("branches: [main]"));
	t.true(source.includes("startsWith(github.event.pull_request.head.ref, 'release/')"));
	t.true(source.includes("github.event.pull_request.head.repo.full_name == github.repository"));
	t.true(source.includes("git merge-base --is-ancestor origin/devel HEAD"));
	for (const command of ["npm run check:lockfile", "npm run check:security-workflow", "npm run lint", "npm run typecheck", "npm run check:runtime-invariants", "npm run test:packages:ci", "npm run build:packages", "npm run test:bdd-ci-node", "npm pack"]) t.true(source.includes(command));
	t.true(source.includes("release-simple.js pack"));
	t.true(source.includes("--packages-dir \"$RUNNER_TEMP/release-candidate\""));
	t.true(source.includes("candidate-manifest.json"));
	t.false(source.includes("release-candidate/manifest.json"));
	t.true(source.includes("manifest.assets"));
	t.true(source.includes('for asset in "${assets[@]}"'));
	t.true(source.includes("gh release create \"$TAG\" --draft"));
	t.true(source.includes("git/ref/tags/$TAG"));
	t.false(source.includes("environment:"));
});
