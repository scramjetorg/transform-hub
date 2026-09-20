"use strict";

// Release PR prerelease consumption was removed. BDD uses the checked-out
// workspace and never activates a separate publication/install context.
const RECORD_ENV = "";
const INSTALL_ENV = "";
function context() { return null; }

function expectedHostVersion(rootVersion, options = {}) {
    const verified = context(options);
    return {
        apiVersion: "v1",
        service: verified ? verified.host.service : "@scramjet/host",
        version: verified ? verified.host.version : rootVersion,
    };
}

function selectedSiCommand(options = {}) {
    const verified = context(options);
    if (!verified) return null;
    return ["env", `HOME=${verified.cli.configHome}`, verified.cli.binPath];
}

module.exports = { INSTALL_ENV, RECORD_ENV, context, expectedHostVersion, selectedSiCommand };
