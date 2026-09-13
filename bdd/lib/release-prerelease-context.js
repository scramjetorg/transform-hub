"use strict";

const { readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const RECORD_ENV = "SCRAMJET_RELEASE_PRERELEASE_BDD_RECORD";
const INSTALL_ENV = "SCRAMJET_RELEASE_PRERELEASE_BDD_INSTALL_DIR";
const TARBALL_ROOT_ENV = "SCRAMJET_TARBALL_BDD_ROOT";

function context(options = {}) {
    const environment = options.environment || process.env;
    const tarballRoot = environment[TARBALL_ROOT_ENV];
    if (tarballRoot) {
        const root = resolve(tarballRoot);
        const hostPackage = JSON.parse(readFileSync(join(root, "node_modules/@scramjet/host/package.json"), "utf8"));
        return { installDir: root, recordPath: join(root, "tarball-record.json"), host: { service: "@scramjet/host", version: hostPackage.version } };
    }
    const { releasePrereleaseBddContext } = require(resolve(__dirname, "../../scripts/release-prerelease-bdd.js"));
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
