#!/usr/bin/env node

/**
 * @file scripts/release-align.js
 *
 * Release-alignment workflow for the 2.0.0 Transform Hub release.
 *
 * Modes:
 *   check    – validate alignment without any writes; exit 0 if aligned,
 *              exit 1 with a report of all drift.
 *   dry-run  – compute and print the full change plan without modifying
 *              any file.
 *   apply    – execute the change plan: update root package.json version,
 *              included workspace versions, included-to-included dependency
 *              ranges, and static image references.
 *
 * Usage:
 *   node scripts/release-align.js <mode>
 *
 * The tool uses the shared boundary module (scripts/lib/release-boundary.js)
 * for inclusion rules, exclusion invariants, and target version.
 *
 * @see scripts/lib/release-boundary.js
 */

"use strict";

const fs = require("fs");
const path = require("path");
const {
	RELEASE_VERSION,
	INCLUDED_PACKAGES,
	IMAGE_CONFIG_PATH,
	isIncluded,
	isExcluded,
	isScramjet,
	isSignicode,
	dependencySections,
	getRangePrefix,
	expectedVersion,
	expectedWorkspacePackages,
	expectedWorkspaceRelease,
	includedPackageDirs,
} = require("./lib/release-boundary");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Repository root directory.  Override via SCRAMJET_RELEASE_ROOT env var
 * (used by tests that set up temporary fixture workspaces).
 */
const ROOT_DIR = process.env.SCRAMJET_RELEASE_ROOT
	? path.resolve(process.env.SCRAMJET_RELEASE_ROOT)
	: path.resolve(__dirname, "..");

/**
 * Read and parse a JSON file.
 * @param {string} filePath absolute path
 * @returns {object}
 */
function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * Stringify JSON with 2-space indent and trailing newline (matching repo style).
 * @param {object} obj
 * @returns {string}
 */
function formatJson(obj) {
	return JSON.stringify(obj, null, 2) + "\n";
}

/**
 * Write a JSON file atomically (to a temp then rename).
 * @param {string} filePath
 * @param {object} obj
 */
function writeJson(filePath, obj) {
	const tmp = filePath + ".tmp";
	fs.writeFileSync(tmp, formatJson(obj), "utf8");
	fs.renameSync(tmp, filePath);
}

/**
 * Read image-config.ts content.
 * @returns {string}
 */
function readImageConfig() {
	const p = path.resolve(ROOT_DIR, IMAGE_CONFIG_PATH);
	return fs.readFileSync(p, "utf8");
}

/**
 * Write image-config.ts content.
 * @param {string} content
 */
function writeImageConfig(content) {
	const p = path.resolve(ROOT_DIR, IMAGE_CONFIG_PATH);
	const tmp = p + ".tmp";
	fs.writeFileSync(tmp, content, "utf8");
	fs.renameSync(tmp, p);
}

/**
 * Replace image tags in image-config.ts content.
 * Replaces `:CURRENT_VER"` patterns with `:NEW_VER"` for all runner images.
 * @param {string} content
 * @param {string} newVersion
 * @returns {{ content: string, changed: boolean }}
 */
function updateImageTags(content, newVersion) {
	const re = /(scramjetorg\/[-\w]+):([\d.]+)"/g;
	let match;
	let result = content;
	let changed = false;

	while ((match = re.exec(content)) !== null) {
		if (match[2] !== newVersion) {
			result = result.replace(match[0], `${match[1]}:${newVersion}"`);
			changed = true;
		}
	}

	return { content: result, changed };
}

/**
 * Validate the root workspaces groups against the discovered workspace
 * packages and the release boundary.  Returns an array of error strings
 * (empty if valid).
 *
 * Rules:
 * - workspaces.packages and workspaces.release must exist as arrays.
 * - For every included discovered package, its dir must be in both groups.
 * - No excluded-package dir may appear in either group.
 * - workspaces.release must be identical to workspaces.packages.
 *
 * @param {object} rootManifest the parsed root package.json
 * @param {Map<string,object>} discoveredPackages map of name -> pkgInfo
 * @returns {string[]}
 */
function checkWorkspaceGroups(rootManifest, discoveredPackages) {
	const errors = [];
	const ws = rootManifest.workspaces;
	if (!ws || typeof ws !== "object") {
		errors.push("WORKSPACE GROUP DRIFT: root package.json has no workspaces field");
		return errors;
	}

	const actualPkgs = ws.packages;
	if (!actualPkgs || !Array.isArray(actualPkgs)) {
		errors.push("WORKSPACE GROUP DRIFT: workspaces.packages is missing or not an array");
	}

	const actualRelease = ws.release;
	if (!actualRelease || !Array.isArray(actualRelease)) {
		errors.push("WORKSPACE GROUP DRIFT: workspaces.release is missing or not an array");
	}

	// If both exist, verify they are identical
	if (Array.isArray(actualPkgs) && Array.isArray(actualRelease)) {
		const sortedPkgs = [...actualPkgs].sort();
		const sortedRelease = [...actualRelease].sort();
		if (JSON.stringify(sortedPkgs) !== JSON.stringify(sortedRelease)) {
			errors.push(
				"WORKSPACE GROUP DRIFT: workspaces.release does not match workspaces.packages.\n" +
				`  packages (${sortedPkgs.length}): ${JSON.stringify(sortedPkgs)}\n` +
				`  release (${sortedRelease.length}):  ${JSON.stringify(sortedRelease)}`
			);
		}
	}

	// Validate each discovered included package has its dir in both groups
	for (const [name, pkgInfo] of discoveredPackages) {
		if (!pkgInfo.isIncluded) continue;
		const pkgDir = "packages/" + name.replace("@scramjet/", "");

		if (Array.isArray(actualPkgs) && !actualPkgs.includes(pkgDir)) {
			errors.push(
				`WORKSPACE GROUP DRIFT: included package "${name}" dir "${pkgDir}" ` +
				`is missing from workspaces.packages`
			);
		}
		if (Array.isArray(actualRelease) && !actualRelease.includes(pkgDir)) {
			errors.push(
				`WORKSPACE GROUP DRIFT: included package "${name}" dir "${pkgDir}" ` +
				`is missing from workspaces.release`
			);
		}
	}

	// Validate no excluded dirs are in either group
	const excludedDirs = new Set();
	for (const [name, pkgInfo] of discoveredPackages) {
		if (!pkgInfo.isExcluded) continue;
		const pkgDir = name === "scramjet-bdd" ? "bdd" : "packages/" + name.replace("@scramjet/", "");
		excludedDirs.add(pkgDir);
	}
	// Also check the known static excluded dirs
	for (const exName of ["@scramjet/verser", "@scramjet/bpmux", "@scramjet/frame-stream", "@scramjet/runner-python"]) {
		excludedDirs.add("packages/" + exName.replace("@scramjet/", ""));
	}
	excludedDirs.add("bdd");

	for (const edir of excludedDirs) {
		if (Array.isArray(actualPkgs) && actualPkgs.includes(edir)) {
			errors.push(
				`WORKSPACE GROUP DRIFT: excluded dir "${edir}" found in workspaces.packages`
			);
		}
		if (Array.isArray(actualRelease) && actualRelease.includes(edir)) {
			errors.push(
				`WORKSPACE GROUP DRIFT: excluded dir "${edir}" found in workspaces.release`
			);
		}
	}

	return errors;
}

/**
 * Find all workspace package.json paths (packages/* and bdd/).
 * @returns {Array<{ name: string, filePath: string, manifest: object }>}
 */
function discoverWorkspacePackages() {
	const results = [];
	const packagesDir = path.resolve(ROOT_DIR, "packages");

	for (const dir of fs.readdirSync(packagesDir)) {
		const pkgPath = path.join(packagesDir, dir, "package.json");
		if (!fs.existsSync(pkgPath)) continue;
		const manifest = readJson(pkgPath);
		if (manifest.name) {
			results.push({ name: manifest.name, filePath: pkgPath, manifest });
		}
	}

	// bdd/ workspace
	const bddPath = path.resolve(ROOT_DIR, "bdd", "package.json");
	if (fs.existsSync(bddPath)) {
		const manifest = readJson(bddPath);
		if (manifest.name) {
			results.push({ name: manifest.name, filePath: bddPath, manifest });
		}
	}

	return results;
}

// ---------------------------------------------------------------------------
// Change Plan
// ---------------------------------------------------------------------------

/**
 * Compute the complete change plan without modifying any files.
 * Returns an object with:
 *   - rootVersion: { current, expected, changed }
 *   - packages: Map<name, { filePath, manifest, versionChange, depChanges[], imageChange? }>
 *   - imageConfig: { currentPath, changed, changes[] }
 *   - errors: string[] (drift / validation failures)
 */
function computeChangePlan() {
	const errors = [];
	const plan = {
		rootVersion: { current: null, expected: RELEASE_VERSION, changed: false },
		packages: new Map(),
		imageConfig: { changed: false, changes: [] },
		errors,
	};

	// --- Root package.json ---
	const rootPath = path.resolve(ROOT_DIR, "package.json");
	const rootManifest = readJson(rootPath);
	plan.rootVersion.current = rootManifest.version;
	plan.rootVersion.changed = rootManifest.version !== RELEASE_VERSION;

	// --- Workspace packages ---
	const workspaces = discoverWorkspacePackages();

	for (const { name, filePath, manifest } of workspaces) {
		const pkgInfo = {
			filePath,
			manifest,
			name,
			versionChange: null,
			depChanges: [],
			isIncluded: isIncluded(name),
			isExcluded: isExcluded(name),
		};

		if (isIncluded(name)) {
			const expected = expectedVersion(name);
			if (manifest.version !== expected) {
				pkgInfo.versionChange = { from: manifest.version, to: expected };
			}

			// Scan dependency sections for included-to-included references
			for (const section of dependencySections()) {
				const deps = manifest[section];
				if (!deps || typeof deps !== "object") continue;

				for (const [depName, depRange] of Object.entries(deps)) {
					if (!isScramjet(depName)) continue; // external
					if (isExcluded(depName)) continue; // excluded invariant

					// At this point depName is a @scramjet/* package that is either
					// included or unknown (shouldn't happen but be safe)
					if (!isIncluded(depName)) {
						errors.push(
							`Unexpected @scramjet dependency "${depName}" in "${name}" ` +
							`— not in included or excluded sets`
						);
						continue;
					}

					const depExpected = expectedVersion(depName);
					const prefix = getRangePrefix(depRange);
					const expectedRange = prefix + depExpected;

					if (depRange !== expectedRange) {
						pkgInfo.depChanges.push({
							section,
							depName,
							from: depRange,
							to: expectedRange,
						});
					}
				}
			}

			// Validate no excluded-package range changes for the boundary:
			// if an included package references an excluded package, that
			// reference must NOT be modified. We check that the current range
			// hasn't drifted to a 2.0.0 value already (it shouldn't).
			for (const section of dependencySections()) {
				const deps = manifest[section];
				if (!deps || typeof deps !== "object") continue;
				for (const [depName, depRange] of Object.entries(deps)) {
					if (isExcluded(depName)) {
						// Check the excluded dep hasn't been mutated to a 2.0.0 range
						const verPart = depRange.replace(/^[\^~]/, "");
						if (verPart === RELEASE_VERSION) {
							errors.push(
								`EXCLUDED BOUNDARY VIOLATION: "${name}" has excluded dep ` +
								`"${depName}" at "${depRange}" which matches target version ` +
								`${RELEASE_VERSION} — excluded packages must not be aligned`
							);
						}
					}
				}
			}
		} else if (isExcluded(name)) {
			// Excluded packages are invariants — check they haven't drifted
			if (manifest.version === RELEASE_VERSION) {
				errors.push(
					`EXCLUDED BOUNDARY VIOLATION: excluded package "${name}" ` +
					`has version "${manifest.version}" matching target — ` +
					`excluded packages must not be aligned`
				);
			}
		}
		// Packages neither included nor excluded (external workspaces) — skip

		plan.packages.set(name, pkgInfo);
	}

	// Validate workspace groups against the release boundary
	const wsErrors = checkWorkspaceGroups(rootManifest, plan.packages);
	for (const err of wsErrors) {
		errors.push(err);
	}

	// --- Image config ---
	const imageConfigPath = path.resolve(ROOT_DIR, IMAGE_CONFIG_PATH);
	if (fs.existsSync(imageConfigPath)) {
		const imgContent = fs.readFileSync(imageConfigPath, "utf8");
		const { content: updatedContent, changed } = updateImageTags(imgContent, RELEASE_VERSION);
		plan.imageConfig.changed = changed;
		if (changed) {
			// Collect individual changes
			const re = /(scramjetorg\/[-\w]+):([\d.]+)"/g;
			let m;
			while ((m = re.exec(imgContent)) !== null) {
				plan.imageConfig.changes.push({ image: m[1], from: m[2], to: RELEASE_VERSION });
			}
		}
		plan.imageConfig.currentContent = imgContent;
		plan.imageConfig.updatedContent = updatedContent;
	} else {
		errors.push(`Image config not found at ${IMAGE_CONFIG_PATH}`);
	}

	return plan;
}

// ---------------------------------------------------------------------------
// Check Mode
// ---------------------------------------------------------------------------

/**
 * Run check mode — validate alignment without writing.
 * Returns { ok: boolean, errors: string[], reportLines: string[] }
 */
function check() {
	const plan = computeChangePlan();
	const lines = [];
	let hasDrift = false;

	// Root version
	if (plan.rootVersion.changed) {
		lines.push(
			`ROOT VERSION DRIFT: ${plan.rootVersion.current} → expected ${plan.rootVersion.expected}`
		);
		hasDrift = true;
	} else {
		lines.push(`ROOT VERSION: ${plan.rootVersion.current} OK`);
	}

	// Packages
	for (const [, pkg] of plan.packages) {
		if (pkg.isExcluded) {
			lines.push(`EXCLUDED: ${pkg.name}@${pkg.manifest.version} (preserved)`);
			continue;
		}
		if (!pkg.isIncluded) {
			lines.push(`SKIPPED: ${pkg.name}@${pkg.manifest.version} (not in boundary)`);
			continue;
		}

		if (pkg.versionChange) {
			lines.push(
				`VERSION DRIFT: ${pkg.name} ${pkg.versionChange.from} → ${pkg.versionChange.to}`
			);
			hasDrift = true;
		} else {
			lines.push(`VERSION OK: ${pkg.name}@${pkg.manifest.version}`);
		}

		for (const dc of pkg.depChanges) {
			lines.push(
				`DEP DRIFT: ${pkg.name} → ${dc.depName} (${dc.section}): ${dc.from} → ${dc.to}`
			);
			hasDrift = true;
		}
	}

	// Image config
	if (plan.imageConfig.changed) {
		for (const c of plan.imageConfig.changes) {
			lines.push(`IMAGE TAG DRIFT: ${c.image}: ${c.from} → ${c.to}`);
			hasDrift = true;
		}
	} else {
		lines.push(`IMAGE CONFIG: tags already at ${RELEASE_VERSION}`);
	}

	// Errors (boundary violations etc.)
	for (const err of plan.errors) {
		lines.push(`ERROR: ${err}`);
		hasDrift = true;
	}

	return { ok: !hasDrift, errors: plan.errors, reportLines: lines };
}

// ---------------------------------------------------------------------------
// Dry-Run Mode
// ---------------------------------------------------------------------------

/**
 * Compute and print the change plan without making any modifications.
 */
function dryRun() {
	const plan = computeChangePlan();
	const lines = [];

	lines.push(`=== Release Alignment Plan (dry-run) ===`);
	lines.push(`Target version: ${RELEASE_VERSION}`);
	lines.push("");

	// Root
	if (plan.rootVersion.changed) {
		lines.push(`Root package.json: ${plan.rootVersion.current} → ${plan.rootVersion.expected}`);
	} else {
		lines.push(`Root package.json: already at ${plan.rootVersion.current} (no change)`);
	}
	lines.push("");

	// Included packages
	let changedCount = 0;
	for (const [, pkg] of plan.packages) {
		if (!pkg.isIncluded || pkg.isExcluded) continue;

		if (pkg.versionChange) {
			lines.push(`${pkg.name}: ${pkg.versionChange.from} → ${pkg.versionChange.to}`);
			changedCount++;
		}

		for (const dc of pkg.depChanges) {
			lines.push(`  ${dc.section}.${dc.depName}: ${dc.from} → ${dc.to}`);
		}
	}

	if (changedCount === 0) {
		lines.push("(no package version changes)");
	}
	lines.push("");

	// Image config
	if (plan.imageConfig.changed) {
		lines.push(`Image config (${IMAGE_CONFIG_PATH}):`);
		for (const c of plan.imageConfig.changes) {
			lines.push(`  ${c.image}: ${c.from} → ${c.to}`);
		}
	} else {
		lines.push(`Image config: no changes needed`);
	}
	lines.push("");

	// Excluded invariants summary
	const excludedNames = [];
	for (const [, pkg] of plan.packages) {
		if (pkg.isExcluded) {
			excludedNames.push(`${pkg.name}@${pkg.manifest.version}`);
		}
	}
	if (excludedNames.length > 0) {
		lines.push(`Excluded packages (preserved): ${excludedNames.join(", ")}`);
	}

	// Errors
	if (plan.errors.length > 0) {
		lines.push("");
		lines.push("WARNINGS / ERRORS:");
		for (const err of plan.errors) {
			lines.push(`  ${err}`);
		}
	}

	lines.push("");
	lines.push("(dry-run — no files were modified)");

	console.log(lines.join("\n"));
}

// ---------------------------------------------------------------------------
// Apply Mode
// ---------------------------------------------------------------------------

/**
 * Execute the change plan — write all aligned files.
 * Returns { ok, reportLines, errors }.
 */
function applyChanges() {
	const plan = computeChangePlan();
	const report = [];
	const errors = [...plan.errors];
	let modified = 0;

	// Fail closed: boundary/validation errors prevent any write.
	if (errors.length > 0) {
		report.push("Apply blocked — validation errors detected:");
		for (const err of errors) {
			report.push(`  ${err}`);
		}
		return { ok: false, modified: 0, reportLines: report, errors };
	}

	// 1. Root package.json
	if (plan.rootVersion.changed) {
		const rootPath = path.resolve(ROOT_DIR, "package.json");
		const rootManifest = readJson(rootPath);
		rootManifest.version = RELEASE_VERSION;
		writeJson(rootPath, rootManifest);
		report.push(`Root package.json: ${plan.rootVersion.current} → ${RELEASE_VERSION}`);
		modified++;
	} else {
		report.push(`Root package.json: already at ${RELEASE_VERSION} (no change)`);
	}

	// 2. Workspace packages
	for (const [, pkg] of plan.packages) {
		if (!pkg.isIncluded) continue;

		let pkgChanged = false;
		const manifest = readJson(pkg.filePath);

		// Version
		if (pkg.versionChange) {
			manifest.version = RELEASE_VERSION;
			pkgChanged = true;
		}

		// Dependencies
		for (const dc of pkg.depChanges) {
			if (manifest[dc.section] && dc.depName in manifest[dc.section]) {
				manifest[dc.section][dc.depName] = dc.to;
				pkgChanged = true;
			}
		}

		if (pkgChanged) {
			writeJson(pkg.filePath, manifest);
			report.push(
				`${pkg.name}: ${pkg.versionChange ? pkg.versionChange.from + " → " + RELEASE_VERSION : "version unchanged"}`
			);
			for (const dc of pkg.depChanges) {
				report.push(`  ${dc.section}.${dc.depName}: ${dc.from} → ${dc.to}`);
			}
			modified++;
		}
	}

	// 3. Image config
	if (plan.imageConfig.changed) {
		writeImageConfig(plan.imageConfig.updatedContent);
		for (const c of plan.imageConfig.changes) {
			report.push(`Image ${c.image}: ${c.from} → ${RELEASE_VERSION}`);
		}
		modified++;
	} else {
		report.push(`Image config: already at ${RELEASE_VERSION} (no change)`);
	}

	// 4. Excluded summary
	const excludedNames = [];
	for (const [, pkg] of plan.packages) {
		if (pkg.isExcluded) {
			excludedNames.push(`${pkg.name}@${pkg.manifest.version}`);
		}
	}
	if (excludedNames.length > 0) {
		report.push(`Excluded packages preserved: ${excludedNames.join(", ")}`);
	}

	const ok = errors.length === 0;

	return { ok, modified, reportLines: report, errors };
}

// ---------------------------------------------------------------------------
// CLI Entrypoint
// ---------------------------------------------------------------------------

function usage() {
	console.error(`Usage: node scripts/release-align.js <mode>

Modes:
  check    — validate alignment; exit 0 if aligned, 1 if drift found
  dry-run  — show the change plan without writing files
  apply    — execute the alignment changes

Options:
  -h, --help  show this message`);
	process.exit(2);
}

function main() {
	const args = process.argv.slice(2);

	if (args.includes("-h") || args.includes("--help")) {
		usage();
	}

	const mode = args[0];

	if (!mode || !["check", "dry-run", "apply"].includes(mode)) {
		console.error(`Error: invalid mode "${mode}"`);
		usage();
	}

	if (mode === "check") {
		const result = check();
		for (const line of result.reportLines) {
			console.log(line);
		}
		if (!result.ok) {
			process.exit(1);
		}
	} else if (mode === "dry-run") {
		dryRun();
	} else if (mode === "apply") {
		const result = applyChanges();
		for (const line of result.reportLines) {
			console.log(line);
		}
		if (result.modified > 0) {
			console.log(`\n${result.modified} file(s) modified.`);
		}
		if (!result.ok) {
			console.error(`\n${result.errors.length} error(s) found during apply:`);
			for (const err of result.errors) {
				console.error(`  ${err}`);
			}
			process.exit(1);
		}
	}
}

if (require.main === module) {
	main();
}

module.exports = { check, dryRun, applyChanges, computeChangePlan };
