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
 * @see conductor/tracks/release_2_0_0_package_alignment_mit_license_20260729/inventory.md
 */

"use strict";

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
	"@scramjet/runner-python",
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
	IMAGE_CONFIG_PATH,
	isIncluded,
	isExcluded,
	isScramjet,
	isSignicode,
	dependencySections,
	getRangePrefix,
	expectedVersion,
	includedPackageDir,
	includedPackageDirs,
	expectedWorkspacePackages,
	expectedWorkspaceRelease,
};
