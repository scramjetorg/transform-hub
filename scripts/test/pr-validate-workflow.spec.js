"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "pr-validate.yml");
const setupActionPath = resolve(__dirname, "..", "..", ".github", "actions", "setup-workspace", "action.yml");
const securityWorkflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "security-check.yml");
const securityScannerPath = resolve(__dirname, "..", "security", "scan-git-history.js");

function workflowSource() {
	return readFileSync(workflowPath, "utf8");
}

function setupActionSource() {
	return readFileSync(setupActionPath, "utf8");
}

test("base PR workflow is read-only, cancellable, and uses a fresh restore-only workspace", (t) => {
	const source = workflowSource();
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/pr-validate.yml"), []);
	t.true(source.includes("branches: [main, devel, \"release/**\", \"feat/manager-oss\"]"));
	t.true(source.includes("merge_group:"));
	t.true(source.includes("format('pr-{0}'"));
	t.true(source.includes("format('merge-group-{0}'"));
	t.true(source.includes("format('release-pr-{0}'"));
	t.true(source.includes("contents: read"));
	t.true(source.includes("runs-on: ubuntu-24.04"));
	t.true(source.includes("name: CI / package validation"));
	t.true(source.includes("cache-mode: restore-only"));
	t.false(source.includes("cache: \"false\""));
	t.true(source.includes("github.event.pull_request.head.sha"));
	t.is((source.match(/checkpoint-branch: \$\{\{ github\.event\.pull_request\.base\.ref \|\| github\.event\.merge_group\.base_ref \|\| '' \}\}/g) || []).length, 3);
	t.false(source.includes("SCRAMJET_PR_CHECKPOINT_REFERENCE"));
	t.true(source.includes("organization-required security workflow"));
	t.false(source.includes("pull_request_target"));
	t.is((source.match(/^ {6}packages: write$/gm) || []).length, 1, "only the guarded release publication job may grant packages: write");
	t.false(source.includes("id-token: write"));
	t.false(source.includes("upload-artifact"));
	t.false(source.includes("actions/cache"));
});

test("fast gates run in the required order after fresh setup", (t) => {
	const source = workflowSource();
	const commands = [
		"Mergeability and merge-queue eligibility",
		"npm run check:security-workflow",
		"npm run lint",
		"npm run typecheck",
		"npm run release:align:check",
		"npm run check:runtime-invariants",
		"npm run check:licenses",
	];

	let previous = source.indexOf("cache-mode: restore-only");
	for (const command of commands) {
		const current = source.indexOf(command);
		t.true(current > previous, `${command} must follow the preceding fast gate`);
		previous = current;
	}
});

test("lockfile reproducibility gate runs after checkout and before the workspace install", (t) => {
	const source = workflowSource();
	const rootPkg = require("../../package.json");

	t.true(typeof rootPkg.scripts["build:lockfile"] === "string", "root package.json must define build:lockfile");
	t.regex(
		rootPkg.scripts["build:lockfile"],
		/npx\s+--yes\s+npm@11\.19\.0\s+install\s+--package-lock-only\s+--ignore-scripts/,
		"build:lockfile must rebuild the lock with the pinned npm via npx"
	);
	t.is(
		rootPkg.scripts["check:lockfile"],
		"npm run build:lockfile && git diff --exit-code -- package-lock.json",
		"check:lockfile must compose the pinned rebuild with the diff gate"
	);

	const checkout = "uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
	const setup = "uses: ./.github/actions/setup-workspace";
	const lockfileGate = source.indexOf("npm run check:lockfile");

	t.true(lockfileGate > source.indexOf(checkout), "lockfile gate must run after checkout");
	t.true(lockfileGate < source.indexOf(setup), "lockfile gate must run before setup-workspace");
	t.false(source.includes("git diff --exit-code -- package-lock.json"), "the workflow must call the shared check:lockfile command instead of duplicating the diff");
});

test("single package-validation job owns gates, Bun, serial AVA tests, and the package build", (t) => {
	const source = workflowSource();
	t.true(source.includes("package-validation:"));
	t.true(source.includes("name: CI / package validation"));
	t.false(source.includes("base-validation:"));
	t.false(source.includes("ava-pre-build:"));
	t.false(source.includes("package-build:"));
	t.false(source.includes("name: CI / AVA"));
	t.false(source.includes("name: CI / package build"));
	t.true(source.includes("oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6"));
	t.true(source.includes('bun-version: "1"'));
	t.true(source.indexOf("oven-sh/setup-bun@") < source.indexOf("npm run test:packages:ci"));
	t.true(source.includes("npm run test:packages:ci"));
	t.true(source.indexOf("npm run test:packages:ci") < source.indexOf("run: npm run build:packages"));
	t.is((source.match(/npm run build:packages/g) || []).length, 3);
	t.is((source.match(/npm run test:packages:ci/g) || []).length, 1);
	t.is((source.match(/oven-sh\/setup-bun@/g) || []).length, 1, "Setup Bun must appear only in the package-validation job");
});

test("core BDD lane runs Node, Python, API, and Verser2 BDD sequentially after one shared build", (t) => {
	const source = workflowSource();
	t.true(source.includes("bdd-core:"));
	t.true(source.includes("name: CI / core BDD"));
	t.true(source.includes("needs: [package-validation]"));
	const jobStart = source.indexOf("  bdd-core:\n");
	const jobEnd = source.indexOf("  bdd-extended:\n");
	const job = source.slice(jobStart, jobEnd);
	const commands = [
		"run: npm run build:packages",
		"npm run test:bdd-ci-node",
		"npm run test:bdd-ci-python",
		"npm run test:bdd-ci-api-node",
		"npm run test:bdd-ci-verser2",
	];
	let previous = job.indexOf("uses: ./.github/actions/setup-workspace");
	for (const command of commands) {
		const current = job.indexOf(command);
		t.true(current > previous, `${command} must follow the preceding core BDD step`);
		previous = current;
	}
	t.is((job.match(/uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/g) || []).length, 1);
	t.is((job.match(/uses: \.\/\.github\/actions\/setup-workspace/g) || []).length, 1);
	t.true(job.includes("cache-mode: restore-only"));
	t.true(job.includes("timeout-minutes: 60"));
});

test("extended BDD lane runs the legacy hub, API-topic, process-adapter, and unified commands sequentially", (t) => {
	const source = workflowSource();
	t.true(source.includes("bdd-extended:"));
	t.true(source.includes("name: CI / extended BDD"));
	t.true(source.includes("needs: [package-validation]"));
	const jobStart = source.indexOf("  bdd-extended:\n");
	const jobEnd = source.indexOf("  prerelease-publication:\n");
	const job = source.slice(jobStart, jobEnd);
	const commands = [
		"run: npm run build:packages",
		"npm run test:bdd-ci-hub",
		"npm run test:bdd-ci-api-topic",
		"RUNTIME_ADAPTER=process npm run test:bdd-ci-node",
		"npm run test:unified-py",
		"npm run test:unified-js",
	];
	let previous = job.indexOf("uses: ./.github/actions/setup-workspace");
	for (const command of commands) {
		const current = job.indexOf(command);
		t.true(current > previous, `${command} must follow the preceding extended BDD step`);
		previous = current;
	}
	t.true(job.includes("cache-mode: restore-only"));
	const timeout = job.match(/timeout-minutes:\s*(\d+)/);
	t.true(timeout && Number(timeout[1]) >= 60, "extended BDD must keep a measured-safe timeout of at least 60 minutes");
	t.is((job.match(/uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/g) || []).length, 1);
	t.is((job.match(/uses: \.\/\.github\/actions\/setup-workspace/g) || []).length, 1);
});

test("validation, BDD, and release jobs are isolated with no artifact or node_modules handoff", (t) => {
	const source = workflowSource();
	t.is((source.match(/uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/g) || []).length, 5);
	t.is((source.match(/uses: \.\/\.github\/actions\/setup-workspace/g) || []).length, 4);
	t.is((source.match(/cache-mode: restore-only/g) || []).length, 3);
	t.is((source.match(/cache-mode: off/g) || []).length, 1);
	t.is((source.match(/persist-credentials: false/g) || []).length, 5);
	t.is((source.match(/needs: \[package-validation\]/g) || []).length, 2);
	t.false(source.includes("upload-artifact"));
	t.false(source.includes("download-artifact"));
	t.false(source.includes("actions/cache"));
});

test("ordinary PR source jobs restore the npm cache but the credentialed publication job disables caching", (t) => {
	const source = workflowSource();
	const publicationStart = source.indexOf("  prerelease-publication:\n");
	const publicationEnd = source.indexOf("  prerelease-bdd:\n");
	const publication = source.slice(publicationStart, publicationEnd);
	const validationAndBdd = source.slice(0, publicationStart);

	// package-validation, bdd-core, and bdd-extended are uncredentialed source
	// jobs: they may restore a previously validated cache but never write one.
	t.is((source.match(/cache-mode: restore-only/g) || []).length, 3, "exactly the three ordinary PR source jobs must restore the cache");
	t.is((validationAndBdd.match(/cache-mode: restore-only/g) || []).length, 3, "package validation and both BDD lanes must use restore-only");
	t.false(validationAndBdd.includes("cache-mode: off"), "ordinary PR source jobs must not disable the cache restore");

	// prerelease-publication carries packages: write and NODE_AUTH_TOKEN, so it
	// must not restore a reusable cache before publishing or save one from
	// release code; it is the single cache-mode: off caller.
	t.true(publication.includes("packages: write"));
	t.true(publication.includes("NODE_AUTH_TOKEN: ${{ github.token }}"));
	t.is((publication.match(/cache-mode: off/g) || []).length, 1, "the credentialed publication job must use cache-mode: off");
	t.false(publication.includes("cache-mode: restore-only"), "the credentialed publication job must not restore a reusable cache");
});

test("Node 22/npm-only setup helper configures dependencies after caller checkout", (t) => {
	const source = setupActionSource();
	t.regex(source, /actions\/setup-node@[a-f0-9]{40}/);
	t.true(source.includes('node-version: "22"'));
	t.true(source.includes("scripts/checkpoint/consume.js"));
	t.true(source.includes("npm ci"));
	t.true(source.includes("npm ci --cache \"$CHECKPOINT_NPM_CACHE\""));
	t.false(source.includes("actions/checkout@"));
	t.false(source.includes("inputs.ref"));
	t.false(source.includes("yarn"));
});

test("PR and merge-group workflow keeps fork-safe read-only permissions and stale-run cancellation", (t) => {
	const source = workflowSource();
	t.true(source.includes("pull_request:"));
	t.true(source.includes("branches: [main, devel, \"release/**\", \"feat/manager-oss\"]"));
	t.true(source.includes("merge_group:"));
	t.true(source.includes("types: [checks_requested]"));
	t.true(source.includes("format('pr-{0}'"));
	t.true(source.includes("format('merge-group-{0}'"));
	t.is((source.match(/permissions:\n\s+contents: read/g) || []).length, 5);
	t.is((source.match(/uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/g) || []).length, 5);
	t.is((source.match(/persist-credentials: false/g) || []).length, 5);
	t.is((source.match(/uses: \.\/\.github\/actions\/setup-workspace/g) || []).length, 4);
	t.is((source.match(/cache-mode: restore-only/g) || []).length, 3);
	t.is((source.match(/cache-mode: off/g) || []).length, 1);
	t.false(source.includes("pull_request_target"));
	t.false(source.includes("id-token: write"));
	t.false(source.includes("${{ secrets."), "no PAT or npm token secret expression may be introduced");
	t.false(source.includes("yarn"));
});

test("every PR job checks out an explicit ref before invoking the local setup helper", (t) => {
	const source = workflowSource();
	const checkout = "uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
	const helper = "uses: ./.github/actions/setup-workspace";
	let offset = 0;

	for (let job = 0; job < 4; job++) {
		const checkoutIndex = source.indexOf(checkout, offset);
		const helperIndex = source.indexOf(helper, offset);
		t.true(checkoutIndex >= offset, `job ${job + 1} must check out first`);
		t.true(helperIndex > checkoutIndex, `job ${job + 1} must invoke setup after checkout`);
		const block = source.slice(checkoutIndex, helperIndex);
		t.true(block.includes("persist-credentials: false"), `job ${job + 1} checkout must not persist credentials`);
		t.true(block.includes("ref: ${{ github.event.pull_request.head.sha"), `job ${job + 1} checkout must use the event SHA`);
		offset = helperIndex + helper.length;
	}

	// The prerelease-bdd job uses its own raw setup-node after checkout.
	const rawSetupNode = "uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020";
	const lastCheckout = source.lastIndexOf(checkout);
	t.true(lastCheckout < source.indexOf(rawSetupNode), "prerelease BDD must check out before raw setup-node");
});

test("PR outputs remain disposable and the repository security scan is connected without claiming external enforcement", (t) => {
	const source = workflowSource();
	const securitySource = readFileSync(securityWorkflowPath, "utf8");
	const scannerSource = readFileSync(securityScannerPath, "utf8");
	t.true(source.includes("npm run check:security-workflow"));
	t.true(source.includes("organization-required security workflow remains mandatory"));
	t.true(securitySource.includes("name: Security / repository policy"));
	t.true(securitySource.includes("npm run security:scan-history -- --range"));
	t.true(scannerSource.includes("--redact"));
	t.false(source.includes("upload-artifact"));
	t.false(source.includes("download-artifact"));
	t.false(source.includes("actions/cache"));
	t.false(source.includes("docker push"));
	t.false(source.includes("npm publish"));
	t.is((source.match(/PR outputs remain disposable/g) || []).length, 4);
});

test("release runs are scoped to same-repository devel-to-main changes and never cancel a publication partway", (t) => {
	const source = workflowSource();
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/pr-validate.yml"), []);
	t.is((source.match(/github\.event\.pull_request\.head\.repo\.full_name == github\.repository/g) || []).length, 4);
	t.is((source.match(/github\.event\.pull_request\.head\.ref == 'devel'/g) || []).length, 4);
	t.is((source.match(/github\.event\.pull_request\.base\.ref == 'main'/g) || []).length, 4);
	t.true(source.includes("format('release-pr-{0}'"), "release PR runs must use a distinct concurrency group");
	t.true(source.includes("cancel-in-progress: ${{ !(github.event_name == 'pull_request' && github.event.pull_request.base.ref == 'main' && github.event.pull_request.head.ref == 'devel' && github.event.pull_request.head.repo.full_name == github.repository) }}"), "only eligible release runs must disable cancellation");
	t.true(source.includes("prerelease-publication:"));
	t.true(source.includes("name: Release PR / prerelease publication"));
	t.true(source.includes("needs: [bdd-core, bdd-extended]"), "publication must natively need both BDD lanes");
	t.true(source.includes("prerelease-bdd:"));
	t.true(source.includes("name: Release PR / prerelease BDD"));
	t.true(source.includes("needs: [prerelease-publication]"), "prerelease BDD must natively need publication");
	t.is((source.match(/^ {4}if: \${{ github\.event\.pull_request\.base\.ref == 'main' && github\.event\.pull_request\.head\.ref == 'devel' && github\.event\.pull_request\.head\.repo\.full_name == github\.repository }}$/gm) || []).length, 2, "exactly the two release jobs carry the devel-to-main guard");
	t.false(source.includes("pull_request_target"));
});

test("release prerelease publication is guarded, serialized, environment-gated, and isolated to GitHub Packages", (t) => {
	const source = workflowSource();
	t.true(source.includes("prerelease-publication:"));
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
	t.true(source.includes("group: release-prerelease-publication"), "publication must keep its serialized safety behavior");
	t.false(source.includes("id-token: write"));
	t.false(source.includes("registry.npmjs.org"));
	t.false(source.includes("npm publish"));
});

test("release prerelease publication awaits the github-packages-prerelease environment and uses only the automatic token", (t) => {
	const source = workflowSource();
	const publicationStart = source.indexOf("  prerelease-publication:\n");
	const publicationEnd = source.indexOf("  prerelease-bdd:\n");
	const publication = source.slice(publicationStart, publicationEnd);
	const bdd = source.slice(publicationEnd);

	t.is((source.match(/environment: github-packages-prerelease/g) || []).length, 1, "the environment must be bound exactly once");
	t.true(publication.includes("environment: github-packages-prerelease"), "the prerelease-publication job must await environment approval");
	t.false(source.slice(0, publicationStart).includes("environment: github-packages-prerelease"), "validation and BDD jobs must not use the environment");
	t.false(bdd.includes("environment: github-packages-prerelease"), "prerelease BDD must stay outside the environment");
	t.true(publication.includes("packages: write"), "publication keeps least-privilege packages: write");
	t.true(bdd.includes("packages: read"), "BDD keeps least-privilege packages: read");
	t.true(publication.includes("NODE_AUTH_TOKEN: ${{ github.token }}"), "publication npm auth must use the automatic GITHUB_TOKEN");
	t.false(source.includes("SCRAMJET_RELEASE_PRERELEASE_PACKAGES_TOKEN"), "the removed publish token secret must not be referenced");
	t.false(source.includes("SCRAMJET_RELEASE_PRERELEASE_PACKAGES_READ_TOKEN"), "the removed read token secret must not be referenced");
	t.false(source.includes("${{ secrets."), "no PAT or npm token secret expression may be introduced");
});

test("release prerelease publication builds publishable packages and emits the manifest outputs after checkout", (t) => {
	const source = workflowSource();
	const publicationStart = source.indexOf("  prerelease-publication:\n");
	const publicationEnd = source.indexOf("  prerelease-bdd:\n");
	const publication = source.slice(publicationStart, publicationEnd);

	t.true(publication.includes("ref: ${{ github.event.pull_request.head.sha }}"));
	t.true(publication.includes("FLAT_PACKAGES=true MAKE_PUBLIC=true NO_INSTALL=true node scripts/build-all.js -w release --ts-config tsconfig.build.json"));
	t.true(publication.includes("prerelease-manifest: ${{ steps.prerelease_manifest.outputs.manifest }}"));
	t.true(publication.includes("prerelease-manifest-sha256: ${{ steps.prerelease_manifest.outputs.checksum }}"));
	t.true(publication.includes("prereleases-published: ${{ steps.prerelease_publish.outputs.published }}"));
	t.false(publication.includes("npm run test:packages:ci"), "release jobs must not duplicate generic package validation");
	t.false(publication.includes("npm run build:packages"), "release jobs must not duplicate the generic package build");
	t.false(publication.includes("oven-sh/setup-bun@"), "release jobs must not duplicate Bun setup");
});

test("release PR BDD consumes only verified publisher output and exact prereleases with read-only automatic-token auth", (t) => {
	const source = workflowSource();
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
	t.true(source.includes("release-prerelease-bdd.js validate-cli --workspace-root ."));
	t.true(source.includes("cp \"$RUNNER_TEMP/release-prerelease-bdd.json\" .release-prerelease-bdd/verified-record.json"));
	t.true(source.includes("SCRAMJET_RELEASE_PRERELEASE_BDD_RECORD=.release-prerelease-bdd/verified-record.json"));
	t.true(source.includes("SCRAMJET_RELEASE_PRERELEASE_BDD_INSTALL_DIR=.release-prerelease-bdd"));
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
	t.true(bdd.includes("docker buildx imagetools inspect --format '{{.Manifest.Digest}}' \"$bdd_image_tag\""), "digest consumer must use the {{.Manifest.Digest}} imagetools template");
	t.false(bdd.includes("docker buildx imagetools inspect --format '{{.Digest}}'"), "obsolete {{.Digest}} imagetools consumer template must not be used");
	t.true(bdd.includes('reference: `${repository}@${digest}`'));
	t.true(bdd.includes("docker login ghcr.io"));
	t.true(bdd.includes("docker logout ghcr.io"));
	t.true(bdd.includes("GH_TOKEN: ${{ github.token }}"), "attestation verification uses the automatic GitHub token");
	t.true(bdd.includes("gh attestation verify \"$bdd_image_subject\""));
	t.true(bdd.includes("--repo scramjetorg/transform-hub"));
	t.true(bdd.includes("--source-ref refs/heads/devel"));
	t.true(bdd.includes("--source-digest \"$HEAD_SHA\""));
	t.true(bdd.includes("--signer-workflow scramjetorg/transform-hub/.github/workflows/devel-bdd-image.yml@refs/heads/devel"), "signer workflow must use the full owner/repo/path identity");
	t.false(bdd.includes("--signer-workflow .github/workflows/devel-bdd-image.yml@refs/heads/devel"), "bare-path signer workflow identity must not be used");
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

test("release PR BDD validates the activated installed CLI before invoking BDD", (t) => {
	const source = workflowSource();
	const bdd = source.slice(source.indexOf("  prerelease-bdd:\n"));
	const activate = bdd.indexOf("release-prerelease-bdd.js activate");
	const validateCli = bdd.indexOf("release-prerelease-bdd.js validate-cli --workspace-root .");
	const runBdd = bdd.indexOf("npm run test:bdd-ci-api-node");

	t.true(activate >= 0, "verified package activation must exist");
	t.true(validateCli > activate, "CLI validation must follow activation");
	t.true(runBdd > validateCli, "BDD must run only after fail-closed CLI validation");
});

test("release PR BDD fails closed when a SHA tag is repointed to a digest without matching devel provenance", (t) => {
	const source = workflowSource();
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
	const source = workflowSource();
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

test("release PR BDD preserves raw setup-node without package-manager cache and skips the redundant second root install", (t) => {
	const source = workflowSource();
	const bddStart = source.indexOf("  prerelease-bdd:\n");
	const bdd = source.slice(bddStart);

	t.true(bdd.includes("uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020"), "prerelease BDD must use the raw pinned setup-node");
	t.true(bdd.includes('node-version: "22"'));
	t.true(bdd.includes("package-manager-cache: false"), "raw setup-node must disable the package-manager cache");
	t.false(bdd.includes("uses: ./.github/actions/setup-workspace"), "prerelease BDD must not use the workspace composite helper");
	t.is((source.match(/npm ci --ignore-scripts/g) || []).length, 1, "the single root npm ci after pinning npm must not be duplicated after prepare");
	const prepare = bdd.indexOf("release-prerelease-bdd.js prepare");
	const prefixInstall = bdd.indexOf("npm --prefix .release-prerelease-bdd install --package-lock-only --ignore-scripts");
	t.true(prepare < prefixInstall, "the generated install lock must be built after prepare");
	const between = bdd.slice(prepare, prefixInstall);
	t.false(between.includes("npm ci --ignore-scripts"), "the redundant second root npm ci must be removed after prepare");
});
