#!/usr/bin/env node

const { execFileSync } = require("node:child_process");

const BASE_BRANCH = "main";
const HEAD_BRANCH = "devel";
const TITLE = "Release devel into main";
const BODY = "Managed release PR from the validated devel branch. Merging remains an explicit manual operation after required checks; this automation never requests auto-merge.";

function releasePrDecision({ repository, headRepository, headBranch, conclusion, pullRequests }) {
    if (conclusion !== "success") return { action: "report", reason: "devel-validation-not-successful" };
    if (repository !== headRepository || headBranch !== HEAD_BRANCH) return { action: "report", reason: "untrusted-release-source" };
    if (pullRequests.length > 1) return { action: "report", reason: "multiple-managed-release-prs" };
    if (pullRequests.length === 1) return { action: "update", pullRequest: pullRequests[0] };
    return { action: "create" };
}

function runGh(args, runner = execFileSync) {
    return runner("gh", args, { encoding: "utf8" }).trim();
}

function listReleasePrs(repository, runner) {
    const output = runGh(
        ["pr", "list", "--repo", repository, "--base", BASE_BRANCH, "--head", HEAD_BRANCH, "--state", "open", "--json", "number,url,headRefName,baseRefName"],
        runner
    );
    return JSON.parse(output || "[]");
}

function manageReleasePr(input, runner = execFileSync) {
    if (!input.token) return { action: "report", reason: "automation-token-unavailable" };
    const pullRequests = listReleasePrs(input.repository, runner);
    const decision = releasePrDecision({ ...input, pullRequests });
    if (decision.action === "report") return decision;

    let pullRequest = decision.pullRequest;
    if (decision.action === "create") {
        runGh(["pr", "create", "--repo", input.repository, "--base", BASE_BRANCH, "--head", HEAD_BRANCH, "--title", TITLE, "--body", BODY], runner);
        const created = listReleasePrs(input.repository, runner);
        if (created.length !== 1) throw new Error("Managed release PR was not uniquely discoverable after creation.");
        pullRequest = created[0];
    }

    runGh(["pr", "edit", String(pullRequest.number), "--repo", input.repository, "--title", TITLE, "--body", BODY], runner);
    // Merging stays an explicit manual operation after required checks:
    // automation never issues a gh pr merge, an auto-merge request, or an admin bypass.
    return {
        action: decision.action,
        pullRequest: { number: pullRequest.number, url: pullRequest.url }
    };
}

function main() {
    try {
        const result = manageReleasePr({
            conclusion: process.env.RELEASE_CONCLUSION,
            headBranch: process.env.RELEASE_HEAD_BRANCH,
            headRepository: process.env.RELEASE_HEAD_REPOSITORY,
            repository: process.env.GITHUB_REPOSITORY,
            token: process.env.GH_TOKEN
        });
        console.log(JSON.stringify(result));
    } catch (error) {
        console.error(`[release-pr] ${error.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();

module.exports = { listReleasePrs, manageReleasePr, releasePrDecision };
