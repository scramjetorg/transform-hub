/**
 * @file scripts/test/bdd-cucumber-tags.spec.js
 *
 * Tests for BDD Cucumber default tag filtering — verifies @needs-fix scenarios
 * are excluded by default (like @ignore) unless opt-in env vars remove their
 * negations.
 *
 * Phase 11 bounded deferment: @needs-fix scenarios retain their feature tags
 * for a future runner/prerunner-image repair track but are excluded from
 * default runs.  The deferred scenarios (HUB-001 TC-009 through TC-013) also
 * carry @slow and @docker-specific tags, so both env vars are needed for
 * targeted execution:
 *
 *   BDD_INCLUDE_LONG_RUNNING=1 BDD_INCLUDE_NEEDS_FIX=1 npx cucumber-js ... --tags "@needs-fix"
 *
 * TC-009 (--runner-image) and TC-012 (--prerunner-image) both specify
 * container image tags from an internal registry
 * (repo.int.scp.ovh/scramjet/…) and depend on pre-published image artifacts.
 * TC-013 (--prerunner-max-mem) is deferred for a separate reason: it does not
 * specify or depend on an internal registry image, but its memory-limit assertion
 * relies on short-lived prerunner container metadata that is unreliable under
 * normal CI timing — the prerunner container is created, identified, and removed
 * within the same scenario, making the assertion fragile due to container lifecycle
 * timing rather than image availability. There is no repository-built workflow
 * that builds runner or prerunner images from the monorepo source and tags them
 * for CI use.  Until those issues are resolved, all five scenarios are deferred.
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
	// The deferred scenarios (HUB-001 TC-009 through TC-013) are tagged
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

// ---------------------------------------------------------------------------
// Root package.json script semantics — must not override cucumber.js defaults
// in a way that accidentally includes @needs-fix scenarios.
// ---------------------------------------------------------------------------

test("root package.json test:bdd selects the bounded base mode without tags", (t) => {
	// Base/extra ownership is feature-path based. The mode runner must not pass
	// tags or -t, so cucumber.js still applies its safety exclusions.
	const rootPkg = require("../../package.json");
	const script = rootPkg.scripts["test:bdd"];

	t.truthy(script, "test:bdd script must exist");

	t.true(script.includes("run-bdd-modes.js --mode=base"), "test:bdd must use bounded base mode");
	t.true(script.includes("BDD_INCLUDE_LONG_RUNNING=1"), "base mode must include the Node runner feature's explicit @slow coverage");
	const passthroughMatch = script.match(/run-bdd-modes\.js\s+--mode=base\s+--\s*(.*)$/);
	t.truthy(passthroughMatch, "script must delegate to run-bdd-modes.js with -- separator");

	const passthrough = passthroughMatch[1];
	t.false(/\s--tags\s/.test(passthrough), "must not pass --tags (overrides cucumber.js)");
	t.false(/\s-t\s/.test(passthrough), "must not pass -t (overrides cucumber.js)");
	t.true(passthrough.includes("--fail-fast"), "must keep --fail-fast for intended fail-fast behavior");
});

test("root package.json test:bdd-long preserves long tag union without hard-coded @needs-fix exclusion", (t) => {
	// The test:bdd-long script passes -t with the long-running tag union for
	// positive selection.  It must NOT hard-code @needs-fix exclusion — that
	// responsibility belongs to the cucumber.js env-aware default (which
	// excludes @needs-fix by default unless BDD_INCLUDE_NEEDS_FIX=1 is set).
	// The -t overrides cucumber.js defaults, so the long union is kept for
	// selectivity; @needs-fix exclusion is the caller's concern when
	// overriding defaults via -t.
	const rootPkg = require("../../package.json");
	const script = rootPkg.scripts["test:bdd-long"];

	t.truthy(script, "test:bdd-long script must exist");

	// Extract the -t argument value (the tag expression).
	const tagMatch = script.match(/ -t "([^"]+)"/);
	t.truthy(tagMatch, "script must pass a -t tag expression");

	const tagExpr = tagMatch[1];
	t.false(tagExpr.includes("not @needs-fix"), "must NOT hard-code @needs-fix exclusion (cucumber.js default handles it)");

	// Verify the long-running union tags are preserved.
	t.true(tagExpr.includes("@slow"), "tag expression must include @slow");
	t.true(tagExpr.includes("@stress"), "tag expression must include @stress");
	t.true(tagExpr.includes("@perf"), "tag expression must include @perf");
	t.true(tagExpr.includes("@load"), "tag expression must include @load");
	t.true(tagExpr.includes("@external-dependency"), "tag expression must include @external-dependency");
	t.true(tagExpr.includes("@compatibility"), "tag expression must include @compatibility");
	t.true(tagExpr.includes("@manager-migration"), "tag expression must include @manager-migration");
	t.true(tagExpr.includes("@requires-docker"), "tag expression must include @requires-docker");
	t.true(tagExpr.includes("@docker-specific"), "tag expression must include @docker-specific");

	// Verify it's a plain union (no parenthesised negation appended).
	t.false(tagExpr.startsWith("("), "tag expression must not parenthesise (no appended negation)");
	t.true(tagExpr.includes(" or "), "tag expression uses 'or' for the union");
});

// ---------------------------------------------------------------------------
// Cucumber.js env-aware default: BDD_INCLUDE_LONG_RUNNING without
// BDD_INCLUDE_NEEDS_FIX must still exclude @needs-fix scenarios.
// ---------------------------------------------------------------------------

test("BDD_INCLUDE_LONG_RUNNING=1 alone still excludes @needs-fix via cucumber.js", (t) => {
	// When only BDD_INCLUDE_LONG_RUNNING=1 is set, cucumber.js removes the
	// long-running tag exclusions but still excludes @needs-fix.  This is the
	// env-aware default that test:bdd-long relies on when callers want to run
	// long-running scenarios without @needs-fix.
	const config = loadWithEnv({ BDD_INCLUDE_LONG_RUNNING: "1" });
	const profile = config.default;

	t.true(profile.includes("not @needs-fix"), "BDD_INCLUDE_LONG_RUNNING=1 must still exclude @needs-fix");
	t.true(profile.includes("not @ignore"), "must still exclude @ignore");
	t.true(profile.includes("not @harness-selftest"), "must still exclude @harness-selftest");

	// Long-running tags are no longer excluded.
	t.false(profile.includes("not @slow"), "BDD_INCLUDE_LONG_RUNNING=1 removes @slow exclusion");
	t.false(profile.includes("not @docker-specific"), "BDD_INCLUDE_LONG_RUNNING=1 removes @docker-specific exclusion");
});

test("BDD_INCLUDE_LONG_RUNNING=1 BDD_INCLUDE_NEEDS_FIX=1 permits @needs-fix via cucumber.js", (t) => {
	// When both env vars are set, cucumber.js permits @needs-fix alongside
	// the long-running tags.  Combined with explicit CLI --tags "@needs-fix",
	// this is the opt-in path for running the deferred scenarios.
	const config = loadWithEnv({
		BDD_INCLUDE_LONG_RUNNING: "1",
		BDD_INCLUDE_NEEDS_FIX: "1",
	});
	const profile = config.default;

	t.false(profile.includes("not @needs-fix"), "both env vars must NOT exclude @needs-fix");
	t.false(profile.includes("not @slow"), "both env vars must NOT exclude @slow");
	t.false(profile.includes("not @docker-specific"), "both env vars must NOT exclude @docker-specific");
	t.true(profile.includes("not @ignore"), "must still exclude @ignore");

	// Verify only one --tags tag — cleanly cli-overridable.
	t.is((profile.match(/--tags/g) || []).length, 1, "exactly one --tags argument");
});
