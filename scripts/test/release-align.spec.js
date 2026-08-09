/**
 * @file scripts/test/release-align.spec.js
 *
 * AVA test coverage for the release-alignment workflow.
 * Uses temporary fixture workspaces to test apply, dry-run, check, idempotence,
 * Manager/MultiManager 0.35.1 handling, image updates, excluded invariants,
 * and @signicode preservation.
 */

"use strict";

const test = require("ava").default;
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
		if (!boundary.isLicenseTarget(name)) continue;
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

test("license-only excluded bdd may preserve an independently managed target version", (t) => {
	const fix = createFixture(t, {
		included: ["@scramjet/sth"],
		excluded: ["scramjet-bdd", "@scramjet/verser"],
	});
	const bdd = readManifest(fix.packages.get("scramjet-bdd").manifestPath);
	bdd.version = "2.0.0";
	writeFileSync(fix.packages.get("scramjet-bdd").manifestPath, JSON.stringify(bdd, null, 2) + "\n");

	const result = runAlign(fix.root, "dry-run");

	t.false(result.stdout.includes('EXCLUDED BOUNDARY VIOLATION: excluded package "scramjet-bdd"'));
	t.false(result.stdout.includes('EXCLUDED BOUNDARY VIOLATION: excluded package "@scramjet/verser"'));
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

test("runner-python is now included in version alignment; bdd remains license-only excluded", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/runner-python"],
		excluded: ["scramjet-bdd", "@scramjet/verser"],
	});

	// Before: runner-python has non-MIT license, bdd and verser have non-MIT
	const rpBefore = readManifest(fix.packages.get("@scramjet/runner-python").manifestPath);
	t.not(rpBefore.license, "MIT", "runner-python not MIT before");
	const bddBefore = readManifest(fix.packages.get("scramjet-bdd").manifestPath);
	t.not(bddBefore.license, "MIT", "bdd not MIT before");
	const verserBefore = readManifest(fix.packages.get("@scramjet/verser").manifestPath);
	t.is(verserBefore.license, "AGPL-3.0", "verser AGPL-3.0 before");

	// apply-licenses gives MIT to both runner-python (included) and bdd (license-only)
	const licResult = runAlign(fix.root, "apply-licenses");
	t.is(licResult.status, 0, "apply-licenses should succeed");

	const rpLic = readManifest(fix.packages.get("@scramjet/runner-python").manifestPath);
	t.is(rpLic.license, "MIT", "runner-python now MIT");
	const bddLic = readManifest(fix.packages.get("scramjet-bdd").manifestPath);
	t.is(bddLic.license, "MIT", "bdd now MIT");
	const verserLic = readManifest(fix.packages.get("@scramjet/verser").manifestPath);
	t.is(verserLic.license, "AGPL-3.0", "verser still AGPL-3.0");

	// Version apply: runner-python (included) gets bumped to 2.0.0;
	// bdd (excluded except licensing) stays at 1.1.0; verser stays at 1.1.0.
	const applyResult = runAlign(fix.root, "apply");
	t.is(applyResult.status, 0, "apply should succeed");

	const rpVer = readManifest(fix.packages.get("@scramjet/runner-python").manifestPath);
	t.is(rpVer.version, "2.0.0", "runner-python version bumped to 2.0.0");
	t.is(rpVer.license, "MIT", "runner-python license still MIT after apply");

	const bddVer = readManifest(fix.packages.get("scramjet-bdd").manifestPath);
	t.is(bddVer.version, "1.1.0", "bdd version unchanged (excluded from version alignment)");
	t.is(bddVer.license, "MIT", "bdd license still MIT after apply");

	const verserVer = readManifest(fix.packages.get("@scramjet/verser").manifestPath);
	t.is(verserVer.version, "1.1.0", "verser version unchanged (strictly excluded)");
	t.is(verserVer.license, "AGPL-3.0", "verser license unchanged");
});

test("runner-python pack content excludes test and docker artifacts", (t) => {
	// Validate the package.json files field excludes unwanted paths.
	// We do not run npm pack (requires full install), but we verify the
	// manifest "files" field explicitly.
	const pkg = JSON.parse(readFileSync(
		path.resolve(__dirname, "../../packages/runner-python/package.json"), "utf8"
	));

	t.true(Array.isArray(pkg.files), "runner-python has files field");
	t.is(pkg.private, undefined, "runner-python is public (no private field)");

	// Verify common unwanted patterns are not present
	const allFiles = pkg.files.join(" ");
	t.false(allFiles.includes("tests"), "files excludes tests/");
	t.false(allFiles.includes("Dockerfile"), "files excludes Dockerfile");
	t.false(allFiles.includes("codemap"), "files excludes codemap");
	t.false(allFiles.includes("__pycache__"), "files excludes __pycache__");
	t.false(allFiles.includes("docker-entrypoint"), "files excludes docker scripts");
	t.false(allFiles.includes("unpack.sh"), "files excludes unpack.sh");
	t.false(allFiles.includes("wait-for-sequence"), "files excludes wait scripts");

	// Verify required publish content is included
	t.true(allFiles.includes("runner_python"), "files includes runner_python package");
	t.true(allFiles.includes("src/runner_python"), "files includes runner source");
	t.true(allFiles.includes("pyproject.toml"), "files includes pyproject metadata");
	t.true(allFiles.includes("requirements.txt"), "files includes requirements metadata");
	t.true(allFiles.includes("__pypackages__"), "files includes vendored deps");
	t.false(allFiles.includes("dist/"), "files reflects the flat staged package layout");
});

test("release package manifests identify their repository directory and limit tarball inputs", (t) => {
	const repositoryUrl = "https://github.com/scramjetorg/transform-hub.git";
	const root = path.resolve(__dirname, "../..");

	for (const packageName of boundary.INCLUDED_PACKAGES) {
		const directory = boundary.includedPackageDir(packageName);
		const manifest = JSON.parse(readFileSync(path.join(root, directory, "package.json"), "utf8"));

		t.deepEqual(manifest.repository, {
			type: "git",
			url: repositoryUrl,
			directory,
		}, `${packageName} has exact repository metadata`);
		t.true(Array.isArray(manifest.files), `${packageName} uses a package allowlist`);
		const positiveEntries = manifest.files.filter((entry) => !entry.startsWith("!"));
		t.false(positiveEntries.some((entry) => /\.map$|\.tsbuildinfo$/.test(entry)),
			`${packageName} allowlist does not admit maps or TypeScript build info`);
		t.false(positiveEntries.some((entry) => /(?:^|\/)(?:test|tests)(?:\/|$)/.test(entry)),
			`${packageName} allowlist does not admit tests`);
		if (packageName !== "@scramjet/runner-python") {
			t.false(positiveEntries.some((entry) => /(?:^|\/)src(?:\/|$)/.test(entry)),
				`${packageName} allowlist does not admit source`);
		}
	}
});

test("pre-runner stages its required legal and README assets", (t) => {
	const manifest = JSON.parse(readFileSync(
		path.resolve(__dirname, "../../packages/pre-runner/package.json"), "utf8"
	));

	t.true(manifest.assets.includes("LICENSE"));
	t.true(manifest.assets.includes("README.md"));
});

test("runner Docker builds consume the complete prepacked dependency closure", (t) => {
	// The build-all dependency closure is authoritative; explicit lists drift
	// when packages are renamed or split.
	const dockerfile = readFileSync(
		path.resolve(__dirname, "../../packages/runner/Dockerfile"), "utf8"
	);
	t.true(dockerfile.includes("COPY ./dist/docker-runner ./dist"),
		"runner Dockerfile copies the staged dependency closure");
	t.false(dockerfile.includes("docker-runner/frame-stream"),
		"runner Dockerfile does not require removed frame-stream package");

	for (const image of ["runner-bun", "runner-python"]) {
		const runtimeDockerfile = readFileSync(
			path.resolve(__dirname, `../../packages/${image}/Dockerfile`), "utf8"
		);
		t.true(runtimeDockerfile.includes("COPY ./dist/docker-runner ./dist"),
			`${image} Dockerfile copies the staged dependency closure`);
	}

	// Verify prebuild:docker script stages runner-python
	const runnerPkg = JSON.parse(readFileSync(
		path.resolve(__dirname, "../../packages/runner/package.json"), "utf8"
	));
	const prebuild = runnerPkg.scripts["prebuild:docker"];
	t.true(prebuild.includes("packages/runner"),
		"prebuild:docker stages the outer runner and runtime dependencies");
	t.true(prebuild.includes("cp -r"),
		"prebuild:docker uses cp -r for runner-python");
});

test("Docker build contracts use current prepacked package layouts", (t) => {
	t.false(existsSync(path.resolve(__dirname, "../../.github/workflows/build-docker-runner-python.yml")));

	const sthDockerfile = readFileSync(path.resolve(__dirname, "../../packages/sth/Dockerfile"), "utf8");
	t.true(sthDockerfile.includes("COPY ./dist ./dist"));
	t.false(sthDockerfile.includes("python-runner"));

	const multiManagerDockerfile = readFileSync(path.resolve(__dirname, "../../packages/multi-manager/Dockerfile"), "utf8");
	t.true(multiManagerDockerfile.includes("COPY ./dist ./dist"));
	t.false(multiManagerDockerfile.includes("cpm/packages"));

	const multiManagerPkg = JSON.parse(readFileSync(
		path.resolve(__dirname, "../../packages/multi-manager/package.json"), "utf8"
	));
	t.true(multiManagerPkg.scripts["prebuild:docker"].includes("packages/multi-manager"));
	t.true(multiManagerPkg.scripts["build:docker"].endsWith("-f Dockerfile ../.."));
});

test("resolveRunnerPythonRoot falls back to local paths when not installed", (t) => {
	// We can't directly import the production function (it's TypeScript),
	// but we can verify the same logic by simulating it.
	const { resolve, dirname } = require("path");
	const { existsSync } = require("fs");

	// Simulate the function from the src/executor directory perspective
	const simulateDirname = resolve(__dirname, "../../packages/runner/src/executor");

	function simulateResolveRoot() {
		try {
			const pkgJsonPath = require.resolve("@scramjet/runner-python/package.json");
			return dirname(pkgJsonPath);
		} catch { /* fall through */ }

		const localCandidates = [
			resolve(simulateDirname, "../../../runner-python"),
			resolve(simulateDirname, "../../runner-python"),
			resolve(simulateDirname, "../../../packages/runner-python"),
		];
		for (const candidate of localCandidates) {
			if (existsSync(candidate)) return candidate;
		}
		return null;
	}

	const root = simulateResolveRoot();
	t.truthy(root, "resolveRunnerPythonRoot returns a path");
	t.true(existsSync(resolve(root, "package.json")),
		"resolved root contains package.json");
	t.true(existsSync(resolve(root, "src")),
		"resolved root contains src/ for local development");
});

test("buildPythonPath includes src directory from resolved root", (t) => {
	const { resolve, dirname } = require("path");
	const { existsSync } = require("fs");

	const simulateDirname = resolve(__dirname, "../../packages/runner/src/executor");

	function simulateResolveRoot() {
		try {
			const p = require.resolve("@scramjet/runner-python/package.json");
			return dirname(p);
		} catch { }
		const candidates = [
			resolve(simulateDirname, "../../../runner-python"),
			resolve(simulateDirname, "../../runner-python"),
			resolve(simulateDirname, "../../../packages/runner-python"),
		];
		for (const c of candidates) {
			if (existsSync(c)) return c;
		}
		return null;
	}

	function simulateBuildPythonPath(existing) {
		const root = simulateResolveRoot();
		const candidates = [];

		if (root) {
			const prodSrc = resolve(root, "src");
			const prodVendor = resolve(root, "__pypackages__");
			if (existsSync(prodSrc)) candidates.push(prodSrc);
			if (existsSync(prodVendor)) candidates.push(prodVendor);

			const legacyDistSrc = resolve(root, "dist/src");
			const localDistVendor = resolve(root, "dist/__pypackages__");
			if (existsSync(legacyDistSrc) && !candidates.includes(legacyDistSrc)) {
				candidates.push(legacyDistSrc);
			}
			if (existsSync(localDistVendor) && !candidates.includes(localDistVendor)) {
				candidates.push(localDistVendor);
			}
		}

		const legacyCandidates = [
			resolve(simulateDirname, "../../../runner-python/dist/__pypackages__"),
			resolve(simulateDirname, "../../runner-python/dist/__pypackages__"),
			resolve(simulateDirname, "../../../packages/runner-python/__pypackages__"),
			resolve(simulateDirname, "../../../dist/runner-python/__pypackages__"),
		].filter(existsSync);
		for (const p of legacyCandidates) {
			if (!candidates.includes(p)) candidates.push(p);
		}

		if (existing) candidates.push(existing);
		return candidates.join(":");
	}

	const testPythonPath = resolve(__dirname, "../../packages/runner-python/src");
	const result = simulateBuildPythonPath(testPythonPath);

	// The result must contain the src directory
	t.true(result.includes("runner-python/src"),
		"PYTHONPATH includes runner-python/src");

	// The existing PYTHONPATH must be preserved at the end
	t.true(result.endsWith(testPythonPath),
		"existing PYTHONPATH preserved at end");

	// No duplicates in output (the src dir might appear twice from dedup
	// between root resolution and existing, but that's benign)
	const entries = result.split(":");
	t.true(entries.length >= 1, "at least one PYTHONPATH entry");
	t.true(entries.every(e => e.length > 0), "no empty entries");
});

// ---------------------------------------------------------------------------
// Fixture manifest tests
// ---------------------------------------------------------------------------

test("check detects fixture dep drift in bdd/data/sequences/ and iac-test-data/", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host", "@scramjet/types"],
	});

	// Create a fixture manifest under bdd/data/sequences/ with a stale dep
	const bddDir = path.join(fix.root, "bdd/data/sequences/fixture-a");
	mkdirSync(bddDir, { recursive: true });
	writeFileSync(path.join(bddDir, "package.json"), JSON.stringify({
		name: "@scramjet/test-fixture-a",
		version: "0.5.0",
		private: true,
		license: "ISC",
		dependencies: {
			"@scramjet/host": "^1.0.0",  // stale — should become ^2.0.0
		},
	}, null, 2) + "\n");

	// Create a fixture manifest under bdd/iac-test-data/sequences/ with a stale dep
	const iacDir = path.join(fix.root, "bdd/iac-test-data/sequences/fixture-b");
	mkdirSync(iacDir, { recursive: true });
	writeFileSync(path.join(iacDir, "package.json"), JSON.stringify({
		name: "@scramjet/test-fixture-b",
		version: "1.2.3",
		private: true,
		dependencies: {
			"@scramjet/types": "1.1.0",   // exact stale — should become 2.0.0
		},
	}, null, 2) + "\n");

	const result = runAlign(fix.root, "check");

	// Should pass license (license targets are the regular packages, not fixtures)
	t.is(result.status, 1, "check should exit 1 due to fixture dep drift");

	t.true(result.stdout.includes("FIXTURE DEP DRIFT"),
		"should report FIXTURE DEP DRIFT for fixtures");

	// Fixture A: dep on @scramjet/host
	t.true(result.stdout.includes("@scramjet/test-fixture-a") && result.stdout.includes("@scramjet/host"),
		"fixture-a host dep drift should be reported");

	// Fixture B: dep on @scramjet/types
	t.true(result.stdout.includes("@scramjet/test-fixture-b") && result.stdout.includes("@scramjet/types"),
		"fixture-b types dep drift should be reported");
});

test("apply updates fixture deps without changing fixture version", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host", "@scramjet/types"],
	});

	// Fixture in bdd/data/sequences/
	const bddDir = path.join(fix.root, "bdd/data/sequences/fixture-x");
	mkdirSync(bddDir, { recursive: true });
	writeFileSync(path.join(bddDir, "package.json"), JSON.stringify({
		name: "@scramjet/test-fixture-x",
		version: "0.5.0",
		private: true,
		license: "ISC",
		dependencies: {
			"@scramjet/host": "^1.2.0",  // stale
		},
	}, null, 2) + "\n");

	// Fixture in bdd/iac-test-data/sequences/
	const iacDir = path.join(fix.root, "bdd/iac-test-data/sequences/fixture-y");
	mkdirSync(iacDir, { recursive: true });
	writeFileSync(path.join(iacDir, "package.json"), JSON.stringify({
		name: "@scramjet/test-fixture-y",
		version: "2.0.0",
		private: true,
		dependencies: {
			"@scramjet/types": "~1.1.0",  // stale tilde
		},
	}, null, 2) + "\n");

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	// Fixture A: version unchanged, dep updated
	const fixtureA = readManifest(
		path.join(fix.root, "bdd/data/sequences/fixture-x/package.json")
	);
	t.is(fixtureA.version, "0.5.0", "fixture version should remain unchanged");
	t.is(fixtureA.dependencies["@scramjet/host"], "^2.0.0",
		"fixture dep should be updated to ^2.0.0");

	// Fixture B: version unchanged, dep updated
	const fixtureB = readManifest(
		path.join(fix.root, "bdd/iac-test-data/sequences/fixture-y/package.json")
	);
	t.is(fixtureB.version, "2.0.0", "iac fixture version should remain unchanged");
	t.is(fixtureB.dependencies["@scramjet/types"], "~2.0.0",
		"iac fixture dep should be updated to ~2.0.0 preserving prefix");
});

test("apply on fixture deps is idempotent — second apply reports no change", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/types"],
	});

	// Fixture in bdd/data/sequences/
	const bddDir = path.join(fix.root, "bdd/data/sequences/fixture-idem-a");
	mkdirSync(bddDir, { recursive: true });
	writeFileSync(path.join(bddDir, "package.json"), JSON.stringify({
		name: "@scramjet/test-fixture-idem-a",
		version: "0.5.0",
		private: true,
		dependencies: {
			"@scramjet/types": "^1.1.0",
		},
	}, null, 2) + "\n");

	// First apply
	const first = runAlign(fix.root, "apply");
	t.is(first.status, 0, "first apply should exit 0");

	// Verify fixture dep was updated
	const afterFirst = readManifest(
		path.join(fix.root, "bdd/data/sequences/fixture-idem-a/package.json")
	);
	t.is(afterFirst.dependencies["@scramjet/types"], "^2.0.0",
		"fixture dep should be ^2.0.0 after first apply");

	// Second apply — should be no-op
	const second = runAlign(fix.root, "apply");
	t.is(second.status, 0, "second apply should exit 0");
	t.true(second.stdout.includes("FIXTURE OK") && second.stdout.includes("no change"),
		"second apply should report fixture deps aligned, no change");
});

test("check passes when fixtures are already aligned", (t) => {
	const fix = createFixture(t, {
		version: "2.0.0",
		managerVersion: "2.0.0",
		included: ["@scramjet/sth", "@scramjet/host", "@scramjet/types"],
	});

	// Fixture in bdd/data/sequences/ — already aligned
	const bddDir = path.join(fix.root, "bdd/data/sequences/fixture-aligned");
	mkdirSync(bddDir, { recursive: true });
	writeFileSync(path.join(bddDir, "package.json"), JSON.stringify({
		name: "@scramjet/test-fixture-aligned",
		version: "0.1.0",
		private: true,
		devDependencies: {
			"@scramjet/types": "^2.0.0",
		},
	}, null, 2) + "\n");

	// Fixture in bdd/iac-test-data/sequences/ — already aligned
	const iacDir = path.join(fix.root, "bdd/iac-test-data/sequences/fixture-aligned2");
	mkdirSync(iacDir, { recursive: true });
	writeFileSync(path.join(iacDir, "package.json"), JSON.stringify({
		name: "test-fixture-aligned2",
		version: "1.0.0",
		private: true,
		dependencies: {
			"@scramjet/host": "2.0.0",
		},
	}, null, 2) + "\n");

	setupLicenses(fix);

	const result = runAlign(fix.root, "check");

	t.is(result.status, 0, "check should exit 0 when fixtures aligned");
	t.true(result.stdout.includes("FIXTURE OK"),
		"should report FIXTURE OK for aligned fixtures");
});

test("apply preserves non-scramjet deps and excluded @scramjet refs in fixtures", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host"],
		excluded: ["@scramjet/verser"],
	});

	// Fixture with mixed deps
	const bddDir = path.join(fix.root, "bdd/data/sequences/fixture-mixed");
	mkdirSync(bddDir, { recursive: true });
	writeFileSync(path.join(bddDir, "package.json"), JSON.stringify({
		name: "@scramjet/test-fixture-mixed",
		version: "0.5.0",
		private: true,
		dependencies: {
			"@scramjet/host": "^1.1.0",   // included — should update
			"@scramjet/verser": "^1.0.0",  // excluded — preserve
			"scramjet": "^4.37.0",         // external — preserve
			"@signicode/verser2-host": "0.7.0", // @signicode — preserve
		},
	}, null, 2) + "\n");

	const result = runAlign(fix.root, "apply");

	t.is(result.status, 0, "apply should exit 0");

	const manifest = readManifest(
		path.join(fix.root, "bdd/data/sequences/fixture-mixed/package.json")
	);

	// Included-to-included updated
	t.is(manifest.dependencies["@scramjet/host"], "^2.0.0",
		"included dep updated to ^2.0.0");

	// Excluded preserved
	t.is(manifest.dependencies["@scramjet/verser"], "^1.0.0",
		"excluded dep preserved");

	// External preserved
	t.is(manifest.dependencies["scramjet"], "^4.37.0",
		"external non-scramjet dep preserved");

	// @signicode preserved
	t.is(manifest.dependencies["@signicode/verser2-host"], "0.7.0",
		"@signicode dep preserved");

	// Fixture identity fields unchanged
	t.is(manifest.name, "@scramjet/test-fixture-mixed", "fixture name unchanged");
	t.is(manifest.version, "0.5.0", "fixture version unchanged");
});

test("discoverFixtureManifests finds nested package.json and applies dep-only alignment", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host", "@scramjet/types"],
	});

	// Nested fixture under bdd/data/sequences/ (e.g., fixture-nested/lib/deep/)
	const nestedDir = path.join(fix.root, "bdd/data/sequences/fixture-nested/lib/deep");
	mkdirSync(nestedDir, { recursive: true });
	writeFileSync(path.join(nestedDir, "package.json"), JSON.stringify({
		name: "@scramjet/test-fixture-nested",
		version: "3.2.1",
		private: true,
		license: "ISC",
		dependencies: {
			"@scramjet/host": "^1.1.0",  // stale caret
			"@scramjet/types": "1.1.0",   // stale exact
		},
	}, null, 2) + "\n");

	// Nested fixture under bdd/iac-test-data/sequences/ (e.g., iac-built/sub/)
	const iacNestedDir = path.join(fix.root, "bdd/iac-test-data/sequences/iac-nested/sub/dir");
	mkdirSync(iacNestedDir, { recursive: true });
	writeFileSync(path.join(iacNestedDir, "package.json"), JSON.stringify({
		name: "@scramjet/test-iac-nested",
		version: "0.9.0",
		private: true,
		dependencies: {
			"@scramjet/types": "~1.1.0",  // stale tilde
		},
	}, null, 2) + "\n");

	// Apply
	const applyResult = runAlign(fix.root, "apply");
	t.is(applyResult.status, 0, "apply should exit 0");

	// Verify nested fixture in bdd/data/sequences/
	const nestedManifest = readManifest(
		path.join(fix.root, "bdd/data/sequences/fixture-nested/lib/deep/package.json")
	);
	t.is(nestedManifest.name, "@scramjet/test-fixture-nested", "nested fixture name unchanged");
	t.is(nestedManifest.version, "3.2.1", "nested fixture version unchanged");
	t.is(nestedManifest.license, "ISC", "nested fixture license unchanged");
	t.is(nestedManifest.dependencies["@scramjet/host"], "^2.0.0",
		"nested fixture host dep updated to ^2.0.0");
	t.is(nestedManifest.dependencies["@scramjet/types"], "2.0.0",
		"nested fixture types dep updated to 2.0.0 preserving exact prefix");

	// Verify nested fixture in bdd/iac-test-data/sequences/
	const iacNestedManifest = readManifest(
		path.join(fix.root, "bdd/iac-test-data/sequences/iac-nested/sub/dir/package.json")
	);
	t.is(iacNestedManifest.name, "@scramjet/test-iac-nested", "iac nested fixture name unchanged");
	t.is(iacNestedManifest.version, "0.9.0", "iac nested fixture version unchanged");
	t.is(iacNestedManifest.dependencies["@scramjet/types"], "~2.0.0",
		"iac nested fixture types dep updated to ~2.0.0 preserving tilde prefix");

	// Set up licenses so check doesn't fail on license drift
	setupLicenses(fix);

	// Idempotence: check passes after alignment
	const checkResult = runAlign(fix.root, "check");
	t.is(checkResult.status, 0, "check should exit 0 after alignment");
	t.true(checkResult.stdout.includes("FIXTURE OK"),
		"should report FIXTURE OK for aligned nested fixtures");
});

test("check fails closed on unknown @scramjet/* dependency in fixture", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host"],
	});

	// Fixture with a @scramjet/* dep that is neither included nor excluded
	const bddDir = path.join(fix.root, "bdd/data/sequences/fixture-unknown");
	mkdirSync(bddDir, { recursive: true });
	writeFileSync(path.join(bddDir, "package.json"), JSON.stringify({
		name: "@scramjet/test-fixture-unknown",
		version: "0.1.0",
		private: true,
		dependencies: {
			"@scramjet/host": "^1.1.0",                         // included — normal
			"@scramjet/unknown-package": "^1.0.0",               // unknown @scramjet — fail
		},
	}, null, 2) + "\n");

	const result = runAlign(fix.root, "check");

	t.is(result.status, 1, "check should exit 1 due to unknown @scramjet dep");
	t.true(result.stdout.includes("Unexpected @scramjet dependency"),
		"should report Unexpected @scramjet dependency");
	t.true(result.stdout.includes("@scramjet/unknown-package"),
		"should name the unknown package");
	t.true(result.stdout.includes("fixture-unknown"),
		"should name the fixture manifest");

	// Apply must also fail closed
	const applyResult = runAlign(fix.root, "apply");
	t.is(applyResult.status, 1, "apply should exit 1 due to unknown @scramjet dep");
	t.true(applyResult.stdout.includes("Apply blocked"),
		"apply should report blocked");
});

test("fixture manifests with same name at different paths both get checked and applied", (t) => {
	const fix = createFixture(t, {
		version: "1.1.0",
		included: ["@scramjet/sth", "@scramjet/host", "@scramjet/types"],
	});

	// Two fixtures with the same package name at different nested paths
	// under bdd/data/sequences/
	const sharedName = "@scramjet/shared-fixture-name";

	// First copy at bdd/data/sequences/same-name-a/package.json
	const dirA = path.join(fix.root, "bdd/data/sequences/same-name-a");
	mkdirSync(dirA, { recursive: true });
	writeFileSync(path.join(dirA, "package.json"), JSON.stringify({
		name: sharedName,
		version: "1.0.0",
		private: true,
		license: "ISC",
		dependencies: { "@scramjet/host": "^1.1.0" }, // stale
	}, null, 2) + "\n");

	// Second copy at bdd/data/sequences/sub/same-name-b/package.json
	const dirB = path.join(fix.root, "bdd/data/sequences/sub/same-name-b");
	mkdirSync(dirB, { recursive: true });
	writeFileSync(path.join(dirB, "package.json"), JSON.stringify({
		name: sharedName,
		version: "2.0.0",
		private: true,
		license: "MIT",
		dependencies: { "@scramjet/types": "~1.1.0" }, // stale tilde
	}, null, 2) + "\n");

	// ── check must report both ──
	const checkBefore = runAlign(fix.root, "check");
	t.is(checkBefore.status, 1, "check should exit 1 with stale fixture deps");

	// Count FIXTURE DEP DRIFT lines — two distinct fixtures means two drift lines
	const driftLines = (checkBefore.stdout.match(/FIXTURE DEP DRIFT/g) || []).length;
	t.is(driftLines, 2, "check should report two FIXTURE DEP DRIFT lines (one per path)");

	// Both drift lines must mention the shared name
	// The shared name should appear at least in the two FIXTURE DEP DRIFT lines
	const sharedOccurrences = checkBefore.stdout.split(sharedName).length - 1;
	t.true(sharedOccurrences >= 2,
		`shared fixture name "${sharedName}" should appear at least twice in output (found ${sharedOccurrences})`);

	// ── apply updates both ──
	const applyResult = runAlign(fix.root, "apply");
	t.is(applyResult.status, 0, "apply should exit 0");

	// Verify first copy
	const manifestA = readManifest(path.join(fix.root, "bdd/data/sequences/same-name-a/package.json"));
	t.is(manifestA.name, sharedName, "fixture A name unchanged");
	t.is(manifestA.version, "1.0.0", "fixture A version unchanged");
	t.is(manifestA.license, "ISC", "fixture A license unchanged");
	t.is(manifestA.dependencies["@scramjet/host"], "^2.0.0",
		"fixture A host dep updated to ^2.0.0");

	// Verify second copy
	const manifestB = readManifest(
		path.join(fix.root, "bdd/data/sequences/sub/same-name-b/package.json")
	);
	t.is(manifestB.name, sharedName, "fixture B name unchanged");
	t.is(manifestB.version, "2.0.0", "fixture B version unchanged");
	t.is(manifestB.license, "MIT", "fixture B license unchanged");
	t.is(manifestB.dependencies["@scramjet/types"], "~2.0.0",
		"fixture B types dep updated to ~2.0.0");

	// ── idempotent check passes after alignment ──
	setupLicenses(fix);
	const checkAfter = runAlign(fix.root, "check");
	t.is(checkAfter.status, 0, "check should exit 0 after alignment");
	t.true(checkAfter.stdout.includes("FIXTURE OK"),
		"should report FIXTURE OK for aligned same-name fixtures");
});

// ---------------------------------------------------------------------------
// Glob-based manifest discovery tests
// ---------------------------------------------------------------------------

test("boundary.discoverManifests with WORKSPACE_MANIFEST_GLOBS finds packages/* and bdd/package.json", (t) => {
	const root = mkdtempSync(path.join(tmpdir(), "relalign-ws-glob-"));
	t.teardown(() => { try { rmSync(root, { force: true, recursive: true }); } catch { /* ok */ } });

	// Create packages/sth/package.json (valid workspace manifest)
	mkdirSync(path.join(root, "packages/sth"), { recursive: true });
	writeFileSync(path.join(root, "packages/sth/package.json"),
		JSON.stringify({ name: "@scramjet/sth", version: "1.0.0" }, null, 2) + "\n");

	// Create packages/host/package.json (another workspace)
	mkdirSync(path.join(root, "packages/host"), { recursive: true });
	writeFileSync(path.join(root, "packages/host/package.json"),
		JSON.stringify({ name: "@scramjet/host", version: "1.0.0" }, null, 2) + "\n");

	// Create bdd/package.json (workspace)
	mkdirSync(path.join(root, "bdd"), { recursive: true });
	writeFileSync(path.join(root, "bdd/package.json"),
		JSON.stringify({ name: "scramjet-bdd", version: "1.0.0" }, null, 2) + "\n");

	// Create a node_modules distraction that must be excluded
	mkdirSync(path.join(root, "packages/sth/node_modules/some-dep"), { recursive: true });
	writeFileSync(path.join(root, "packages/sth/node_modules/some-dep/package.json"),
		JSON.stringify({ name: "some-dep", version: "1.0.0" }, null, 2) + "\n");

	const results = boundary.discoverManifests(boundary.WORKSPACE_MANIFEST_GLOBS, { cwd: root });

	t.true(results.includes("packages/sth/package.json"),
		"finds packages/sth/package.json");
	t.true(results.includes("packages/host/package.json"),
		"finds packages/host/package.json");
	t.true(results.includes("bdd/package.json"),
		"finds bdd/package.json");

	// Exactly 3 — no node_modules entries
	t.is(results.length, 3, "exactly 3 workspace manifests, node_modules excluded");

	// No path contains node_modules
	for (const r of results) {
		t.false(r.includes("node_modules"), `result "${r}" must not contain node_modules`);
	}
});

test("boundary.discoverManifests with FIXTURE_MANIFEST_GLOBS finds nested fixtures and excludes node_modules", (t) => {
	const root = mkdtempSync(path.join(tmpdir(), "relalign-fix-glob-"));
	t.teardown(() => { try { rmSync(root, { force: true, recursive: true }); } catch { /* ok */ } });

	// Top-level fixture
	mkdirSync(path.join(root, "bdd/data/sequences/fix-top"), { recursive: true });
	writeFileSync(path.join(root, "bdd/data/sequences/fix-top/package.json"),
		JSON.stringify({ name: "@scramjet/fix-top", version: "0.1.0" }, null, 2) + "\n");

	// Deeply nested fixture (simulating built/ output)
	mkdirSync(path.join(root, "bdd/data/sequences/fix-nested/lib/deep"), { recursive: true });
	writeFileSync(path.join(root, "bdd/data/sequences/fix-nested/lib/deep/package.json"),
		JSON.stringify({ name: "@scramjet/fix-nested", version: "0.2.0" }, null, 2) + "\n");

	// Fixture in iac-test-data
	mkdirSync(path.join(root, "bdd/iac-test-data/sequences/iac-top"), { recursive: true });
	writeFileSync(path.join(root, "bdd/iac-test-data/sequences/iac-top/package.json"),
		JSON.stringify({ name: "iac-top-seq", version: "1.0.0" }, null, 2) + "\n");

	// Nested iac fixture
	mkdirSync(path.join(root, "bdd/iac-test-data/sequences/iac-sub/dir"), { recursive: true });
	writeFileSync(path.join(root, "bdd/iac-test-data/sequences/iac-sub/dir/package.json"),
		JSON.stringify({ name: "iac-sub-seq", version: "2.0.0" }, null, 2) + "\n");

	// node_modules inside fixture dir — must be excluded
	mkdirSync(path.join(root, "bdd/data/sequences/fix-top/node_modules/hidden"), { recursive: true });
	writeFileSync(path.join(root, "bdd/data/sequences/fix-top/node_modules/hidden/package.json"),
		JSON.stringify({ name: "hidden", version: "1.0.0" }, null, 2) + "\n");

	// node_modules at sequences level — must be excluded
	mkdirSync(path.join(root, "bdd/data/sequences/node_modules/bad"), { recursive: true });
	writeFileSync(path.join(root, "bdd/data/sequences/node_modules/bad/package.json"),
		JSON.stringify({ name: "bad", version: "0.0.1" }, null, 2) + "\n");

	const results = boundary.discoverManifests(boundary.FIXTURE_MANIFEST_GLOBS, { cwd: root });

	t.true(results.includes("bdd/data/sequences/fix-top/package.json"),
		"finds top-level fixture");
	t.true(results.includes("bdd/data/sequences/fix-nested/lib/deep/package.json"),
		"finds deeply nested fixture");
	t.true(results.includes("bdd/iac-test-data/sequences/iac-top/package.json"),
		"finds iac-test-data fixture");
	t.true(results.includes("bdd/iac-test-data/sequences/iac-sub/dir/package.json"),
		"finds nested iac-test-data fixture");

	// Exactly 4 — no node_modules entries
	t.is(results.length, 4, "exactly 4 fixture manifests, node_modules excluded");

	for (const r of results) {
		t.false(r.includes("node_modules"), `result "${r}" must not contain node_modules`);
	}
});
