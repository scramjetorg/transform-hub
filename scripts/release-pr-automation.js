#!/usr/bin/env node

const OPERATIONAL_ERROR =
    "This release PR automation is retired. Use Release Start to create or reuse the managed promotion PR; no compatibility automation is permitted to mutate pull requests.";

function releasePrDecision() {
    return { action: "report", reason: "release-start-required", message: OPERATIONAL_ERROR };
}

function manageReleasePr() {
    return releasePrDecision();
}

function main() {
    console.error(`[release-pr] ${OPERATIONAL_ERROR}`);
    process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { manageReleasePr, releasePrDecision };
