"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..", "..");

test("checkpoint runner variants use the isolated runner install contract", (t) => {
    for (const dockerfile of ["packages/runner/Dockerfile", "packages/runner-bun/Dockerfile", "packages/runner-python/Dockerfile"]) {
        const source = readFileSync(resolve(root, dockerfile), "utf8");
        t.regex(source, /COPY packages\/runner\/package\.json \/tmp\/scramjet-runner-install\/package\.json/);
        t.regex(source, /COPY packages\/runner\/yarn\.lock \/tmp\/scramjet-runner-install\/yarn\.lock/);
        t.regex(source, /--runner-package-json \/tmp\/scramjet-runner-install\/package\.json/);
        t.regex(source, /--runner-lockfile \/tmp\/scramjet-runner-install\/yarn\.lock/);
        t.regex(source, /yarn --cwd \/tmp\/scramjet-runner-install install/);
        t.regex(source, /--modules-folder \$\{HUB_DIR\}\/node_modules/);
    }
});
