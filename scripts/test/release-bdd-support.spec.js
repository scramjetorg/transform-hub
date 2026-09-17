"use strict";

const test = require("ava").default;
const { createHash } = require("node:crypto");
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { CANONICAL_PATH, SOURCE_PATH, buildBddSupport } = require("../lib/release-bdd-support");

function fixtureRoot(t) {
    const root = mkdtempSync(join(tmpdir(), "release-bdd-support-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    return root;
}

test("build BDD support compiles and reads the nested emitted artifact", (t) => {
    const root = fixtureRoot(t);
    const bytes = Buffer.from("compiled BDD support\n");
    const source = join(root, ...SOURCE_PATH);
    mkdirSync(join(root, "bdd", "dist", "bdd", "lib"), { recursive: true });
    writeFileSync(source, bytes);
    const calls = [];

    const artifact = buildBddSupport({ root, runner: (command, args, options) => calls.push({ command, args, options }) });
    const hash = createHash("sha256").update(bytes);

    t.deepEqual(calls, [{ command: "npm", args: ["--prefix", join(root, "bdd"), "run", "build:bdd"], options: { cwd: root, stdio: "inherit" } }]);
    t.is(artifact.path, CANONICAL_PATH);
    t.is(artifact.size, bytes.length);
    t.is(artifact.sha256, `sha256:${hash.copy().digest("hex")}`);
    t.is(artifact.sri, `sha256-${hash.digest("base64")}`);
    t.is(artifact.source, source);
});

test("build BDD support rejects the legacy flat emitted artifact layout", (t) => {
    const root = fixtureRoot(t);
    mkdirSync(join(root, "bdd", "dist", "lib"), { recursive: true });
    writeFileSync(join(root, "bdd", "dist", "lib", "runner-container-cleanup.js"), "legacy\n");

    const error = t.throws(() => buildBddSupport({ root, runner: () => {} }));
    t.true(error.message.includes(join(root, "bdd", "dist", "bdd", "lib", "runner-container-cleanup.js")));
});
