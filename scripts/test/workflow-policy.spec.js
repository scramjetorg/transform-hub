"use strict";

const test = require("ava").default;
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const checker = require("../check-workflow-policy.js");

const fixtures = resolve(__dirname, "fixtures", "workflow-policy");
const checkerPath = resolve(__dirname, "..", "check-workflow-policy.js");

function checkFixture(name) {
	return checker.checkFiles([resolve(fixtures, name)]);
}

test("accepts the minimal compliant replacement workflow fixture", (t) => {
	t.deepEqual(checkFixture("compliant.yml"), []);
});

for (const [fixture, code] of [
	["forbidden-pull-request-target.yml", "PULL_REQUEST_TARGET"],
	["mutable-action.yml", "MUTABLE_ACTION_REF"],
	["mutable-action-with-comment.yml", "MUTABLE_ACTION_REF"],
	["excessive-permissions.yml", "EXCESSIVE_PERMISSION"],
	["default-permissions.yml", "MISSING_TOP_LEVEL_PERMISSIONS"],
	["persistent-checkout.yml", "PERSISTENT_CHECKOUT_CREDENTIALS"],
	["checkout-comment-no-credentials.yml", "PERSISTENT_CHECKOUT_CREDENTIALS"],
	["pr-publish-oidc.yml", "PR_PUBLISH_PERMISSION"],
	["pr-publish-oidc.yml", "PR_OIDC_PERMISSION"],
	["spoofed-release-guard.yml", "PR_PUBLISH_PERMISSION"],
	["unguarded-pr-publish.yml", "PR_PUBLISH_PERMISSION"],
	["guarded-or-bypass.yml", "PR_PUBLISH_PERMISSION"],
	["guarded-or-bypass.yml", "UNTRUSTED_PACKAGE_PROMOTION"],
	["unguarded-artifact-with-guarded-publisher.yml", "UNTRUSTED_ARTIFACT_PROMOTION"],
	["unguarded-artifact-with-guarded-publisher.yml", "UNTRUSTED_PACKAGE_PROMOTION"],
	["untrusted-promotion.yml", "UNTRUSTED_CACHE"],
	["untrusted-promotion.yml", "UNTRUSTED_ARTIFACT_PROMOTION"],
	["untrusted-promotion.yml", "UNTRUSTED_IMAGE_PROMOTION"],
	["untrusted-promotion.yml", "UNTRUSTED_PACKAGE_PROMOTION"],
]) {
	test(`rejects ${code} in ${fixture}`, (t) => {
		const errors = checkFixture(fixture);
		const match = errors.find((error) => error.code === code);
		t.truthy(match, `expected ${code}; got ${errors.map((error) => error.code).join(", ")}`);
	});
}

test("accepts guarded-release-pr-publish as a valid release PR publisher with job-level guard", (t) => {
	t.deepEqual(checkFixture("guarded-release-pr-publish.yml"), []);
});

test("CLI documents explicit scope and deferred external validation", (t) => {
	const result = spawnSync(process.execPath, [checkerPath, "--file", resolve(fixtures, "compliant.yml")], {
		encoding: "utf8",
	});

	t.is(result.status, 0);
	t.true(result.stdout.includes("explicitly selected file"));
	t.true(result.stdout.includes("Actionlint"));
	t.true(result.stdout.includes("Zizmor"));
	t.true(result.stdout.includes("Gitleaks"));
});
