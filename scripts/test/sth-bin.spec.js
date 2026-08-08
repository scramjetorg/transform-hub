/**
 * @file scripts/test/sth-bin.spec.js
 *
 * Focused tests for the shared STH CLI resolver (scripts/lib/sth-bin.js) that
 * the BDD Host and the release-prerelease flow use to locate the installed
 * `scramjet-transform-hub` executable through node_modules/.bin.
 *
 * The selected bin must be executed directly (its shebang picks the
 * interpreter) — it is never passed to `node` explicitly — and resolution
 * failures must carry clear diagnostics instead of silently falling back to a
 * stale dist artifact.
 */

"use strict";

const test = require("ava").default;
const { execFileSync, spawnSync } = require("node:child_process");
const { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const {
	STH_BIN_NAME,
	describeSthBinResolution,
	findNodeModulesRoot,
	resolveSthBin,
} = require("../lib/sth-bin.js");

const REPO_ROOT = resolve(__dirname, "..", "..");

test("resolves the installed STH CLI through node_modules/.bin in the workspace", (t) => {
	const resolved = resolveSthBin({ cwd: REPO_ROOT });

	t.is(resolved.binName, STH_BIN_NAME);
	t.true(resolved.binPath.endsWith(join("node_modules", ".bin", STH_BIN_NAME)));
	t.true(resolved.binPath.startsWith(REPO_ROOT + require("node:path").sep), "the bin must resolve inside the workspace node_modules");
	t.is(resolved.source, "workspace");
	t.true(resolved.steps.length > 0, "resolution must record diagnostic steps");
	t.true(describeSthBinResolution(resolved).includes(resolved.binPath));
});

test("the selected workspace bin executes directly and prints CLI usage", (t) => {
	const resolved = resolveSthBin({ cwd: REPO_ROOT });
	const env = {
		...process.env,
		// The workspace bin is the TypeScript source entrypoint, executed via
		// its `#!/usr/bin/env ts-node` shebang; ts-node must be on PATH.
		PATH: `${resolve(REPO_ROOT, "node_modules", ".bin")}:${process.env.PATH || ""}`,
	};
	const result = spawnSync(resolved.binPath, ["--help"], { encoding: "utf8", env, timeout: 120000 });

	t.is(result.status, 0, `direct bin execution must exit 0; stderr=${result.stderr}`);
	t.true(/usage:\s+sth/i.test(result.stdout), "bin --help must print the STH CLI usage");
});

test("resolution fails with diagnostics when no node_modules/.bin exists", (t) => {
	const empty = mkdtempSync(join(tmpdir(), "sth-bin-empty-"));
	t.teardown(() => rmSync(empty, { force: true, recursive: true }));

	const error = t.throws(() => resolveSthBin({ cwd: empty }));
	t.true(/node_modules\/\.bin/.test(error.message), "error must point at the missing .bin directory");
	t.true(error.message.includes(empty), "error must name the searched cwd");
});

test("resolution fails with diagnostics when the bin link target is missing", (t) => {
	const root = mkdtempSync(join(tmpdir(), "sth-bin-broken-"));
	t.teardown(() => rmSync(root, { force: true, recursive: true }));

	mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
	symlinkSync("../@scramjet/sth/missing.js", join(root, "node_modules", ".bin", STH_BIN_NAME), "file");

	const error = t.throws(() => resolveSthBin({ cwd: root }));
	t.true(/does not exist/.test(error.message), "error must report the broken link target");
	t.true(error.message.includes("@scramjet/sth/missing.js"), "error must include the missing link target");
});

test("findNodeModulesRoot walks up to the nearest .bin directory", (t) => {
	const nested = join(REPO_ROOT, "bdd", "lib");
	t.is(findNodeModulesRoot(nested), resolve(REPO_ROOT, "node_modules"));
	t.is(findNodeModulesRoot(REPO_ROOT), resolve(REPO_ROOT, "node_modules"));

	const empty = mkdtempSync(join(tmpdir(), "sth-bin-nomodules-"));
	t.teardown(() => rmSync(empty, { force: true, recursive: true }));
	t.is(findNodeModulesRoot(empty), null);
});

test("a prerelease-style bin link resolves with source=installed-package", (t) => {
	const root = mkdtempSync(join(tmpdir(), "sth-bin-installed-"));
	t.teardown(() => rmSync(root, { force: true, recursive: true }));

	// Simulate a verified prerelease install layout: install dir sibling of
	// the workspace root, package bin reachable through a relative .bin link.
	const installDir = join(root, ".release-prerelease-bdd", "node_modules", "@scramjetorg", "sth");
	const binDir = join(root, "node_modules", ".bin");
	mkdirSync(join(installDir, "bin"), { recursive: true });
	mkdirSync(binDir, { recursive: true });
	writeFileSync(join(installDir, "bin", "hub.js"), "#!/usr/bin/env node\nprocess.stdout.write(\"installed sth\");\n", { mode: 0o755 });
	symlinkSync(join("..", "..", ".release-prerelease-bdd", "node_modules", "@scramjetorg", "sth", "bin", "hub.js"), join(binDir, STH_BIN_NAME), "file");

	const resolved = resolveSthBin({ cwd: root });
	t.is(resolved.source, "installed-package");
	t.is(execFileSync(resolved.binPath, [], { encoding: "utf8" }), "installed sth");
});
