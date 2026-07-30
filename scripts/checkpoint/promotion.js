#!/usr/bin/env node

const { readFileSync } = require("node:fs");
const { pointerUpdatePlan } = require("./provenance.js");

const REFERENCE = /^ghcr\.io\/scramjetorg\/transform-hub\/ci-deps@sha256:[a-f0-9]{64}$/i;
const DIGEST = /^sha256:[a-f0-9]{64}$/i;

function promotionDecision({ branch = "devel", plan, sourceSha, currentSha, checkpointReference, checkpointIdentityDigest, publisherConfigured }) {
    if (!plan?.dryRun || !DIGEST.test(plan.identityDigest)) {
        throw new Error("Checkpoint promotion requires a valid dry-run plan.");
    }

    const pointer = pointerUpdatePlan({
        branch,
        currentSha,
        identityDigest: plan.identityDigest,
        repository: plan.promotion.repository,
        sourceSha
    });

    if (!publisherConfigured) throw new Error("Checkpoint promotion requires the scoped GHCR publisher configuration.");
    if (!REFERENCE.test(checkpointReference || "") || !DIGEST.test(checkpointIdentityDigest || "")) {
        throw new Error("Checkpoint promotion requires a verified immutable checkpoint reference and identity digest.");
    }
    if (checkpointIdentityDigest.toLowerCase() !== plan.identityDigest) {
        throw new Error("Existing checkpoint identity does not match the validated trusted source.");
    }

    return { mode: "live-promote", pointer, reference: checkpointReference };
}

function parseArgs(args) {
    const options = {};
    for (let index = 0; index < args.length; index++) {
        if (!["--branch", "--current-sha", "--plan", "--source-sha"].includes(args[index]) || !args[index + 1]) {
            throw new Error("Usage: promotion.js --plan <checkpoint-plan.json> --source-sha <sha> --current-sha <sha> [--branch <trusted-branch>]");
        }
        options[args[index].slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = args[++index];
    }
    if (!options.plan || !options.sourceSha || !options.currentSha) throw new Error("Promotion plan, source SHA, and current SHA are required.");
    return options;
}

function main() {
    try {
        const options = parseArgs(process.argv.slice(2));
        const decision = promotionDecision({
            branch: options.branch,
            checkpointIdentityDigest: process.env.CHECKPOINT_IDENTITY_DIGEST,
            checkpointReference: process.env.CHECKPOINT_REFERENCE,
            currentSha: options.currentSha,
            plan: JSON.parse(readFileSync(options.plan, "utf8")),
            publisherConfigured: process.env.SCRAMJET_GHCR_SCOPED_PUBLISHER === "true",
            sourceSha: options.sourceSha
        });
        console.log(JSON.stringify(decision));
    } catch (error) {
        console.error(`[checkpoint] ${error.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();

module.exports = { parseArgs, promotionDecision };
