"use strict";

const { resolve } = require("node:path");
const { releasePrereleaseBddContext } = require("../../scripts/release-prerelease-bdd.js");

const RECORD_ENV = "SCRAMJET_RELEASE_PRERELEASE_BDD_RECORD";
const INSTALL_ENV = "SCRAMJET_RELEASE_PRERELEASE_BDD_INSTALL_DIR";

function context(options = {}) {
    const environment = options.environment || process.env;
    return releasePrereleaseBddContext({
        workspaceRoot: options.workspaceRoot || resolve(__dirname, "../.."),
        recordPath: environment[RECORD_ENV],
        installDir: environment[INSTALL_ENV],
    });
}

function expectedHostVersion(rootVersion, options = {}) {
    const verified = context(options);
    return {
        apiVersion: "v1",
        service: "@scramjet/host",
        version: verified ? verified.host.version : rootVersion,
    };
}

function selectedSiCommand(options = {}) {
    const verified = context(options);
    if (!verified) return null;
    return ["env", `HOME=${verified.cli.configHome}`, verified.cli.binPath];
}

module.exports = { INSTALL_ENV, RECORD_ENV, context, expectedHostVersion, selectedSiCommand };
