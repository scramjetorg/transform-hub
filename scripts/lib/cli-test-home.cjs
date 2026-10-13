"use strict";

const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

// This preload is configured only by @scramjet/cli's AVA suite. AVA loads
// requires within each test worker, so each file worker owns an isolated CLI
// data root while child processes inherit that worker's setting.
const ownedHome = mkdtempSync(join(tmpdir(), "scramjet-cli-test-"));
process.env.SCRAMJET_HOME = ownedHome;

process.once("exit", () => {
    rmSync(ownedHome, { recursive: true, force: true });
});
