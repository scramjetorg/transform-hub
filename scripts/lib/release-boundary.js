#!/usr/bin/env node

/**
 * @file scripts/lib/release-boundary.js
 *
 * Machine-readable release boundary for the 2.0.0/MIT release alignment.
 * This is the single source of truth for which packages are included in the
 * release sweep.  CI, the alignment CLI, and publish hardening all consume
 * this module to ensure consistent inclusion/exclusion rules.
 *
 * The boundary is fixed by the track specification and must not be expanded
 * without a written scope decision.
 *
 * @see conductor/archive/release_2_0_0_package_alignment_mit_license_20260729/inventory.md
 */

const { sync: globSync } = require("glob");

// ---------------------------------------------------------------------------
// Manifest discovery glob rules
// ---------------------------------------------------------------------------

/**
 * Glob patterns that identify normal workspace manifests eligible for full
 * version-and-dependency alignment (including `bdd/package.json` which is
 * treated as a license-only workspace).
 * These are resolved relative to the repository root.
 */
const WORKSPACE_MANIFEST_GLOBS = [
	"packages/*/package.json",
	"bdd/package.json",
];

/**
 * Glob patterns that identify dependency-only fixture manifests.
 * Fixture manifests receive only included-to-included `@scramjet/*`
 * dependency range alignment; their package identity (name, version),
 * license, and other fields are never altered.
 *
 * These cover BDD sequence fixtures and integration-acceptance-test
 * fixtures, including nested build artifacts.
 */
const FIXTURE_MANIFEST_GLOBS = [
	"bdd/data/sequences/**/package.json",
	"bdd/iac-test-data/sequences/**/package.json",
];

/**
 * Glob patterns that must always be excluded from manifest discovery.
 * At minimum this excludes `node_modules` trees.  Add additional
 * exclusions only when justified by scope — broad exclusions risk
 * silently missing manifests that should be aligned.
 */
const MANIFEST_EXCLUDE_GLOBS = [
	"**/node_modules/**",
];

/**
 * Discover all manifest file paths matching the given include globs,
 * excluding any path matched by the shared exclusion globs plus any
 * caller-supplied extra ignore patterns.
 *
 * Results are relative to the repository root (or the provided `cwd`).
 *
 * @param {string[]} globs Include glob patterns (relative to cwd).
 * @param {object}  [options]
 * @param {string}  [options.cwd]       Working directory (default `process.cwd()`).
 * @param {string[]} [options.ignore]   Additional exclude patterns.
 * @returns {string[]} Deduplicated, sorted relative file paths.
 */
function discoverManifests(globs, options = {}) {
	const cwd = options.cwd || process.cwd();
	const extraIgnore = options.ignore || [];
	const allExclude = [...MANIFEST_EXCLUDE_GLOBS, ...extraIgnore];

	const results = [];
	for (const pattern of globs) {
		const matches = globSync(pattern, { cwd, ignore: allExclude });
		results.push(...matches);
	}
	// Deduplicate in case multiple glob patterns match the same file.
	return [...new Set(results)].sort();
}

/** Target release version string. */
const RELEASE_VERSION = "2.0.0";

/**
 * Set of package names included in the 2.0.0 release alignment.
 * These are all first-party @scramjet/* workspaces that support
 * Transform Hub, excluding the explicitly excluded packages below.
 */
const INCLUDED_PACKAGES = new Set([
	"@scramjet/sth",
	"@scramjet/cli",
	"@scramjet/manager",
	"@scramjet/multi-manager",
	"@scramjet/host",
	"@scramjet/pre-runner",
	"@scramjet/runner",
	"@scramjet/runner-node",
	"@scramjet/runner-bun",
	"@scramjet/runner-python",
	"@scramjet/api-client",
	"@scramjet/client-utils",
	"@scramjet/sequence-test",
	"@scramjet/config",
	"@scramjet/rest-api2",
	"@scramjet/api-router",
	"@scramjet/api-server",
	"@scramjet/api-types",
	"@scramjet/runtime-types",
	"@scramjet/sequence-types",
	"@scramjet/types",
	"@scramjet/symbols",
	"@scramjet/model",
	"@scramjet/utility",
	"@scramjet/telemetry",
	"@scramjet/adapters",
	"@scramjet/adapters-common",
	"@scramjet/adapter-docker",
	"@scramjet/adapter-kubernetes",
	"@scramjet/adapter-process",
	"@scramjet/load-check",
	"@scramjet/monitoring-server",
	"@scramjet/obj-logger",
	"@scramjet/logger",
	"@scramjet/module-loader",
	"@scramjet/middleware-api-client",
	"@scramjet/multi-manager-api-client",
]);

/**
 * Set of package names explicitly excluded from the 2.0.0 release sweep.
 * Their manifests, versions, and licensing must be preserved.
 */
const EXCLUDED_PACKAGES = new Set([
	"@scramjet/verser",
	"@scramjet/bpmux",
	"@scramjet/frame-stream",
	"scramjet-bdd",
]);

/**
 * Subset of EXCLUDED_PACKAGES that still receive MIT license treatment.
 * These packages remain excluded from version/dep alignment, publish
 * boundaries, and workspace groups, but get the standard MIT LICENSE
 * file and updated manifest license field. They may already carry the target
 * version through an independently managed fixture/base update; that version
 * is preserved rather than treated as alignment drift.
 */
const LICENSE_ONLY_PACKAGES = new Set([
	"scramjet-bdd",
]);

/**
 * Relative path (from repo root) to the static image-config source file.
 * This is the only file the alignment tool should touch for image tags.
 */
const IMAGE_CONFIG_PATH = "packages/config/src/sth/image-config.ts";

/**
 * Check whether a package name is in the 2.0.0 included set.
 * @param {string} name
 * @returns {boolean}
 */
function isIncluded(name) {
	return INCLUDED_PACKAGES.has(name);
}

/**
 * Check whether a package name is explicitly excluded from the 2.0.0 sweep.
 * @param {string} name
 * @returns {boolean}
 */
function isExcluded(name) {
	return EXCLUDED_PACKAGES.has(name);
}

/**
 * Check whether an excluded package is license-only. License-only packages
 * stay outside release publishing and dependency alignment even when their
 * independently managed version equals the release target.
 * @param {string} name
 * @returns {boolean}
 */
function isLicenseOnly(name) {
	return LICENSE_ONLY_PACKAGES.has(name);
}

/**
 * Check whether a name is a @scramjet/* package (regardless of inclusion).
 * @param {string} name
 * @returns {boolean}
 */
function isScramjet(name) {
	return typeof name === "string" && name.startsWith("@scramjet/");
}

/**
 * Check whether a name is a @signicode/* package.
 * These must never be modified by release tooling.
 * @param {string} name
 * @returns {boolean}
 */
function isSignicode(name) {
	return typeof name === "string" && name.startsWith("@signicode/");
}

/**
 * Check whether a package should receive MIT license treatment.
 * This covers release-alignment included packages plus the
 * licensing-only excluded package `scramjet-bdd`.
 * @param {string} name
 * @returns {boolean}
 */
function isLicenseTarget(name) {
	return isIncluded(name) || LICENSE_ONLY_PACKAGES.has(name);
}

/**
 * Official SPDX/OSI MIT license text as retrieved 2026-07-30.
 * Copyright assigned to Scramjet Sp. z o.o. for the 2.0.0 release.
 */
const MIT_LICENSE_TEXT = [
	"MIT License",
	"",
	"Copyright (c) 2026 Scramjet Sp. z o.o.",
	"",
	'Permission is hereby granted, free of charge, to any person obtaining a copy',
	'of this software and associated documentation files (the "Software"), to deal',
	"in the Software without restriction, including without limitation the rights",
	"to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
	'copies of the Software, and to permit persons to whom the Software is',
	"furnished to do so, subject to the following conditions:",
	"",
	"The above copyright notice and this permission notice shall be included in all",
	"copies or substantial portions of the Software.",
	"",
	'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
	"IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
	"FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
	"AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
	"LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
	"OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
	"SOFTWARE.",
].join("\n") + "\n";

/** Expected license identifier for all included packages and root. */
const EXPECTED_LICENSE = "MIT";

/** Filename for the MIT license file placed in each package dir. */
const LICENSE_FILE = "LICENSE";

/**
 * Return the union of all sections that may reference dependencies.
 * @returns {string[]}
 */
function dependencySections() {
	return ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
}

/**
 * Extract the range prefix (^, ~, or "") from a semver range string.
 * @param {string} range
 * @returns {string}
 */
function getRangePrefix(range) {
	if (typeof range !== "string") return "";
	if (range.startsWith("^")) return "^";
	if (range.startsWith("~")) return "~";
	return "";
}

/**
 * Determine the expected version for an included package.
 * Most packages align to RELEASE_VERSION, but Manager/MultiManager
 * also align despite being at 0.35.1.
 * @param {string} _name Package name (unused, reserved for future special cases)
 * @returns {string}
 */
function expectedVersion(_name) {
	return RELEASE_VERSION;
}

/**
 * Map an included @scramjet/* package name to its directory path
 * relative to the repository root.  Derived from the naming convention
 * where @scramjet/X lives in packages/X/.
 * @param {string} name
 * @returns {string|null} dir path like "packages/sth", or null if not included
 */
function includedPackageDir(name) {
	if (!isIncluded(name)) return null;
	return "packages/" + name.replace("@scramjet/", "");
}

/**
 * Return the sorted list of relative directory paths for all included
 * packages.  This is the canonical value for the npm-facinng
 * workspaces.packages array and the release workspace group.
 * @returns {string[]}
 */
function includedPackageDirs() {
	return Array.from(INCLUDED_PACKAGES)
		.map((name) => includedPackageDir(name))
		.sort();
}

/**
 * Expected workspaces.packages array for the 2.0.0 release boundary.
 * This replaces the broad "packages/*" glob so that excluded packages are
 * not part of npm workspace resolution during lockfile generation.
 * @returns {string[]}
 */
function expectedWorkspacePackages() {
	return includedPackageDirs();
}

/**
 * Expected workspaces.release array (identical to release packages list)
 * for release-only build/pack/install operations.
 * @returns {string[]}
 */
function expectedWorkspaceRelease() {
	return includedPackageDirs();
}

module.exports = {
	RELEASE_VERSION,
	INCLUDED_PACKAGES,
	EXCLUDED_PACKAGES,
	LICENSE_ONLY_PACKAGES,
	IMAGE_CONFIG_PATH,
	MIT_LICENSE_TEXT,
	EXPECTED_LICENSE,
	LICENSE_FILE,
	WORKSPACE_MANIFEST_GLOBS,
	FIXTURE_MANIFEST_GLOBS,
	MANIFEST_EXCLUDE_GLOBS,
	isIncluded,
	isExcluded,
	isLicenseOnly,
	isScramjet,
	isSignicode,
	isLicenseTarget,
	dependencySections,
	getRangePrefix,
	expectedVersion,
	includedPackageDir,
	includedPackageDirs,
	expectedWorkspacePackages,
	expectedWorkspaceRelease,
	discoverManifests,
};
