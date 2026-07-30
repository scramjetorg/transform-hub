"use strict";

const test = require("ava");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "main-release.yml");

test("main release is protected, pinned, non-cancellable, and grants OIDC only to publication", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/main-release.yml"), []);
	t.true(source.includes("branches: [main]"));
	t.true(source.includes("group: main-production-release"));
	t.true(source.includes("cancel-in-progress: false"));
	t.is((source.match(/github\.repository == 'scramjetorg\/transform-hub'/g) || []).length, 3);
	t.true(source.includes("environment: production"));
	t.is((source.match(/id-token: write/g) || []).length, 1);
	t.true(source.includes("name: Release / npm publish"));
	t.true(source.includes("NPM_CONFIG_PROVENANCE: \"true\""));
	t.true(source.includes("ACTIONS_ID_TOKEN_REQUEST_URL"));
	t.true(source.includes("ACTIONS_ID_TOKEN_REQUEST_TOKEN"));
	t.true(source.includes("test -z \"${NPM_TOKEN:-}\""));
	t.true(source.includes("test -z \"${NODE_AUTH_TOKEN:-}\""));
	t.false(source.includes("secrets.NPM_TOKEN"));
	t.false(source.includes("secrets.NODE_AUTH_TOKEN"));
});

test("main release verifies alignment, clean builds, identity, and only then promotes checkpoints", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.true(source.includes("node scripts/release-align.js check"));
	t.true(source.includes("npm run build:packages"));
	t.true(source.includes("FLAT_PACKAGES=true MAKE_PUBLIC=true NO_INSTALL=true node scripts/build-all.js -w release"));
	t.true(source.includes("release-main.js prepare"));
	t.true(source.includes("release-main.js publish"));
	t.true(source.includes("publication-verified"));
	t.true(source.includes("main-checkpoint-promotion:"));
	t.true(source.includes("needs.production-publication.outputs.publication-verified == 'true'"));
	t.true(source.includes("group: checkpoint-pointer-main"));
	t.true(source.includes("git ls-remote origin refs/heads/main"));
	t.true(source.includes("--dry-run --branch main"));
	t.true(source.includes("scripts/checkpoint/publish.js"));
	t.true(source.includes("packages: write"));
	t.true(source.includes("docker login ghcr.io"));
	const promotionSource = source.slice(source.indexOf("main-checkpoint-promotion:"));
	t.true(promotionSource.includes("packages: write"));
	t.false(source.includes("pull_request_target"));
	t.false(source.includes("secrets."));
});
