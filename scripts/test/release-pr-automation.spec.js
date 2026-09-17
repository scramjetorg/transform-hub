"use strict";

const test = require("ava").default;

const { manageReleasePr, releasePrDecision } = require("../release-pr-automation.js");

test("compatibility guard fails closed and directs operators to Release Start", (t) => {
	const result = releasePrDecision();
	t.is(result.action, "report");
	t.is(result.reason, "release-start-required");
	t.regex(result.message, /Use Release Start/);
});

test("compatibility guard never invokes a PR mutation runner", (t) => {
	const result = manageReleasePr({ token: "unexpected-token" }, () => {
		throw new Error("must not execute");
	});
	t.is(result.reason, "release-start-required");
});
