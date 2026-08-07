"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "release-pr-validate.yml");

test("release PR validation is scoped to same-repository devel-to-main changes", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/release-pr-validate.yml"), []);
	t.true(source.includes("name: Release PR validation"));
	t.true(source.includes("pull_request:"));
	t.true(source.includes("branches: [main]"));
	t.true(source.includes("name: Release PR / package validation"));
	t.true(source.includes("github.event.pull_request.base.ref == 'main'"));
	t.true(source.includes("github.event.pull_request.head.ref == 'devel'"));
	t.true(source.includes("github.event.pull_request.head.repo.full_name == github.repository"));
	t.true(source.includes("group: release-pr-validation-${{ github.event.pull_request.number }}"));
	t.true(source.includes("cancel-in-progress: false"));
});

test("release PR validation uses a clean, read-only, immutable checkout for build and package tests", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	const checkout = "uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
	const setup = "uses: ./.github/actions/setup-workspace";
	const checkoutIndex = source.indexOf(checkout);
	const setupIndex = source.indexOf(setup);
	const buildIndex = source.indexOf("npm run build:packages");
	const testIndex = source.indexOf("npm run test:packages-no-concurrent");

	t.true(checkoutIndex >= 0);
	t.true(setupIndex > checkoutIndex);
	t.true(buildIndex > setupIndex);
	t.true(testIndex > buildIndex);
	t.true(source.includes("persist-credentials: false"));
	t.true(source.includes("ref: ${{ github.event.pull_request.head.sha }}"));
	t.true(source.includes("cache: \"false\""));
	t.is((source.match(/npm run build:packages/g) || []).length, 1);
	t.is((source.match(/npm run test:packages-no-concurrent/g) || []).length, 1);
	t.true(source.includes("permissions:\n  contents: read"));
	t.true(source.includes("permissions:\n      contents: read"));
	t.false(source.includes("pull_request_target"));
	t.is((source.match(/^ {6}packages: write$/gm) || []).length, 1, "exactly one job may grant packages: write");
	t.false(source.includes("id-token: write"));
	t.false(source.includes("actions/cache"));
	t.false(source.includes("npm publish"));
});

test("release PR package validation installs pinned Bun before package tests", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	const jobStart = source.indexOf("  package-validation:\n");
	const jobEnd = source.indexOf("  prerelease-publication:\n");
	const job = source.slice(jobStart, jobEnd);

	t.true(job.includes("oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6"), "Bun action must use the pinned commit");
	t.true(job.includes('bun-version: "1"'), "Bun major-version input must be pinned to 1");
	t.true(
		job.indexOf("oven-sh/setup-bun@") > job.indexOf("uses: ./.github/actions/setup-workspace"),
		"Setup Bun must run after setup-workspace"
	);
	t.true(
		job.indexOf("oven-sh/setup-bun@") < job.indexOf("npm run test:packages-no-concurrent"),
		"Setup Bun must run before package tests"
	);
	t.is((source.match(/oven-sh\/setup-bun@/g) || []).length, 1, "Setup Bun must appear only in the package-validation job");
});

test("release PR prerelease publication is guarded, serialized, environment-gated, and isolated to GitHub Packages", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/release-pr-validate.yml"), []);
	t.true(source.includes("prerelease-publication:"));
	t.true(source.includes("name: Release PR / prerelease publication"));
	t.true(source.includes("needs: [package-validation]"));
	t.is((source.match(/github\.event\.pull_request\.head\.repo\.full_name == github\.repository/g) || []).length, 3);
	t.is((source.match(/github\.event\.pull_request\.head\.ref == 'devel'/g) || []).length, 3);
	t.is((source.match(/github\.event\.pull_request\.base\.ref == 'main'/g) || []).length, 3);
	t.true(source.includes("packages: write"));
	t.true(source.includes('test "$PRERELEASE_PUBLISH_ENABLED" = "true"'));
	t.true(source.includes("SCRAMJET_GH_PACKAGES_PRERELEASE_PUBLISHER"));
	t.true(source.includes("https://npm.pkg.github.com"));
	t.true(source.includes("@scramjetorg:registry=https://npm.pkg.github.com"));
	t.false(source.includes("@scramjet:registry=https://npm.pkg.github.com"));
	t.true(source.includes("NPM_CONFIG_USERCONFIG"));
	t.true(source.includes("release-prerelease.js plan"));
	t.true(source.includes("release-prerelease.js publish"));
	t.true(source.includes("PRERELEASE_ATTEMPT: r${{ github.run_id }}.a${{ github.run_attempt }}"));
	t.true(source.includes("--attempt \"$PRERELEASE_ATTEMPT\""));
	t.false(source.includes("id-token: write"));
	t.false(source.includes("registry.npmjs.org"));
});

test("release PR prerelease publication awaits the github-packages-prerelease environment and uses only the automatic token", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	const publicationStart = source.indexOf("  prerelease-publication:\n");
	const publicationEnd = source.indexOf("  prerelease-bdd:\n");
	const publication = source.slice(publicationStart, publicationEnd);
	const packageValidation = source.slice(source.indexOf("  package-validation:\n"), publicationStart);
	const bdd = source.slice(publicationEnd);

	t.is((source.match(/environment: github-packages-prerelease/g) || []).length, 1, "the environment must be bound exactly once");
	t.true(publication.includes("environment: github-packages-prerelease"), "the prerelease-publication job must await environment approval");
	t.false(packageValidation.includes("environment:"), "package validation must not use the environment");
	t.false(bdd.includes("environment: github-packages-prerelease"), "prerelease BDD must stay outside the environment");
	t.true(publication.includes("packages: write"), "publication keeps least-privilege packages: write");
	t.true(bdd.includes("packages: read"), "BDD keeps least-privilege packages: read");
	t.true(publication.includes("NODE_AUTH_TOKEN: ${{ github.token }}"), "publication npm auth must use the automatic GITHUB_TOKEN");
	t.false(source.includes("SCRAMJET_RELEASE_PRERELEASE_PACKAGES_TOKEN"), "the removed publish token secret must not be referenced");
	t.false(source.includes("SCRAMJET_RELEASE_PRERELEASE_PACKAGES_READ_TOKEN"), "the removed read token secret must not be referenced");
	t.false(source.includes("${{ secrets."), "no PAT or npm token secret expression may be introduced");
});

test("release PR BDD consumes only verified publisher output and exact prereleases with read-only automatic-token auth", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	const bddStart = source.indexOf("  prerelease-bdd:\n");
	const bdd = source.slice(bddStart);
	t.true(source.includes("prerelease-bdd:"));
	t.true(source.includes("name: Release PR / prerelease BDD"));
	t.true(source.includes("needs: [prerelease-publication]"));
	t.true(source.includes("packages: read"));
	t.true(source.includes("attestations: read"));
	t.true(source.includes("prerelease-manifest-sha256"));
	t.true(source.includes("PUBLISHER_MANIFEST"));
	t.true(source.includes("release-prerelease-bdd.js verify"));
	t.false(source.includes("release-prerelease-bdd.js verify --manifest \"$RUNNER_TEMP/release-prerelease-manifest.json\" --expected-checksum \"$EXPECTED_CHECKSUM\" --dry-run"));
	t.true(source.includes("release-prerelease-bdd.js prepare"));
	t.true(source.includes("release-prerelease-bdd.js verify-lock"));
	t.true(source.includes("release-prerelease-bdd.js activate"));
	t.true(source.includes("npm --prefix .release-prerelease-bdd install --package-lock-only --ignore-scripts"));
	t.false(source.includes("npm --prefix .release-prerelease-bdd install --package-lock-only --ignore-scripts --registry https://npm.pkg.github.com"));
	t.true(source.includes("npm --prefix .release-prerelease-bdd ci --ignore-scripts"));
	t.true(source.includes("npm run test:bdd-ci-api-node"));
	t.true(source.includes("npm install --global --ignore-scripts npm@11.19.0"));
	t.true(source.includes('test "$(npm --version)" = "11.19.0"'));
	t.true(source.includes("BDD_NODE_IMAGE"));
	t.true(bdd.includes("BDD_IMAGE_REPOSITORY: ghcr.io/scramjetorg/transform-hub/bdd-node"));
	t.true(bdd.includes("HEAD_SHA: ${{ github.event.pull_request.head.sha }}"));
	t.true(bdd.includes('bdd_image_tag="$BDD_IMAGE_REPOSITORY:devel-$HEAD_SHA"'));
	t.true(bdd.includes("docker buildx imagetools inspect --format '{{.Digest}}' \"$bdd_image_tag\""));
	t.true(bdd.includes('reference: `${repository}@${digest}`'));
	t.true(bdd.includes("docker login ghcr.io"));
	t.true(bdd.includes("docker logout ghcr.io"));
	t.true(bdd.includes("GH_TOKEN: ${{ github.token }}"), "attestation verification uses the automatic GitHub token");
	t.true(bdd.includes("gh attestation verify \"$bdd_image_subject\""));
	t.true(bdd.includes("--repo scramjetorg/transform-hub"));
	t.true(bdd.includes("--source-ref refs/heads/devel"));
	t.true(bdd.includes("--source-digest \"$HEAD_SHA\""));
	t.true(bdd.includes("--signer-workflow .github/workflows/devel-bdd-image.yml@refs/heads/devel"));
	t.true(bdd.includes("--predicate-type https://slsa.dev/provenance/v1"));
	t.true(bdd.includes("--deny-self-hosted-runners"));
	t.true(bdd.includes("BDD image attestation verification failed for devel source $HEAD_SHA"));
	t.false(source.includes("SCRAMJET_RELEASE_PRERELEASE_BDD_IMAGES"), "BDD image JSON must not be an operator-supplied variable");
	t.true(source.includes('test "$PUBLISHED" = "true"'));
	t.true(source.includes('test "$BDD_REGISTRY_ENABLED" = "true"'));
	t.true(bdd.includes("NODE_AUTH_TOKEN: ${{ github.token }}"), "BDD read auth must use the automatic GITHUB_TOKEN");
	t.false(/^ {4}environment:/m.test(bdd), "prerelease BDD must not be bound to the approval environment");
	t.false(source.includes("live=false"));
	t.false(source.includes("download-artifact"));
	t.false(source.includes("upload-artifact"));
	t.false(/^ {6}id-token: write$/m.test(bdd), "the read-only BDD job must not mint an OIDC token");
});

test("release PR BDD fails closed when a SHA tag is repointed to a digest without matching devel provenance", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	const bdd = source.slice(source.indexOf("  prerelease-bdd:\n"));
	const verificationStart = bdd.indexOf('if ! gh attestation verify "$bdd_image_subject"');
	const verificationEnd = bdd.indexOf("BDD_IMAGES=", verificationStart);
	const verification = bdd.slice(verificationStart, verificationEnd);

	t.true(verificationStart >= 0, "the digest must be verified before BDD_IMAGES is constructed");
	t.true(verification.includes('--source-digest "$HEAD_SHA"'));
	t.true(verification.includes("exit 1"), "an unrelated tag digest must stop the BDD job");
	t.false(verification.includes("|| true"), "attestation mismatch must not be ignored");
	const repointedTagVerification = verification.replace('--source-digest "$HEAD_SHA"', '--source-digest "different-source-sha"');
	t.false(repointedTagVerification.includes('--source-digest "$HEAD_SHA"'), "the policy binding is source-digest specific rather than tag-only");
});

test("release PR BDD installs root dependencies after pinning npm and before trusted manifest verification", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	const bddStart = source.indexOf("  prerelease-bdd:\n");
	const bdd = source.slice(bddStart);

	// The BDD helper scripts (release-prerelease-bdd.js -> release-boundary.js)
	// require root dependencies such as glob, so root node_modules must exist
	// before the trusted manifest verification step runs.
	const pinNpm = bdd.indexOf("npm install --global --ignore-scripts npm@11.19.0");
	const pinnedVersion = bdd.indexOf('test "$(npm --version)" = "11.19.0"');
	const rootInstall = bdd.indexOf("npm ci --ignore-scripts");
	const verify = bdd.indexOf("release-prerelease-bdd.js verify");

	t.true(pinNpm >= 0, "pinned npm install must exist in the prerelease-bdd job");
	t.true(pinnedVersion > pinNpm, "pinned npm version must be asserted after install");
	t.true(rootInstall > pinnedVersion, "root dependency install must run after pinned npm is verified");
	t.true(rootInstall < verify, "root dependency install must run before trusted manifest verification");
	t.true(source.includes("Install root dependencies"), "the root dependency install step must be named");
});
