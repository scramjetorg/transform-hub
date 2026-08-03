"use strict";

const test = require("ava");

const { enableAutoMerge, manageReleasePr, releasePrDecision } = require("../release-pr-automation.js");

const INPUT = {
	conclusion: "success",
	headBranch: "devel",
	headRepository: "scramjetorg/transform-hub",
	repository: "scramjetorg/transform-hub",
	token: "test-token",
};

test("release PR decision is idempotent and accepts only successful same-repository devel runs", (t) => {
	t.deepEqual(releasePrDecision({ ...INPUT, pullRequests: [] }), { action: "create" });
	t.deepEqual(releasePrDecision({ ...INPUT, pullRequests: [{ number: 12, url: "https://example.test/12" }] }), {
		action: "update",
		pullRequest: { number: 12, url: "https://example.test/12" },
	});
	t.is(releasePrDecision({ ...INPUT, conclusion: "failure", pullRequests: [] }).reason, "devel-validation-not-successful");
	t.is(releasePrDecision({ ...INPUT, headRepository: "fork/transform-hub", pullRequests: [] }).reason, "untrusted-release-source");
	t.is(releasePrDecision({ ...INPUT, pullRequests: [{ number: 1 }, { number: 2 }] }).reason, "multiple-managed-release-prs");
});

test("managed PR update requests auto-merge without an admin bypass", (t) => {
	const calls = [];
	const runner = (_command, args) => {
		calls.push(args);
		if (args.includes("list")) return JSON.stringify([{ number: 12, url: "https://example.test/12" }]);
		return "";
	};
	const result = manageReleasePr(INPUT, runner);

	t.is(result.action, "update");
	t.is(result.autoMerge.status, "enabled");
	const mergeArgs = calls.find((args) => args.includes("merge"));
	t.true(mergeArgs.includes("--auto"));
	t.false(mergeArgs.includes("--admin"));
});

test("missing automation token reports safely without invoking GitHub CLI", (t) => {
	const result = manageReleasePr({ ...INPUT, token: "" }, () => {
		throw new Error("must not execute");
	});

	t.deepEqual(result, { action: "report", reason: "automation-token-unavailable" });
});

test("auto-merge blockers are reported without a dangerous failure", (t) => {
	const result = enableAutoMerge("scramjetorg/transform-hub", 12, () => {
		throw new Error("branch protection blocks auto merge");
	});

	t.is(result.status, "blocked");
	t.true(result.message.includes("branch protection"));
});
