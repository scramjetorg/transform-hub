"use strict";

const path = require("node:path");

if (process.env.SCRAMJET_SPAWN_TS || process.env.SCRAMJET_TARBALL_BDD_ROOT) {
    const workspaceRoot = path.resolve(__dirname, "../..");
    process.env.TSX_TSCONFIG_PATH = path.join(workspaceRoot, "tsconfig.base.json");
}

require("tsx/cjs");
