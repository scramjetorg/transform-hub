/**
 * @file scripts/test/bdd-cucumber-tags.spec.js
 *
 * Tests for BDD Cucumber default tag filtering — verifies @needs-fix scenarios
 * are excluded by default (like @ignore) unless opt-in env vars remove their
 * negations.
 *
 * Phase 11 bounded deferment: @needs-fix scenarios retain their feature tags
 * for a future runner/prerunner-image repair track but are excluded from
 * default runs.  The deferred scenarios (HUB-001 TC-009 through TC-012) also
 * carry @slow and @docker-specific tags, so both env vars are needed for
 * targeted execution:
 *
 *   BDD_INCLUDE_LONG_RUNNING=1 BDD_INCLUDE_NEEDS_FIX=1 npx cucumber-js ... --tags "@needs-fix"
 *
 * TC-009 (--runner-image) and TC-012 (--prerunner-image) both specify
 * container image tags from an internal registry
 * (repo.int.scp.ovh/scramjet/…) and depend on pre-published image artifacts.
 * There is no repository-built workflow that builds runner or prerunner images
 * from the monorepo source and tags them for CI use.  Until that build workflow
 * exists, both scenarios are deferred alongside the default-runner-image and
 * runner-memory-limit coverage (TC-010, TC-011).
 */

"use strict";

const test = require("ava");

const MODULE_PATH = require.resolve("../../bdd/cucumber.js");

/**
 * Fresh-require bdd/cucumber.js with given env overrides.
 * Saves/restores real process.env around the call.
 */
function loadWithEnv(overrides) {
	const saved = {};
	for (const [key, val] of Object.entries(overrides)) {
		saved[key] = process.env[key];
		if (val === undefined) delete process.env[key];
		else process.env[key] = val;
	}
	delete require.cache[MODULE_PATH];
	const config = require(MODULE_PATH);
	for (const [key, val] of Object.entries(saved)) {
		if (val === undefined) delete process.env[key];
		else process.env[key] = val;
	}
	return config;
}

test("default (no env) excludes @needs-fix, @slow, @docker-specific alongside @ignore", (t) => {
	const config = loadWithEnv({});
	const profile = config.default;

	t.true(profile.includes("not @needs-fix"), "default must exclude @needs-fix");
	t.true(profile.includes("not @slow"), "default must exclude @slow");
	t.true(profile.includes("not @docker-specific"), "default must exclude @docker-specific");
	t.true(profile.includes("not @ignore"), "default must exclude @ignore");
});

test("default (BDD_INCLUDE_NEEDS_FIX=0) excludes @needs-fix", (t) => {
	const config = loadWithEnv({ BDD_INCLUDE_NEEDS_FIX: "0" });
	const profile = config.default;

	t.true(profile.includes("not @needs-fix"), "BDD_INCLUDE_NEEDS_FIX=0 must exclude @needs-fix");
	t.true(profile.includes("not @ignore"), "must still exclude @ignore");
});

test("opt-in (BDD_INCLUDE_NEEDS_FIX=1) omits @needs-fix negation", (t) => {
	const config = loadWithEnv({ BDD_INCLUDE_NEEDS_FIX: "1" });
	const profile = config.default;

	t.false(profile.includes("not @needs-fix"), "BDD_INCLUDE_NEEDS_FIX=1 must NOT exclude @needs-fix");
	t.true(profile.includes("not @ignore"), "must still exclude @ignore");
});

test("opt-in (BDD_INCLUDE_NEEDS_FIX=true) omits @needs-fix negation", (t) => {
	const config = loadWithEnv({ BDD_INCLUDE_NEEDS_FIX: "true" });
	const profile = config.default;

	t.false(profile.includes("not @needs-fix"), "BDD_INCLUDE_NEEDS_FIX=true must NOT exclude @needs-fix");
	t.true(profile.includes("not @ignore"), "must still exclude @ignore");
});

test("combined opt-in (both envs) omits @needs-fix, @slow, @docker-specific negations", (t) => {
	// The deferred scenarios (HUB-001 TC-009 through TC-012) are tagged
	// @needs-fix, @slow, and @docker-specific.  Both env vars must be set
	// so the profile does not exclude them, allowing --tags @needs-fix to
	// select them at the CLI.
	const config = loadWithEnv({
		BDD_INCLUDE_LONG_RUNNING: "1",
		BDD_INCLUDE_NEEDS_FIX: "1",
	});
	const profile = config.default;

	t.false(profile.includes("not @needs-fix"), "must NOT exclude @needs-fix");
	t.false(profile.includes("not @slow"), "must NOT exclude @slow");
	t.false(profile.includes("not @docker-specific"), "must NOT exclude @docker-specific");
	t.true(profile.includes("not @ignore"), "must still exclude @ignore");
});

test("explicit user --tags can override and select @needs-fix scenarios", (t) => {
	// In the default profile (without BDD_INCLUDE_NEEDS_FIX=1), @needs-fix is
	// excluded.  Cucumber CLI semantics: a user-supplied --tags on the command
	// line replaces the profile's --tags entirely.  So an explicit invocation:
	//   BDD_INCLUDE_LONG_RUNNING=1 BDD_INCLUDE_NEEDS_FIX=1 npx cucumber-js ... --tags "@needs-fix"
	// selects only @needs-fix scenarios despite the default exclusion.
	//
	// This test verifies the profile structure allows that override.

	const config = loadWithEnv({});
	const profile = config.default;
	const match = profile.match(/--tags\s+"([^"]+)"/);

	t.truthy(match, "profile must contain a quoted --tags argument");

	const tagExpression = match[1];
	t.true(tagExpression.includes("not @needs-fix"), "tag expression excludes @needs-fix by default");
	t.true(tagExpression.includes("not @ignore"), "tag expression excludes @ignore by default");
	t.true(tagExpression.startsWith("not @"), "expression is standard Cucumber exclusion");
	t.is((profile.match(/--tags/g) || []).length, 1, "exactly one --tags argument — cleanly overridable");
});
