"use strict";

const test = require("ava").default;
const { affectedWorkspaces, assertSmokeCommands, selectPrSmoke } = require("../release-pr-smoke");

const manifests = [
    { name: "@scramjet/a", directory: "packages/a", manifest: { name: "@scramjet/a" } },
    { name: "@scramjet/b", directory: "packages/b", manifest: { name: "@scramjet/b", dependencies: { "@scramjet/a": "workspace:*" } } },
    { name: "@scramjet/c", directory: "packages/c", manifest: { name: "@scramjet/c" } },
];

test("PR smoke computes reverse dependency closure and broad fallback", (t) => {
    t.deepEqual(affectedWorkspaces({ changedFiles: [{ status: "M", path: "packages/a/src/index.ts" }], manifests }), ["@scramjet/a", "@scramjet/b"]);
    t.deepEqual(affectedWorkspaces({ changedFiles: [{ status: "M", path: "README.md" }], manifests }), []);
    t.deepEqual(affectedWorkspaces({ changedFiles: [{ status: "M", path: "package.json" }], manifests }), ["@scramjet/a", "@scramjet/b", "@scramjet/c"]);
    t.deepEqual(affectedWorkspaces({ changedFiles: [{ status: "D", path: "packages/removed/package.json" }], manifests }), ["@scramjet/a", "@scramjet/b", "@scramjet/c"]);
    t.deepEqual(affectedWorkspaces({ changedFiles: [{ status: "M", path: "packages/unknown/file.ts" }], manifests }), ["@scramjet/a", "@scramjet/b", "@scramjet/c"]);
});

test("PR smoke risk mapping is ordered and commands use local tsx without release actions", (t) => {
    const selection = selectPrSmoke({ changedFiles: [
        { status: "M", path: "scripts/release-bdd-validation.js" },
        { status: "M", path: "packages/runner/src/index.ts" },
        { status: "M", path: "packages/config/src/index.ts" },
    ], manifests });
    t.deepEqual(selection.risks, ["config", "runner", "bdd"]);
    assertSmokeCommands(selection.commands);
    t.true(selection.commands.every((command) => command[0] === process.execPath && command[1] === "node_modules/tsx/dist/cli.mjs"));
});
