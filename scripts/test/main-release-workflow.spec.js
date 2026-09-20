"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "main-release.yml");

test("main release enables read-write npm caching for both jobs", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.is((source.match(/cache-mode: read-write/g) || []).length, 2, "both main jobs use the read-write npm cache");
	t.is((source.match(/cache-mode: off/g) || []).length, 0, "no npm-installing main job disables the cache");
	t.false(source.includes("cache: \"false\""), "the legacy boolean cache input must not be used");

	const validationSource = source.slice(0, source.indexOf("  production-publication:"));
	const validationWith = validationSource.slice(validationSource.indexOf("uses: ./.github/actions/setup-workspace"));
	t.true(validationWith.includes("cache-mode: read-write"), "boundary validation setup must request the read-write cache");

	const publicationSource = source.slice(source.indexOf("  production-publication:"));
	t.true(publicationSource.includes("cache-mode: read-write"), "production publisher setup must request the read-write cache");

});

test("main release is protected, pinned, non-cancellable, and grants OIDC only to publication", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/main-release.yml"), []);
	t.true(source.includes("branches: [main]"));
	t.true(source.includes("group: main-production-release"));
	t.true(source.includes("cancel-in-progress: false"));
	t.is((source.match(/github\.repository == 'scramjetorg\/transform-hub'/g) || []).length, 2);
	t.is((source.match(/^  production-publication:$/gm) || []).length, 1);
	t.true(source.includes("environment: production"));
	t.is((source.match(/id-token: write/g) || []).length, 1);
	t.true(source.includes("name: Release / publish all verified npm waves through trusted publishing"));
	t.true(source.includes("NPM_CONFIG_PROVENANCE: \"true\""));
	t.true(source.includes("ACTIONS_ID_TOKEN_REQUEST_URL"));
	t.true(source.includes("ACTIONS_ID_TOKEN_REQUEST_TOKEN"));
	t.true(source.includes("test -z \"${NPM_TOKEN:-}\""));
	t.true(source.includes("test -z \"${NODE_AUTH_TOKEN:-}\""));
	t.false(source.includes("secrets.NPM_TOKEN"));
	t.false(source.includes("secrets.NODE_AUTH_TOKEN"));
});

test("main release retains its immutable manifest before ordered waves", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.is((source.match(/npm run release:align:check -- --release-version=/g) || []).length, 2);
	t.true(source.includes("$(node -p \"require('./package.json').version\")"));
	t.true(source.includes("node node_modules/npm/bin/npm-cli.js run build:packages"));
	t.true(source.includes("FLAT_PACKAGES=true MAKE_PUBLIC=true NO_INSTALL=true node scripts/build-all.js -w release"));
	t.true(source.includes("release-main.js prepare"));
	t.true(source.includes("actions/upload-artifact@65c4c4a1ddee5b72f698fdd19549f0f0fb45cf08"));
	t.true(source.includes("name: main-release-manifest-${{ github.sha }}"));
	t.true(source.includes("retention-days: 90"));
	t.true(source.indexOf("actions/upload-artifact@") < source.indexOf("release-main.js publish"));
	t.true(source.includes("release-main.js publish --release"));
	t.true(source.includes("main-release-publication.v1.json"));
	t.true(source.includes("verifyPublication(publication, release)"));
	t.false(source.includes("packages: write"));
	t.false(source.includes("docker login ghcr.io"));
	t.false(source.includes("pull_request_target"));
	t.false(source.includes("secrets."));
});
