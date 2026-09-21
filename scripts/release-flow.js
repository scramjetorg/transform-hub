#!/usr/bin/env node

const STABLE = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const DEVELOPMENT = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-devel$/;

function stableVersion(value) {
    if (!STABLE.test(value)) throw new Error(`Expected stable X.Y.Z version, received ${JSON.stringify(value)}.`);
    return value;
}

function developmentVersion(value) {
    if (!DEVELOPMENT.test(value)) throw new Error(`Expected development X.Y.Z-devel version, received ${JSON.stringify(value)}.`);
    return value;
}

function releaseVersionFromDevelopment(value) {
    return stableVersion(developmentVersion(value).slice(0, -6));
}

function developmentVersionFromStable(value) {
    const [major, minor, patch] = stableVersion(value).split(".").map(Number);
    return `${major}.${minor}.${patch + 1}-devel`;
}

function releaseBranch(value) {
    return `release/${stableVersion(value)}`;
}

function assertReleaseBranch(branch, version) {
    const expected = releaseBranch(version);
    if (branch !== expected) throw new Error(`Release branch ${branch} does not match ${expected}.`);
    return true;
}

if (require.main === module) {
    try {
        const [command, value] = process.argv.slice(2);
        if (command === "release-version") console.log(releaseVersionFromDevelopment(value));
        else if (command === "development-version") console.log(developmentVersionFromStable(value));
        else if (command === "release-branch") console.log(releaseBranch(value));
        else throw new Error("Usage: release-flow.js release-version|development-version|release-branch VALUE");
    } catch (error) {
        console.error(`[release-flow] ${error.message}`);
        process.exitCode = 1;
    }
}

module.exports = { stableVersion, developmentVersion, releaseVersionFromDevelopment, developmentVersionFromStable, releaseBranch, assertReleaseBranch };
