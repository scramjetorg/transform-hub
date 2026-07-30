/**
 * @file scripts/test/release-align.spec.js
 *
 * AVA test coverage for the release-alignment workflow.
 * Uses temporary fixture workspaces to test apply, dry-run, check, idempotence,
 * Manager/MultiManager 0.35.1 handling, image updates, excluded invariants,
 * and @signicode preservation.
 */

"use strict";

const test = require("ava");
const fs = require("node:fs");
const path = require("node:path");
const { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { spawnSync } = require("node:child_process");

const alignScript = path.resolve(__dirname, "..", "release-align.js");
const boundary = require("../lib/release-boundary");

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Create a temporary workspace that mimics the monorepo structure
 * needed for alignment tests.
 *
 * Returns { root, rootPkg, packages, imageConfigPath } where:
 *   - root: temp dir path
 *   - rootPkg: path to root package.json
 *   - packages: Map of name -> { dir, manifestPath }
 *   - imageConfigPath: path to image-config fixture
 */
function createFixture(t, overrides = {}) {
	const root = mkdtempSync(path.join(tmpdir(), "release-align-test-"));
	t.teardown(() => {
		try { rmSync(root, { force: true, recursive: true }); } catch { /* ignore */ }
	});

	const included = overrides.included || ["@scramjet/sth", "@scramjet/host", "@scramjet/manager"];
	const excluded = overrides.excluded || ["@scramjet/verser"];
	const otherExternal = overrides.otherExternal || [];
	const version = overrides.version || "1.1.0";
	const managerVersion = overrides.managerVersion || "0.35.1";
	const enableImageConfig = overrides.enableImageConfig !== false;
	const includeSignicode = overrides.includeSignicode !== false;
	const depOverrides = overrides.depOverrides || {};

	// Compute workspace package dirs from included set
	const includedDirs = included
		.map((n) => n === "scramjet-bdd" ? "bdd" : "packages/" + n.replace("@scramjet/", ""))
		.sort();
	const workspacePackages = overrides.workspacePackages !== undefined
		? overrides.workspacePackages
		: includedDirs;
	const workspaceRelease = overrides.workspaceRelease !== undefined
		? overrides.workspaceRelease
		: workspacePackages;

	// Root package.json
	const rootPkg = path.join(root, "package.json");
	writeFileSync(rootPkg, JSON.stringify({
		name: "@scramjet/transform-hub",
		version,
		private: true,
		workspaces: {
			packages: workspacePackages,
			release: workspaceRelease,
		}
	}, null, 2) + "\n");

	// Packages
	const packagesDir = path.join(root, "packages");
	mkdirSync(packagesDir, { recursive: true });

	const packages = new Map();

	// Helper to create a package
	function addPackage(name, pkgVersion, deps = {}, devDeps = {}, peerDeps = {}, optionalDeps = {}) {
		const dirName = name.replace("@scramjet/", "").replace("scramjet-", "").replace("-bdd", "bdd");
		const pkgDir = path.join(packagesDir, dirName);
		mkdirSync(pkgDir, { recursive: true });
		const manifestPath = path.join(pkgDir, "package.json");

		const manifest = {
			name,
			version: pkgVersion,
			license: "AGPL-3.0"
		};

		if (Object.keys(deps).length) manifest.dependencies = deps;
		if (Object.keys(devDeps).length) manifest.devDependencies = devDeps;
		if (Object.keys(peerDeps).length) manifest.peerDependencies = peerDeps;
		if (Object.keys(optionalDeps).length) manifest.optionalDependencies = optionalDeps;

		writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
		packages.set(name, { dir: pkgDir, manifestPath, manifest });
	}

	// Create included packages
	for (const name of included) {
		let pkgVersion = version;
		if (name === "@scramjet/manager" || name === "@scramjet/multi-manager") {
			pkgVersion = managerVersion;
		}
		// Set deps based on configuration
		const deps = { ...(depOverrides[`${name}.deps`] || {}) };
		const devDeps = { ...(depOverrides[`${name}.devDeps`] || {}) };
		const peerDeps = { ...(depOverrides[`${name}.peerDeps`] || {}) };
		const optionalDeps = { ...(depOverrides[`${name}.optionalDeps`] || {}) };
		addPackage(name, pkgVersion, deps, devDeps, peerDeps, optionalDeps);
	}

	// Create excluded packages
	for (const name of excluded) {
		let pkgVersion = "1.1.0";
		if (name === "@scramjet/bpmux") pkgVersion = "9.0.0";
		if (name === "@scramjet/frame-stream") pkgVersion = "5.0.0";
		const deps = { ...(depOverrides[`${name}.deps`] || {}) };
		addPackage(name, pkgVersion, deps);
	}

	// Create external packages named like they are in the boundary
	for (const name of otherExternal) {
		addPackage(name, version);
	}

	// Image config fixture
	let imageConfigPath = null;
	if (enableImageConfig) {
		const configDir = path.join(root, "packages", "config", "src", "sth");
		mkdirSync(configDir, { recursive: true });
		imageConfigPath = path.join(configDir, "image-config.ts");
		writeFileSync(imageConfigPath, `
export const imageConfig = {
    prerunner: "scramjetorg/pre-runner:${version}",
    runner: {
        node: "scramjetorg/runner:${version}",
        python3: "scramjetorg/runner-py:${version}",
        bun: "scramjetorg/runner-bun:${version}"
    }
};
`);
	}

	return { root, rootPkg, packages, imageConfigPath, version, managerVersion };
}

/**
 * Run release-align with a given mode against a fixture root.
 * Returns { status, stdout, stderr }.
 */
function runAlign(root, mode, env = {}) {
	const result = spawnSync(process.execPath, [alignScript, mode], {
		cwd: root,
		env: { ...process.env, SCRAMJET_RELEASE_ROOT: root, ...env },
		encoding: "utf8"
	});
	return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/**
 * Read a package.json manifest.
 */
function readManifest(pkgPath) {
	return JSON.parse(readFileSync(pkgPath, "utf8"));
}

/**
 * Set up proper MIT license state in a fixture: write root LICENSE, set
 * all included packages' license field to MIT, and create LICENSE files.
 */
function setupLicenses(fix) {
	const mitText = boundary.MIT_LICENSE_TEXT;
	const rootDir = path.dirname(fix.rootPkg);
	writeFileSync(path.join(rootDir, "LICENSE"), mitText);

	const rootMan = readManifest(fix.rootPkg);
	rootMan.license = "MIT";
	writeFileSync(fix.rootPkg, JSON.stringify(rootMan, null, 2) + "\n");

	for (const [name, pkg] of fix.packages) {
		if (!boundary.isIncluded(name) || boundary.isExcluded(name)) continue;
		const pkgDir = path.dirname(pkg.manifestPath);
		const manifest = readManifest(pkg.manifestPath);
		manifest.license = "MIT";
		writeFileSync(pkg.manifestPath, JSON.stringify(manifest, null, 2) + "\n");
		writeFileSync(path.join(pkgDir, "LICENSE"), mitText);
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("check passes on already-aligned workspace", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/sth", "@scramjet/host", "@scramjet/manager", "@scramjet/multi-manager"],
		depOverrides: {
			"@scramjet/manager.deps": { "@scramjet/host": "^2.0.0" },
			"@scramjet/multi-manager.deps": { "@scramjet/manager": "^2.0.0" },
		}
	});

	// Set up proper MIT license state for the check
	setupLicenses(fix);

	const result = runAlign(fix.root, "check");

	t.is(result.status, 0, "check should exit 0 when aligned");
	t.true(result.stdout.includes("OK"), "stdout should mention OK");
});

test("check reports drift and exits 1 on version mismatch", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
	});

	const result = runAlign(fix.root, "check");

	t.is(result.status, 1, "check should exit 1 on drift");
	t.true(result.stdout.includes("DRIFT"), "stdout should mention DRIFT");
});

test("check reports dependency drift", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host"],
		depOverrides: {
			"@scramjet/sth.deps": { "@scramjet/host": "^1.0.0" },
		}
	});

	const result = runAlign(fix.root, "check");

	t.is(result.status, 1, "check should exit 1 on dep drift");
	t.true(result.stdout.includes("DEP DRIFT"), "stdout should mention DEP DRIFT");
});

test("dry-run shows changes without modifying files", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host"],
		depOverrides: {
			"@scramjet/sth.deps": { "@scramjet/host": "^1.1.0" },
		}
	});

	const result = runAlign(fix.root, "dry-run");

	t.is(result.status, 0, "dry-run should exit 0");
	t.true(result.stdout.includes("2.0.0"), "dry-run output should reference target version");
	t.true(result.stdout.includes("(dry-run"), "dry-run output should indicate no writes");

	// Verify nothing was changed
	const rootManifest = readManifest(fix.rootPkg);
	t.is(rootManifest.version, "1.1.0", "root version should be unchanged after dry-run");

	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	t.is(sth.version, "1.1.0", "package version should be unchanged after dry-run");
});

test("apply updates root version", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
	});

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");
	const rootManifest = readManifest(fix.rootPkg);
	t.is(rootManifest.version, "2.0.0", "root version should be 2.0.0 after apply");
});

test("apply updates included package versions", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host", "@scramjet/pre-runner"],
	});

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	t.is(sth.version, "2.0.0", "included package version should be 2.0.0");

	const host = readManifest(fix.packages.get("@scramjet/host").manifestPath);
	t.is(host.version, "2.0.0", "included package version should be 2.0.0");
});

test("apply updates included-to-included dependency ranges", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host", "@scramjet/runner"],
		depOverrides: {
			"@scramjet/sth.deps": { "@scramjet/host": "^1.1.0" },
			"@scramjet/host.deps": { "@scramjet/runner": "^1.1.0" },
		}
	});

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	t.is(sth.dependencies["@scramjet/host"], "^2.0.0", "dep range should be updated");

	const host = readManifest(fix.packages.get("@scramjet/host").manifestPath);
	t.is(host.dependencies["@scramjet/runner"], "^2.0.0", "dep range should be updated");
});

test("apply handles Manager/MultiManager 0.35.1 → 2.0.0", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		managerVersion: "0.35.1",
		included: ["@scramjet/manager", "@scramjet/multi-manager", "@scramjet/host"],
		depOverrides: {
			"@scramjet/multi-manager.deps": { "@scramjet/manager": "^0.35.1" },
			"@scramjet/manager.deps": { "@scramjet/host": "^1.1.0" },
		}
	});

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	const manager = readManifest(fix.packages.get("@scramjet/manager").manifestPath);
	t.is(manager.version, "2.0.0", "manager version should be 2.0.0");

	const multiManager = readManifest(fix.packages.get("@scramjet/multi-manager").manifestPath);
	t.is(multiManager.version, "2.0.0", "multi-manager version should be 2.0.0");
	t.is(multiManager.dependencies["@scramjet/manager"], "^2.0.0",
		"multi-manager dep on manager should be ^2.0.0");
});

test("apply handles devDependencies, peerDependencies, optionalDependencies", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host", "@scramjet/types"],
		depOverrides: {
			"@scramjet/sth.devDeps": { "@scramjet/types": "^1.1.0" },
			"@scramjet/sth.peerDeps": { "@scramjet/host": "^1.1.0" },
			"@scramjet/sth.optionalDeps": { "@scramjet/host": "^1.1.0" },
		}
	});

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	t.is(sth.devDependencies["@scramjet/types"], "^2.0.0", "devDep should be updated");
	t.is(sth.peerDependencies["@scramjet/host"], "^2.0.0", "peerDep should be updated");
	t.is(sth.optionalDependencies["@scramjet/host"], "^2.0.0", "optionalDep should be updated");
});

test("apply preserves range prefix (^, ~, exact)", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host", "@scramjet/runner"],
		depOverrides: {
			"@scramjet/sth.deps": {
				"@scramjet/host": "^1.1.0",     // caret
				"@scramjet/runner": "1.1.0",     // exact
			},
		}
	});

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	t.is(sth.dependencies["@scramjet/host"], "^2.0.0", "caret prefix preserved");
	t.is(sth.dependencies["@scramjet/runner"], "2.0.0", "exact range preserved");
});

test("apply updates image-config.ts", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
		enableImageConfig: true,
	});

	t.true(fix.imageConfigPath !== null, "image config fixture should exist");
	const before = readFileSync(fix.imageConfigPath, "utf8");
	t.true(before.includes(":1.1.0"), "fixture should have 1.1.0 tags");

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	const after = readFileSync(fix.imageConfigPath, "utf8");
	t.true(after.includes(":2.0.0"), "image tags should be updated to 2.0.0");
	t.false(after.includes(":1.1.0"), "old 1.1.0 tags should not remain");
});

test("apply does not modify excluded packages", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
		excluded: ["@scramjet/verser", "@scramjet/bpmux", "@scramjet/frame-stream"],
	});

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	const verser = readManifest(fix.packages.get("@scramjet/verser").manifestPath);
	t.is(verser.version, "1.1.0", "excluded verser should remain at 1.1.0");

	const bpmux = readManifest(fix.packages.get("@scramjet/bpmux").manifestPath);
	t.is(bpmux.version, "9.0.0", "excluded bpmux should remain at 9.0.0");

	const frameStream = readManifest(fix.packages.get("@scramjet/frame-stream").manifestPath);
	t.is(frameStream.version, "5.0.0", "excluded frame-stream should remain at 5.0.0");
});

test("apply preserves @signicode dependencies", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
		depOverrides: {
			"@scramjet/sth.deps": {
				"@signicode/verser2-host": "0.7.0",
				"@signicode/verser-common": "0.5.0",
			},
		}
	});

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	t.is(sth.dependencies["@signicode/verser2-host"], "0.7.0", "@signicode dep should be preserved");
	t.is(sth.dependencies["@signicode/verser-common"], "0.5.0", "@signicode dep should be preserved");
});

test("apply does not modify non-scramjet external dependencies", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
		depOverrides: {
			"@scramjet/sth.deps": {
				"scramjet": "^4.37.0",
				"zod": "^3.25.67",
			},
		}
	});

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	t.is(sth.dependencies["scramjet"], "^4.37.0", "scramjet dep should be preserved");
	t.is(sth.dependencies["zod"], "^3.25.67", "zod dep should be preserved");
});

test("apply is idempotent — second run reports no changes", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host"],
		depOverrides: {
			"@scramjet/sth.deps": { "@scramjet/host": "^1.1.0" },
		}
	});

	// First apply
	const first = runAlign(fix.root, "apply");
	t.is(first.status, 0, "first apply should exit 0");

	// Verify changes were made
	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	t.is(sth.version, "2.0.0", "version should be 2.0.0 after first apply");

	// Second apply — should be a no-op
	const second = runAlign(fix.root, "apply");
	t.is(second.status, 0, "second apply should exit 0");
	t.true(second.stdout.includes("no change"), "second apply should report no changes");
});

test("check fails when excluded package has drifted to target version", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
		excluded: ["@scramjet/verser"],
	});

	// Manually mutate excluded package to 2.0.0 (as if something went wrong)
	const verserManifest = readManifest(fix.packages.get("@scramjet/verser").manifestPath);
	verserManifest.version = "2.0.0";
	writeFileSync(fix.packages.get("@scramjet/verser").manifestPath,
		JSON.stringify(verserManifest, null, 2) + "\n");

	const result = runAlign(fix.root, "check");

	t.is(result.status, 1, "check should exit 1");
	t.true(result.stdout.includes("EXCLUDED BOUNDARY VIOLATION"),
		"should report excluded boundary violation");
});

test("check fails when included package has excluded dep at target version", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
		excluded: ["@scramjet/verser"],
		depOverrides: {
			"@scramjet/sth.deps": { "@scramjet/verser": "^2.0.0" },
		}
	});

	const result = runAlign(fix.root, "check");

	t.is(result.status, 1, "check should exit 1");
	t.true(result.stdout.includes("EXCLUDED BOUNDARY VIOLATION"),
		"should report excluded boundary violation on dep");
});

test("dry-run reports drift without modifying files", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host"],
	});

	// Capture content before
	const rootBefore = readFileSync(fix.rootPkg, "utf8");
	const sthBefore = readFileSync(fix.packages.get("@scramjet/sth").manifestPath, "utf8");

	const result = runAlign(fix.root, "dry-run");

	t.is(result.status, 0, "dry-run should exit 0");
	t.true(result.stdout.includes("2.0.0"), "output should mention target version");

	// Verify no files changed
	t.is(readFileSync(fix.rootPkg, "utf8"), rootBefore, "root should be unchanged");
	t.is(
		readFileSync(fix.packages.get("@scramjet/sth").manifestPath, "utf8"),
		sthBefore,
		"package should be unchanged"
	);
});

test("apply preserves exact dependencies on excluded packages", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
		excluded: ["@scramjet/bpmux", "@scramjet/verser"],
		depOverrides: {
			"@scramjet/sth.deps": {
				"@scramjet/verser": "^1.1.0",
				"@scramjet/bpmux": "^9.0.0",
			},
		}
	});

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	t.is(sth.dependencies["@scramjet/verser"], "^1.1.0",
		"excluded dep range on verser should be preserved");
	t.is(sth.dependencies["@scramjet/bpmux"], "^9.0.0",
		"excluded dep range on bpmux should be preserved");
});

test("apply handles workspace-only deps with correct boundary scoping", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host", "@scramjet/runner"],
		excluded: ["@scramjet/verser"],
		depOverrides: {
			"@scramjet/sth.deps": {
				"@scramjet/host": "^1.1.0",
				"@scramjet/runner": "^1.1.0",
				"@scramjet/verser": "^1.1.0",
				"@signicode/verser2-host": "0.7.0",
			},
		}
	});

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	// Included-to-included: updated
	t.is(sth.dependencies["@scramjet/host"], "^2.0.0", "included dep should update");
	t.is(sth.dependencies["@scramjet/runner"], "^2.0.0", "included dep should update");
	// Excluded: preserved
	t.is(sth.dependencies["@scramjet/verser"], "^1.1.0", "excluded dep should preserve");
	// @signicode: preserved
	t.is(sth.dependencies["@signicode/verser2-host"], "0.7.0", "@signicode dep should preserve");
});

test("apply updates image config with all runner variants", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
		enableImageConfig: true,
	});

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	const content = readFileSync(fix.imageConfigPath, "utf8");
	t.true(content.includes("pre-runner:2.0.0"), "pre-runner image should update");
	t.true(content.includes("runner:2.0.0"), "runner node image should update");
	t.true(content.includes("runner-py:2.0.0"), "runner python image should update");
	t.true(content.includes("runner-bun:2.0.0"), "runner bun image should update");
});

test("check passes on pre-aligned state with Manager/MultiManager at 2.0.0", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/manager", "@scramjet/multi-manager"],
		depOverrides: {
			"@scramjet/multi-manager.deps": { "@scramjet/manager": "^2.0.0" },
		}
	});

	setupLicenses(fix);

	const result = runAlign(fix.root, "check");

	t.is(result.status, 0, "check should pass when all aligned");
	t.true(result.stdout.includes("OK"), "should report OK status");
});

test("check fails on package version drift", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host", "@scramjet/runner"],
		depOverrides: {
			"@scramjet/sth.deps": { "@scramjet/host": "^1.1.0" },
		}
	});

	const result = runAlign(fix.root, "check");

	t.is(result.status, 1, "check should fail");
	t.true(result.stdout.includes("VERSION DRIFT"), "should report version drift");
});

test("apply reports modified file count", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host", "@scramjet/runner"],
		depOverrides: {
			"@scramjet/sth.deps": { "@scramjet/host": "^1.1.0" },
		},
		enableImageConfig: true,
	});

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");
	t.true(result.stdout.includes("file(s) modified"), "should report file count");
});

// ---------------------------------------------------------------------------
// Workspace group tests
// ---------------------------------------------------------------------------

test("check passes when workspace groups match the release boundary", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/sth", "@scramjet/host"],
	});

	setupLicenses(fix);

	const result = runAlign(fix.root, "check");

	t.is(result.status, 0, "check should exit 0 when workspace groups match");
});

test("check fails when workspaces.packages includes an excluded directory", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/sth", "@scramjet/host"],
		workspacePackages: ["packages/sth", "packages/host", "packages/verser"],
	});

	const result = runAlign(fix.root, "check");

	t.is(result.status, 1, "check should exit 1 when workspace packages has excluded dir");
	t.true(result.stdout.includes("WORKSPACE GROUP DRIFT"),
		"should report WORKSPACE GROUP DRIFT");
});

test("check fails when workspaces.packages is missing a required directory", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/sth", "@scramjet/host"],
		workspacePackages: ["packages/sth"], // missing host
	});

	const result = runAlign(fix.root, "check");

	t.is(result.status, 1, "check should exit 1 when workspace packages is incomplete");
	t.true(result.stdout.includes("WORKSPACE GROUP DRIFT"),
		"should report WORKSPACE GROUP DRIFT");
});

test("check fails when workspaces.release does not match boundary", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/sth", "@scramjet/host"],
		workspaceRelease: ["packages/sth"], // incomplete
	});

	const result = runAlign(fix.root, "check");

	t.is(result.status, 1, "check should exit 1 when release group is incomplete");
	t.true(result.stdout.includes("WORKSPACE GROUP DRIFT"),
		"should report WORKSPACE GROUP DRIFT on release group");
});

test("check fails when workspaces.release is missing entirely", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/sth", "@scramjet/host"],
		workspacePackages: ["packages/sth", "packages/host"],
		// no workspaceRelease set
	});
	// Override root to drop workspaces.release
	const rootManifest = readManifest(fix.rootPkg);
	delete rootManifest.workspaces.release;
	writeFileSync(fix.rootPkg, JSON.stringify(rootManifest, null, 2) + "\n");

	const result = runAlign(fix.root, "check");

	t.is(result.status, 1, "check should exit 1 when release group is missing");
	t.true(result.stdout.includes("WORKSPACE GROUP DRIFT"),
		"should report WORKSPACE GROUP DRIFT for missing release group");
});

test("dry-run reports workspace group drift without modifying files", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/sth", "@scramjet/host"],
		workspacePackages: ["packages/sth", "packages/host", "packages/verser"],
	});

	const rootBefore = readFileSync(fix.rootPkg, "utf8");

	const result = runAlign(fix.root, "dry-run");

	t.is(result.status, 0, "dry-run should exit 0");
	t.true(result.stdout.includes("WORKSPACE GROUP DRIFT"),
		"dry-run should report WORKSPACE GROUP DRIFT");
	t.true(result.stdout.includes("(dry-run"), "output should indicate no writes");

	// Verify no files were modified
	t.is(readFileSync(fix.rootPkg, "utf8"), rootBefore, "root should be unchanged after dry-run");
});

test("release boundary parity: expectedWorkspacePackages matches expectedWorkspaceRelease", (t) => {
	const { expectedWorkspacePackages: ewp, expectedWorkspaceRelease: ewr } = boundary;
	t.is(
		JSON.stringify(ewp()),
		JSON.stringify(ewr()),
		"expectedWorkspacePackages and expectedWorkspaceRelease should be identical"
	);
});

test("release boundary parity: includedPackageDirs matches expectedWorkspacePackages", (t) => {
	const { includedPackageDirs: ipd, expectedWorkspacePackages: ewp } = boundary;
	t.is(
		JSON.stringify(ipd()),
		JSON.stringify(ewp()),
		"includedPackageDirs should match expectedWorkspacePackages"
	);
});

// ---------------------------------------------------------------------------
// Apply fail-closed tests
// ---------------------------------------------------------------------------

test("apply fails closed on excluded-boundary violation, leaves files unchanged", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host"],
		excluded: ["@scramjet/verser"],
		depOverrides: {
			"@scramjet/sth.deps": { "@scramjet/host": "^1.1.0" },
		},
	});

	// Mutate an excluded package to 2.0.0 to create a boundary violation
	const verserManifest = readManifest(fix.packages.get("@scramjet/verser").manifestPath);
	verserManifest.version = "2.0.0";
	writeFileSync(
		fix.packages.get("@scramjet/verser").manifestPath,
		JSON.stringify(verserManifest, null, 2) + "\n"
	);

	// Capture byte content before apply
	const rootBefore = readFileSync(fix.rootPkg, "utf8");
	const sthBefore = readFileSync(fix.packages.get("@scramjet/sth").manifestPath, "utf8");
	const hostBefore = readFileSync(fix.packages.get("@scramjet/host").manifestPath, "utf8");

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 1, "apply should exit 1 on boundary violation");
	t.true(result.stdout.includes("Apply blocked"), "should report blocked");
	t.true(result.stdout.includes("EXCLUDED BOUNDARY VIOLATION"),
		"should mention the violation reason");

	// Verify no files were modified
	t.is(readFileSync(fix.rootPkg, "utf8"), rootBefore, "root unchanged after blocked apply");
	t.is(
		readFileSync(fix.packages.get("@scramjet/sth").manifestPath, "utf8"),
		sthBefore,
		"included package unchanged after blocked apply"
	);
	t.is(
		readFileSync(fix.packages.get("@scramjet/host").manifestPath, "utf8"),
		hostBefore,
		"included package unchanged after blocked apply"
	);
});

test("apply fails closed on workspace-group drift, leaves files unchanged", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host"],
		depOverrides: {
			"@scramjet/sth.deps": { "@scramjet/host": "^1.1.0" },
		},
		workspacePackages: ["packages/sth", "packages/host", "packages/verser"],
	});

	// Capture byte content before apply
	const rootBefore = readFileSync(fix.rootPkg, "utf8");
	const sthBefore = readFileSync(fix.packages.get("@scramjet/sth").manifestPath, "utf8");
	const hostBefore = readFileSync(fix.packages.get("@scramjet/host").manifestPath, "utf8");

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 1, "apply should exit 1 on workspace drift");
	t.true(result.stdout.includes("Apply blocked"), "should report blocked");
	t.true(result.stdout.includes("WORKSPACE GROUP DRIFT"),
		"should mention the workspace drift");

	// Verify no files were modified
	t.is(readFileSync(fix.rootPkg, "utf8"), rootBefore, "root unchanged after blocked apply");
	t.is(
		readFileSync(fix.packages.get("@scramjet/sth").manifestPath, "utf8"),
		sthBefore,
		"included package unchanged after blocked apply"
	);
	t.is(
		readFileSync(fix.packages.get("@scramjet/host").manifestPath, "utf8"),
		hostBefore,
		"included package unchanged after blocked apply"
	);
});

// ---------------------------------------------------------------------------
// License tests
// ---------------------------------------------------------------------------

test("check passes when all licenses are MIT with LICENSE files", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/sth", "@scramjet/host"],
	});

	setupLicenses(fix);

	const result = runAlign(fix.root, "check");
	t.is(result.status, 0, "check should pass when all licenses correct");
});

test("check fails when included package has non-MIT license field", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/sth", "@scramjet/host"],
	});

	const mitText = boundary.MIT_LICENSE_TEXT;
	writeFileSync(path.join(path.dirname(fix.rootPkg), "LICENSE"), mitText);
	for (const [, pkg] of fix.packages) {
		if (!pkg.isIncluded || pkg.isExcluded) continue;
		const pkgDir = path.dirname(pkg.manifestPath);
		const manifest = readManifest(pkg.manifestPath);
		manifest.license = "MIT";
		writeFileSync(path.join(pkgDir, "LICENSE"), mitText);
		writeFileSync(pkg.manifestPath, JSON.stringify(manifest, null, 2) + "\n");
	}

	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	sth.license = "AGPL-3.0";
	writeFileSync(fix.packages.get("@scramjet/sth").manifestPath,
		JSON.stringify(sth, null, 2) + "\n");

	const result = runAlign(fix.root, "check");
	t.is(result.status, 1, "check should fail on license drift");
	t.true(result.stdout.includes("LICENSE DRIFT"),
		"should report LICENSE DRIFT");
});

test("check fails when included package is missing LICENSE file", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/sth"],
	});

	const mitText = boundary.MIT_LICENSE_TEXT;
	writeFileSync(path.join(path.dirname(fix.rootPkg), "LICENSE"), mitText);
	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	sth.license = "MIT";
	writeFileSync(fix.packages.get("@scramjet/sth").manifestPath,
		JSON.stringify(sth, null, 2) + "\n");

	const result = runAlign(fix.root, "check");
	t.is(result.status, 1, "check should fail on missing LICENSE");
	t.true(result.stdout.includes("LICENSE FILE MISSING"),
		"should report LICENSE FILE MISSING");
});

test("check fails when LICENSE file content does not match standard text", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/sth"],
	});

	const mitText = boundary.MIT_LICENSE_TEXT;
	writeFileSync(path.join(path.dirname(fix.rootPkg), "LICENSE"), mitText);

	const sthDir = path.dirname(fix.packages.get("@scramjet/sth").manifestPath);
	writeFileSync(path.join(sthDir, "LICENSE"), "This is not the MIT license text.\n");
	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	sth.license = "MIT";
	writeFileSync(fix.packages.get("@scramjet/sth").manifestPath,
		JSON.stringify(sth, null, 2) + "\n");

	const result = runAlign(fix.root, "check");
	t.is(result.status, 1, "check should fail on wrong LICENSE content");
	t.true(result.stdout.includes("LICENSE FILE DRIFT"),
		"should report LICENSE FILE DRIFT");
});

test("apply-licenses creates LICENSE files and updates license fields", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host"],
	});

	t.false(existsSync(path.join(path.dirname(fix.rootPkg), "LICENSE")),
		"no root LICENSE before apply");

	const result = runAlign(fix.root, "apply-licenses");
	t.is(result.status, 0, "apply-licenses should exit 0");

	t.true(existsSync(path.join(path.dirname(fix.rootPkg), "LICENSE")),
		"root LICENSE created");
	const sthDir = path.dirname(fix.packages.get("@scramjet/sth").manifestPath);
	t.true(existsSync(path.join(sthDir, "LICENSE")),
		"package LICENSE created");

	const rootMan = readManifest(fix.rootPkg);
	t.is(rootMan.license, "MIT", "root license should be MIT");
	const sthMan = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	t.is(sthMan.license, "MIT", "package license should be MIT");
});

test("apply-licenses is idempotent", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
	});

	const first = runAlign(fix.root, "apply-licenses");
	t.is(first.status, 0, "first apply-licenses should exit 0");

	const second = runAlign(fix.root, "apply-licenses");
	t.is(second.status, 0, "second apply-licenses should exit 0");
	t.true(second.stdout.includes("no change"),
		"second apply-licenses should report no changes");
});

test("apply-licenses does not modify excluded packages", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
		excluded: ["@scramjet/verser"],
	});

	const verserBefore = readManifest(fix.packages.get("@scramjet/verser").manifestPath);

	const result = runAlign(fix.root, "apply-licenses");
	t.is(result.status, 0, "apply-licenses should exit 0");

	const verserAfter = readManifest(fix.packages.get("@scramjet/verser").manifestPath);
	t.is(verserAfter.license, verserBefore.license,
		"excluded package license should be unchanged");
	t.is(existsSync(path.join(
		path.dirname(fix.packages.get("@scramjet/verser").manifestPath), "LICENSE"
	)), false, "excluded package should not get a LICENSE file");
});

test("apply-licenses creates LICENSE for already-MIT packages that lacked the file", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
	});

	const sth = readManifest(fix.packages.get("@scramjet/sth").manifestPath);
	sth.license = "MIT";
	writeFileSync(fix.packages.get("@scramjet/sth").manifestPath,
		JSON.stringify(sth, null, 2) + "\n");

	const sthDir = path.dirname(fix.packages.get("@scramjet/sth").manifestPath);
	t.false(existsSync(path.join(sthDir, "LICENSE")), "no LICENSE before apply");

	const result = runAlign(fix.root, "apply-licenses");
	t.is(result.status, 0, "apply-licenses should exit 0");

	t.true(existsSync(path.join(sthDir, "LICENSE")), "LICENSE file created");
	t.is(readFileSync(path.join(sthDir, "LICENSE"), "utf8"),
		boundary.MIT_LICENSE_TEXT, "LICENSE content matches MIT text");
});

test("apply-licenses creates root LICENSE and updates root license to MIT", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth"],
	});

	t.false(existsSync(path.join(path.dirname(fix.rootPkg), "LICENSE")),
		"no root LICENSE before apply");
	const rootBefore = readManifest(fix.rootPkg);
	t.not(rootBefore.license, "MIT", "root license not MIT before apply");

	const result = runAlign(fix.root, "apply-licenses");
	t.is(result.status, 0, "apply-licenses should exit 0");

	t.true(existsSync(path.join(path.dirname(fix.rootPkg), "LICENSE")),
		"root LICENSE created");
	const rootAfter = readManifest(fix.rootPkg);
	t.is(rootAfter.license, "MIT", "root license should be MIT");
});

test("check fails when root LICENSE is missing", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/sth"],
	});

	const result = runAlign(fix.root, "check");
	t.is(result.status, 1, "check should fail on missing root LICENSE");
});

test("check fails when included package license field drifts after apply-licenses", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host"],
	});

	const applyResult = runAlign(fix.root, "apply-licenses");
	t.is(applyResult.status, 0, "apply-licenses should succeed");

	const host = readManifest(fix.packages.get("@scramjet/host").manifestPath);
	host.license = "AGPL-3.0";
	writeFileSync(fix.packages.get("@scramjet/host").manifestPath,
		JSON.stringify(host, null, 2) + "\n");

	const checkResult = runAlign(fix.root, "check");
	t.is(checkResult.status, 1, "check should detect license drift");
	t.true(checkResult.stdout.includes("LICENSE DRIFT"),
		"should report drifting package");
});
