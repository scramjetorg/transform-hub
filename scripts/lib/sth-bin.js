#!/usr/bin/env node

/**
 * @file scripts/lib/sth-bin.js
 *
 * Shared resolver for the installed STH CLI executable (`scramjet-transform-hub`).
 *
 * The BDD Host and the release-prerelease activation/validation flow both need
 * to run the STH CLI, and both must resolve it through `node_modules/.bin`
 * rather than a hardcoded `dist/sth/bin/hub.js` path:
 *
 *   - workspace installs expose the `@scramjet/sth` package bin through npm's
 *     `node_modules/.bin/scramjet-transform-hub` symlink (source entrypoint),
 *   - registry/GitHub-Packages prerelease installs repoint the *same* canonical
 *     `node_modules/.bin/scramjet-transform-hub` link into the verified
 *     installed package (see release-prerelease-bdd.js activation).
 *
 * The selected bin is executed directly — its shebang picks the interpreter —
 * and must never be passed to `node` explicitly.
 *
 * Resolution failures throw with a multi-line diagnostic describing the search
 * path and the state of the link chain, so a missing/incorrectly-linked CLI is
 * reported instead of silently falling back to a stale build artifact.
 */

const { existsSync, lstatSync, readlinkSync, realpathSync, statSync } = require("node:fs");
const { dirname, isAbsolute, join, relative, resolve } = require("node:path");

/** Canonical STH CLI bin name exposed through node_modules/.bin. */
const STH_BIN_NAME = "scramjet-transform-hub";

/**
 * True when `path` is strictly inside `parent` (no boundary escapes).
 *
 * @param {string} parent
 * @param {string} path
 * @returns {boolean}
 */
function isInside(parent, path) {
	const pathRelative = relative(resolve(parent), resolve(path));
	return pathRelative !== "" && !pathRelative.startsWith("..") && pathRelative !== path;
}

/**
 * Find the nearest `node_modules` directory (containing a `.bin` directory)
 * by walking up from `cwd`.
 *
 * @param {string} cwd
 * @returns {string|null} Absolute node_modules path, or null when not found.
 */
function findNodeModulesRoot(cwd) {
	let current = resolve(cwd);

	for (;;) {
		const candidate = join(current, "node_modules");

		if (existsSync(join(candidate, ".bin"))) {
			return candidate;
		}

		const parent = dirname(current);

		if (parent === current) {
			return null;
		}

		current = parent;
	}
}

/**
 * Resolve the installed STH CLI executable through `node_modules/.bin`.
 *
 * The returned `binPath` is the file to execute directly (do NOT pass it to
 * `node`).  `steps` collects diagnostic entries describing every decision so
 * failures and selections can be reported verbatim.
 *
 * @param {object}  [options]
 * @param {string}  [options.cwd=process.cwd()]  Base directory for resolution.
 * @returns {{binName: string, binPath: string, modulesRoot: string, linkTarget: string|null, resolvedTarget: string, realTarget: string, source: string, steps: string[]}}
 * @throws {Error} When the CLI is not installed or the link chain is broken.
 */
function resolveSthBin(options = {}) {
	const cwd = resolve(options.cwd || process.cwd());
	const steps = [];

	steps.push(`resolving ${STH_BIN_NAME} from ${cwd}`);

	const modulesRoot = findNodeModulesRoot(cwd);

	if (!modulesRoot) {
		throw new Error(
			`Unable to resolve the ${STH_BIN_NAME} CLI: no node_modules/.bin directory was found from ${cwd}. ` +
			`Run \`npm ci\` at the repository root (or activate the verified prerelease install) first.`
		);
	}

	steps.push(`found node_modules root: ${modulesRoot}`);

	const binPath = join(modulesRoot, ".bin", STH_BIN_NAME);
	let binStat;

	try {
		binStat = lstatSync(binPath);
	} catch {
		throw new Error(
			`Unable to resolve the ${STH_BIN_NAME} CLI: ${binPath} does not exist. ` +
			`The STH package bin was not linked. Diagnostics:\n${steps.join("\n")}`
		);
	}

	if (!binStat.isSymbolicLink()) {
		// A plain (copied) executable at the canonical location is acceptable.
		if (!binStat.isFile()) {
			throw new Error(
				`Unable to resolve the ${STH_BIN_NAME} CLI: ${binPath} is neither a symlink nor a regular file. ` +
				`Diagnostics:\n${steps.join("\n")}`
			);
		}

		const realTarget = realpathSync(binPath);

		steps.push(`bin entry is a regular file: ${binPath}`);
		steps.push(`executable target: ${realTarget}`);

		return {
			binName: STH_BIN_NAME,
			binPath,
			linkTarget: null,
			modulesRoot,
			realTarget,
			resolvedTarget: binPath,
			source: "regular-file",
			steps,
		};
	}

	const linkTarget = readlinkSync(binPath);
	const resolvedTarget = isAbsolute(linkTarget) ? linkTarget : resolve(dirname(binPath), linkTarget);

	steps.push(`bin symlink target: ${linkTarget}`);

	if (!existsSync(resolvedTarget)) {
		throw new Error(
			`Unable to resolve the ${STH_BIN_NAME} CLI: ${binPath} points to ${linkTarget}, which does not exist. ` +
			`The link target may reference a stale or unactivated install. Diagnostics:\n${steps.join("\n")}`
		);
	}

	const realTarget = realpathSync(resolvedTarget);
	const targetStat = statSync(realTarget);

	if (!targetStat.isFile()) {
		throw new Error(
			`Unable to resolve the ${STH_BIN_NAME} CLI: ${binPath} resolves to ${realTarget}, which is not a file. ` +
			`Diagnostics:\n${steps.join("\n")}`
		);
	}

	steps.push(`resolved target: ${resolvedTarget}`);
	steps.push(`real target: ${realTarget}`);

	return {
		binName: STH_BIN_NAME,
		binPath,
		linkTarget,
		modulesRoot,
		realTarget,
		resolvedTarget,
		source: isInside(modulesRoot, resolvedTarget) ? "workspace" : "installed-package",
		steps,
	};
}

/**
 * Human-readable multi-line description of a resolution result (or of a
 * resolution attempt captured before failure).
 *
 * @param {object} resolved  Result of {@link resolveSthBin}.
 * @returns {string}
 */
function describeSthBinResolution(resolved) {
	if (!resolved) return "STH CLI resolution: no result.";

	const lines = [
		`STH CLI resolution:`,
		`  bin name:     ${resolved.binName}`,
		`  bin path:     ${resolved.binPath}`,
		`  link target:  ${resolved.linkTarget || "(regular file)"}`,
		`  resolved:     ${resolved.resolvedTarget}`,
		`  real target:  ${resolved.realTarget}`,
		`  source:       ${resolved.source}`,
	];

	if (Array.isArray(resolved.steps) && resolved.steps.length > 0) {
		lines.push("  steps:");
		for (const step of resolved.steps) lines.push(`    - ${step}`);
	}

	return lines.join("\n");
}

module.exports = {
	STH_BIN_NAME,
	describeSthBinResolution,
	findNodeModulesRoot,
	isInside,
	resolveSthBin,
};
