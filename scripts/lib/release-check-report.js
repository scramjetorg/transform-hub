const { appendFileSync, readFileSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { stableVersion, assertReleaseBranch } = require("../release-flow.js");

function safeText(value) {
    const safe = Array.from(String(value || "(unavailable)"), (character) => {
        const code = character.codePointAt(0);
        return code < 32 || code === 127 ? " " : character;
    }).join("");
    return safe.replace(/%/g, "%25").replace(/:/g, "%3A").replace(/,/g, "%2C");
}

function display(value) {
    return safeText(value).slice(0, 200);
}

function markdownEscape(value) {
    return safeText(value).replace(/[\\`*_{}\[\]()#+\-.!|>]/g, "\\$&");
}

function writeReport(lines, { stdout = process.stdout, summaryPath = process.env.GITHUB_STEP_SUMMARY } = {}) {
    const text = lines.join("\n");
    stdout.write(`${text}\n`);
    if (summaryPath) appendFileSync(summaryPath, `## Preliminary CI diagnostics\n\n${lines.map((line) => `- ${markdownEscape(line)}`).join("\n")}\n\n`);
}

function runPreflight({ mode = "pr", environment = process.env, runner = execFileSync, stdout = process.stdout, summaryPath = environment.GITHUB_STEP_SUMMARY, packageVersion } = {}) {
    const pullRequest = environment.GITHUB_EVENT_NAME === "pull_request";
    const base = environment.RELEASE_BASE_REF;
    const headRef = environment.RELEASE_HEAD_REF;
    const sameRepo = Boolean(environment.RELEASE_HEAD_REPOSITORY && environment.RELEASE_HEAD_REPOSITORY === environment.GITHUB_REPOSITORY);
    const isReleasePr = pullRequest && base === "main" && typeof headRef === "string" && headRef.startsWith("release/") && sameRepo;
    const expectedSha = environment.RELEASE_HEAD_SHA || "";
    let checkoutSha = "";
    try {
        checkoutSha = String(runner("git", ["rev-parse", "--verify", "HEAD^{commit}"], { encoding: "utf8" })).trim();
    } catch { /* captured as a failed identity check below */ }
    let version = packageVersion || "";
    if (!version) try { version = JSON.parse(readFileSync("package.json", "utf8")).version; } catch { /* reported below when applicable */ }

    const lines = [
        `Context: event=${display(environment.GITHUB_EVENT_NAME)} PR=${display(environment.RELEASE_PR_NUMBER)} head=${display(headRef)} base=${display(base)} head-repository=${display(environment.RELEASE_HEAD_REPOSITORY)} repository=${display(environment.GITHUB_REPOSITORY)} head-SHA=${display(expectedSha)} checkout-SHA=${display(checkoutSha)} package-version=${display(version)}`
    ];
    let failed = false;
    const result = (label, applies, pass, detail, action) => {
        const status = !applies ? "NOT APPLICABLE" : pass ? "PASS" : "FAIL";
        lines.push(`${status}: ${label}${detail ? ` — ${detail}` : ""}${!applies && action ? ` — ${action}` : ""}`);
        if (applies && !pass) {
            failed = true;
            if (action) lines.push(`Corrective action: ${action}`);
        }
    };

    if (mode === "candidate") {
        const branch = environment.RELEASE_HEAD_REF;
        let canonicalVersion;
        let branchValid = false;
        let versionValid = false;
        try { canonicalVersion = stableVersion(version); versionValid = true; } catch { /* detailed result below */ }
        try { assertReleaseBranch(branch, canonicalVersion); branchValid = true; } catch { /* detailed result below */ }
        result("trusted same-repository release PR routing", true, pullRequest && sameRepo && base === "main" && typeof branch === "string" && branch.startsWith("release/"), "requires pull_request from same repository, release/* to main", "Use the trusted release branch and main target.");
        result("canonical stable package version and matching release branch", true, versionValid && branchValid, `version=${display(version)} branch=${display(branch)}`, "Align package.json version X.Y.Z with branch release/X.Y.Z.");
        result("event head matches checked-out commit", true, /^[a-f0-9]{40}$/i.test(expectedSha) && expectedSha.toLowerCase() === checkoutSha.toLowerCase(), `event=${display(expectedSha)} checkout=${display(checkoutSha)}`, "Check out and validate the exact pull-request head SHA.");
    } else {
        result("trusted release PR admission", isReleasePr, isReleasePr, "requires same-repository release/* pull request to main", "Use the trusted release PR route.");
        if (isReleasePr) {
            let canonicalVersion;
            let versionValid = false;
            let branchValid = false;
            try { canonicalVersion = stableVersion(version); versionValid = true; } catch { /* reported below */ }
            try { assertReleaseBranch(headRef, canonicalVersion); branchValid = true; } catch { /* reported below */ }
            result("canonical stable package version and matching release branch", true, versionValid && branchValid, `version=${display(version)} branch=${display(headRef)}`, "Align package.json version X.Y.Z with branch release/X.Y.Z.");
            result("event head matches checked-out commit", true, /^[a-f0-9]{40}$/i.test(expectedSha) && expectedSha.toLowerCase() === checkoutSha.toLowerCase(), `event=${display(expectedSha)} checkout=${display(checkoutSha)}`, "Check out and validate the exact pull-request head SHA.");
        }
        const develTarget = pullRequest && base === "devel";
        let develFresh = false;
        let develDetail = "Not checked for this target.";
        let develAction = "Update the PR branch from current devel.";
        if (develTarget) {
            try {
                runner("git", ["merge-base", "--is-ancestor", "origin/devel", "HEAD"], { encoding: "utf8" });
                develFresh = true;
                develDetail = "PR head contains the current devel base.";
            } catch (error) {
                if (error?.status === 1) develDetail = "PR head is behind or diverged from current devel.";
                else {
                    develDetail = "Could not determine freshness because the local devel base ref or Git check is unavailable.";
                    develAction = "Restore the origin/devel ref and inspect the Git check before rerunning.";
                }
            }
        }
        result("devel PR freshness", develTarget, develFresh, develDetail, develAction);
        result("devel release freeze", develTarget, true, "Release-freeze API check runs separately; inspect its result before merging.");
        result("full rebuilding BDD suites", !isReleasePr, true, isReleasePr ? "Deferred to release-candidate downloaded-tarball BDD; not a PR-validation pass." : "Runs through the ordinary PR/merge-queue validation route.");
    }
    writeReport(lines, { stdout, summaryPath });
    return { failed, lines };
}

if (require.main === module) {
    const mode = process.argv[2] || "pr";
    try {
        const report = runPreflight({ mode });
        if (report.failed) process.exitCode = 1;
    } catch (error) {
        const lines = [`FAIL: Preliminary diagnostics could not complete — ${display(error.message)}`, "Corrective action: Inspect the named CI step and its safe diagnostic summary."];
        writeReport(lines);
        process.exitCode = 1;
    }
}

module.exports = { runPreflight, writeReport, markdownEscape };
