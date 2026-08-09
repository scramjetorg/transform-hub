"use strict";

const test = require("ava").default;

const { manageReleasePr, releasePrDecision } = require("../release-pr-automation.js");

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

test("managed PR update keeps edit behavior without any merge, auto-merge, or admin bypass", (t) => {
	const calls = [];
	const runner = (_command, args) => {
		calls.push(args);
		if (args.includes("list")) return JSON.stringify([{ number: 12, url: "https://example.test/12" }]);
		return "";
	};
	const result = manageReleasePr(INPUT, runner);

	t.is(result.action, "update");
	t.deepEqual(result.pullRequest, { number: 12, url: "https://example.test/12" });
	t.true(calls.some((args) => args[0] === "pr" && args[1] === "edit"), "normal update behavior must remain");
	t.false("autoMerge" in result, "the result must not carry an auto-merge request");
	t.false(calls.some((args) => args[0] === "pr" && args[1] === "merge"), "gh pr merge must never be invoked");
	t.false(calls.some((args) => args.includes("--auto")), "--auto must never be requested");
	t.false(calls.some((args) => args.includes("--admin")), "admin bypass must never be used");
});

test("managed PR creation keeps create behavior without any merge, auto-merge, or admin bypass", (t) => {
	const calls = [];
	const runner = (_command, args) => {
		calls.push(args);
		if (args.includes("list")) {
			return JSON.stringify(calls.some((call) => call[0] === "pr" && call[1] === "create")
				? [{ number: 12, url: "https://example.test/12" }]
				: []);
		}
		return "";
	};
	const result = manageReleasePr(INPUT, runner);

	t.is(result.action, "create");
	t.deepEqual(result.pullRequest, { number: 12, url: "https://example.test/12" });
	t.true(calls.some((args) => args[0] === "pr" && args[1] === "create"), "normal create behavior must remain");
	t.false(calls.some((args) => args[0] === "pr" && args[1] === "merge"), "gh pr merge must never be invoked");
	t.false(calls.some((args) => args.includes("--auto")), "--auto must never be requested");
	t.false(calls.some((args) => args.includes("--admin")), "admin bypass must never be used");
});

test("missing automation token reports safely without invoking GitHub CLI", (t) => {
	const result = manageReleasePr({ ...INPUT, token: "" }, () => {
		throw new Error("must not execute");
	});

	t.deepEqual(result, { action: "report", reason: "automation-token-unavailable" });
});
