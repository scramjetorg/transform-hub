#!/usr/bin/env node
const { startRelease, resetInitialize, reconcileDevel, prepareReconciliation, finalizeReconciliation } = require("./release-train-runtime");
const { createGithubReleaseTrainAdapters } = require("./lib/github-release-train-adapters");

function option(args, name) {
    const index = args.indexOf(name);
    if (index < 0 || !args[index + 1]) throw new Error(`${name} is required.`);
    return args[index + 1];
}
function optionalOption(args, name) {
    const index = args.indexOf(name);
    if (index < 0) return undefined;
    if (!args[index + 1]) throw new Error(`${name} requires a value.`);
    return args[index + 1];
}

function main() {
    const [command, ...args] = process.argv.slice(2);
    const repository = option(args, "--repository", false) || "scramjetorg/transform-hub";
    const adapters = createGithubReleaseTrainAdapters({ repository, githubToken: process.env.GH_TOKEN });
    if (command === "start")
        return console.log(
            JSON.stringify(startRelease({ stableVersion: option(args, "--stable-version"), nextDevelopmentVersion: option(args, "--next-development-version"), adapters }))
        );
    if (command === "reset-initialize") return console.log(JSON.stringify(resetInitialize({ repository, stableVersion: option(args, "--stable-version"), nextDevelopmentVersion: option(args, "--next-development-version"), develSha: option(args, "--devel-sha"), confirmReset: option(args, "--confirm-reset"), adapters })));
    if (command === "prepare") return console.log(JSON.stringify(prepareReconciliation({ mergeSha: option(args, "--merge-sha"), adapters })));
    if (command === "finalize")
        return console.log(JSON.stringify(finalizeReconciliation({ mergeSha: option(args, "--merge-sha"), adapters, validationPassed: args.includes("--validation-passed") })));
    if (command === "reconcile") return console.log(JSON.stringify(reconcileDevel({ mergeSha: option(args, "--merge-sha"), adapters, validationPassed: true })));
    throw new Error("Usage: release-train.js start|reset-initialize|prepare|finalize|reconcile");
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(`[release-train] ${error.message}`);
        process.exitCode = 1;
    }
}
module.exports = { main, option, optionalOption };
