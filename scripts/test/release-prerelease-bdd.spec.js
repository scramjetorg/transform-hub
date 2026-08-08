"use strict";

const test = require("ava").default;
const { execFileSync } = require("node:child_process");
const { existsSync, mkdtempSync, mkdirSync, readFileSync, readlinkSync, realpathSync, renameSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, isAbsolute, join, relative, sep } = require("node:path");

const { createManifest } = require("../release-prerelease.js");
const {
	activateVerifiedPackages,
	assertPublisherManifest,
	consumptionRecord,
	validateSthCli,
	verifyImages,
	verifyInstallLock,
	writeInstallManifest,
} = require("../release-prerelease-bdd.js");

const SHA = "a".repeat(40);
const IMAGE_DIGEST = `sha256:${"b".repeat(64)}`;
const SRI = `sha512-${Buffer.alloc(64).toString("base64")}`;
const TEST_BOUNDARY = new Set(["@scramjet/a", "@scramjet/b", "@scramjet/sth"]);

function fixturePackages(t) {
	const root = mkdtempSync(join(tmpdir(), "release-prerelease-bdd-"));
	t.teardown(() => rmSync(root, { force: true, recursive: true }));
	for (const [directory, manifest] of Object.entries({
		"scramjet-a": { name: "@scramjet/a", version: "2.0.0", dependencies: { "@scramjet/b": "^2.0.0" } },
		"scramjet-b": { name: "@scramjet/b", version: "2.0.0" },
		"scramjet-sth": {
			name: "@scramjet/sth",
			version: "2.0.0",
			bin: { "scramjet-transform-hub": "./bin/hub.js", sth: "./bin/hub.js" },
		},
	})) {
		mkdirSync(join(root, directory), { recursive: true });
		writeFileSync(join(root, directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
	}
	return root;
}

function metadataRunner(command, args) {
	if (command === "docker") return `${IMAGE_DIGEST}\n`;
	const spec = args[1];
	const separator = spec.lastIndexOf("@");
	const name = spec.slice(0, separator);
	const version = spec.slice(separator + 1);
	return JSON.stringify({
		name,
		version,
		dist: {
			integrity: SRI,
			sha256: "c".repeat(64),
			tarball: `https://npm.pkg.github.com/download/${encodeURIComponent(name)}/${version}/package.tgz`,
		},
	});
}

function trustedRecord(t) {
	const packagesDir = fixturePackages(t);
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA, attempt: "r100.a1", boundary: TEST_BOUNDARY });
	const record = consumptionRecord({
		manifest,
		expectedChecksum: manifest.checksum,
		images: [{ role: "bdd-node", reference: `ghcr.io/scramjetorg/transform-hub/bdd-node@${IMAGE_DIGEST}` }],
		runner: metadataRunner,
		environment: {},
		boundary: TEST_BOUNDARY,
	});
	return { manifest, packagesDir, record };
}

function activatedFixture(t) {
	const { manifest, packagesDir, record } = trustedRecord(t);
	const installDir = join(packagesDir, "installed");
	const workspaceRoot = join(packagesDir, "workspace");

	for (const entry of record.packages) {
		const packageDir = join(installDir, "node_modules", entry.name);
		mkdirSync(packageDir, { recursive: true });
		writeFileSync(join(packageDir, "package.json"), `${JSON.stringify({
			name: entry.name,
			version: entry.version,
			bin: entry.sourceName === "@scramjet/sth"
				? { "scramjet-transform-hub": "./bin/hub.js", sth: "./bin/hub.js" }
				: undefined,
			scramjet: {
				prerelease: {
					packageChecksum: entry.packageChecksum,
					registryName: entry.registryName,
					sourceChecksum: entry.sourceChecksum,
					sourceName: entry.sourceName,
					sourceVersion: entry.sourceVersion,
				},
			},
		}, null, 2)}\n`);
		writeFileSync(join(packageDir, "index.js"), manifest.packages.find((item) => item.name === entry.name).sourceName === "@scramjet/a" ? "module.exports = require(\"@scramjetorg/b\");\n" : "module.exports = \"mapped prerelease dependency\";\n");
		if (entry.sourceName === "@scramjet/sth") {
			mkdirSync(join(packageDir, "bin"), { recursive: true });
			writeFileSync(
				join(packageDir, "bin", "hub.js"),
				"#!/usr/bin/env node\nprocess.stdout.write(\"FAKE STH CLI HELP\\nUsage: sth [options...]\\n\");\n",
				{ mode: 0o755 }
			);
		}
	}
	mkdirSync(join(workspaceRoot, "node_modules", "@scramjet"), { recursive: true });

	activateVerifiedPackages({ installDir, record, workspaceRoot });
	return { installDir, packagesDir, record, workspaceRoot };
}

function hermeticNpxEnvironment(extra = {}) {
	return {
		...process.env,
		npm_config_registry: "http://127.0.0.1:9",
		npm_config_fetch_retries: "0",
		npm_config_update_notifier: "false",
		npm_config_audit: "false",
		npm_config_fund: "false",
		...extra,
	};
}

test("consumption requires the publisher manifest SHA-256 and exact prerelease versions", (t) => {
	const packagesDir = fixturePackages(t);
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA, attempt: "r100.a1", boundary: TEST_BOUNDARY });
	t.is(assertPublisherManifest(manifest, manifest.checksum, TEST_BOUNDARY), manifest);
	t.throws(() => assertPublisherManifest(manifest, `sha256:${"0".repeat(64)}`), { message: /SHA-256/i });
	const ranged = {
		...manifest,
		packages: [{ ...manifest.packages[0], version: `^${manifest.packages[0].version}` }, ...manifest.packages.slice(1)],
	};
	ranged.checksum = require("../release-prerelease.js").manifestChecksum(ranged);
	t.throws(() => assertPublisherManifest(ranged, ranged.checksum, TEST_BOUNDARY), { message: /exact source-to-registry/i });
});

test("consumption records exact GitHub Packages tarball SRI, SHA-256, and image digests", (t) => {
	const { record } = trustedRecord(t);
	t.is(record.packages.length, 3);
	t.true(record.packages.every((entry) => entry.integrity === SRI && entry.tarballSha256 === `sha256:${"c".repeat(64)}`));
	t.deepEqual(record.images, [{ digest: IMAGE_DIGEST, reference: `ghcr.io/scramjetorg/transform-hub/bdd-node@${IMAGE_DIGEST}`, role: "bdd-node" }]);
});

test("generated install manifests and locks retain only exact verified prereleases", (t) => {
	const { packagesDir, record } = trustedRecord(t);
	const installDir = join(packagesDir, "install");
	writeInstallManifest(installDir, record);
	const installManifest = JSON.parse(readFileSync(join(installDir, "package.json"), "utf8"));
	for (const entry of record.packages) t.is(installManifest.dependencies[entry.name], entry.version);

	const lock = {
		lockfileVersion: 3,
		packages: {
			"": { dependencies: installManifest.dependencies },
			...Object.fromEntries(record.packages.map((entry) => [`node_modules/${entry.name}`, {
				integrity: entry.integrity,
				resolved: entry.tarball,
				version: entry.version,
			}])),
		},
	};
	verifyInstallLock(lock, record);
	lock.packages["node_modules/@scramjetorg/a"].integrity = "sha512-bad";
	t.throws(() => verifyInstallLock(lock, record), { message: /integrity verification/i });
});

test("activation aliases BDD source imports to installed mapped prereleases without public-package fallback", (t) => {
	const { workspaceRoot } = activatedFixture(t);
	writeFileSync(join(workspaceRoot, "consumer.js"), "process.stdout.write(require(\"@scramjet/a\"));\n");

	t.is(execFileSync(process.execPath, ["consumer.js"], { cwd: workspaceRoot, encoding: "utf8" }), "mapped prerelease dependency");
});

test("activation keeps verified aliases relative and valid after relocation", (t) => {
	const { installDir, record, workspaceRoot } = activatedFixture(t);
	writeFileSync(join(workspaceRoot, "consumer.js"), "process.stdout.write(require(\"@scramjet/a\"));\n");

	for (const entry of record.packages) {
		for (const aliasName of [entry.name, entry.sourceName]) {
			const destination = join(workspaceRoot, "node_modules", aliasName);
			const expectedTarget = relative(dirname(destination), join(installDir, "node_modules", entry.name));
			t.false(isAbsolute(expectedTarget));
			t.is(readlinkSync(destination), expectedTarget);
		}
	}

	const sourceA = record.packages.find((entry) => entry.sourceName === "@scramjet/a");
	const resolvesIntoMapped = (root, expectedInstallDir) => {
		const mappedPackageDir = realpathSync(join(expectedInstallDir, "node_modules", sourceA.name));
		const resolved = realpathSync(require.resolve("@scramjet/a", { paths: [root] }));
		return resolved === mappedPackageDir || resolved.startsWith(`${mappedPackageDir}${sep}`);
	};
	t.true(resolvesIntoMapped(workspaceRoot, installDir));

	const relocatedRoot = mkdtempSync(join(tmpdir(), "release-prerelease-bdd-relocated-"));
	t.teardown(() => rmSync(relocatedRoot, { force: true, recursive: true }));
	const relocatedInstallDir = join(relocatedRoot, "installed");
	const relocatedWorkspaceRoot = join(relocatedRoot, "workspace");
	renameSync(installDir, relocatedInstallDir);
	renameSync(workspaceRoot, relocatedWorkspaceRoot);

	for (const entry of record.packages) {
		for (const aliasName of [entry.name, entry.sourceName]) {
			const destination = join(relocatedWorkspaceRoot, "node_modules", aliasName);
			const expectedTarget = relative(dirname(destination), join(relocatedInstallDir, "node_modules", entry.name));
			t.is(readlinkSync(destination), expectedTarget);
			t.true(existsSync(join(dirname(destination), expectedTarget)));
		}
	}
	t.is(execFileSync(process.execPath, ["consumer.js"], { cwd: relocatedWorkspaceRoot, encoding: "utf8" }), "mapped prerelease dependency");
	t.true(resolvesIntoMapped(relocatedWorkspaceRoot, relocatedInstallDir));
});

test("activation refuses an installed package whose verified registry identity was tampered with", (t) => {
	const { packagesDir, record } = trustedRecord(t);
	const sourceA = record.packages.find((entry) => entry.sourceName === "@scramjet/a");
	const installDir = join(packagesDir, "tampered-installed");
	const workspaceRoot = join(packagesDir, "tampered-workspace");
	const packageDir = join(installDir, "node_modules", sourceA.name);
	mkdirSync(packageDir, { recursive: true });
	writeFileSync(join(packageDir, "package.json"), `${JSON.stringify({ name: sourceA.name, version: "0.0.0-tampered" }, null, 2)}\n`);

	t.throws(() => activateVerifiedPackages({ installDir, record, workspaceRoot }), {
		message: /does not match the verified registry identity/,
	});
});

test("consumption fails closed when registry metadata or image digest verification fails", (t) => {
	const packagesDir = fixturePackages(t);
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA, attempt: "r100.a1", boundary: TEST_BOUNDARY });
	t.throws(() => consumptionRecord({
		manifest,
		expectedChecksum: manifest.checksum,
		images: [],
		runner: metadataRunner,
		environment: {},
		boundary: TEST_BOUNDARY,
	}), { message: /images are required/i });
	t.throws(() => consumptionRecord({
		manifest,
		expectedChecksum: manifest.checksum,
		images: [{ role: "bdd-node", reference: `ghcr.io/scramjetorg/transform-hub/bdd-node@${IMAGE_DIGEST}` }],
		runner: (command, args) => command === "docker" ? `sha256:${"d".repeat(64)}` : metadataRunner(command, args),
		environment: {},
		boundary: TEST_BOUNDARY,
	}), { message: /Image digest verification failed/i });
});

test("image digest verification resolves the manifest digest with docker buildx imagetools inspect", (t) => {
	const invoked = [];
	const runner = (command, args) => {
		if (command === "docker") invoked.push(args);
		return `${IMAGE_DIGEST}\n`;
	};
	const reference = `ghcr.io/scramjetorg/transform-hub/bdd-node@${IMAGE_DIGEST}`;
	const verified = verifyImages([{ role: "bdd-node", reference }], runner, {});
	t.deepEqual(invoked, [["buildx", "imagetools", "inspect", "--format", "{{.Manifest.Digest}}", reference]]);
	t.true(invoked.length === 1 && invoked[0].includes("{{.Manifest.Digest}}"));
	t.false(invoked.some((args) => args.includes("{{.Digest}}")));
	t.deepEqual(verified, [{ digest: IMAGE_DIGEST, reference, role: "bdd-node" }]);
});

test("activation repoints node_modules/.bin/scramjet-transform-hub into the verified installed package", (t) => {
	const { installDir, record, workspaceRoot } = activatedFixture(t);
	const binLink = join(workspaceRoot, "node_modules", ".bin", "scramjet-transform-hub");

	t.true(existsSync(binLink));
	const linkTarget = readlinkSync(binLink);
	t.false(isAbsolute(linkTarget));
	t.true(linkTarget.startsWith(".."));

	const sth = record.packages.find((entry) => entry.sourceName === "@scramjet/sth");
	const packageReal = realpathSync(join(installDir, "node_modules", sth.name));
	const binReal = realpathSync(binLink);
	t.true(binReal.startsWith(packageReal + sep));
	t.is(execFileSync(binLink, [], { encoding: "utf8" }), "FAKE STH CLI HELP\nUsage: sth [options...]\n");
});

test("activation refuses a bin entry that escapes the verified package", (t) => {
	const { packagesDir, record } = trustedRecord(t);
	const installDir = join(packagesDir, "installed");
	const workspaceRoot = join(packagesDir, "workspace");

	for (const entry of record.packages) {
		const dir = join(installDir, "node_modules", entry.name);
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "package.json"), `${JSON.stringify({
			name: entry.name,
			version: entry.version,
			bin: entry.sourceName === "@scramjet/sth" ? { "scramjet-transform-hub": "../escape.js" } : undefined,
			scramjet: {
				prerelease: {
					packageChecksum: entry.packageChecksum,
					registryName: entry.registryName,
					sourceChecksum: entry.sourceChecksum,
					sourceName: entry.sourceName,
					sourceVersion: entry.sourceVersion,
				},
			},
		}, null, 2)}\n`);
	}

	t.throws(() => activateVerifiedPackages({ installDir, record, workspaceRoot }), { message: /escapes the verified package directory/i });
});

test("validate-cli runs the installed CLI via npx --no-install after activation", (t) => {
	const { workspaceRoot } = activatedFixture(t);
	const cacheDir = mkdtempSync(join(tmpdir(), "release-prerelease-bdd-npmcache-"));
	t.teardown(() => rmSync(cacheDir, { force: true, recursive: true }));

	const { command, output } = validateSthCli({
		workspaceRoot,
		environment: hermeticNpxEnvironment({ npm_config_cache: cacheDir }),
	});

	t.deepEqual(command, ["npx", "--no-install", "scramjet-transform-hub", "--help"]);
	t.true(output.includes("FAKE STH CLI HELP"));
	t.true(/usage/i.test(output));
});

test("validate-cli is fail-closed: npx --no-install never fetches an uninstalled CLI", (t) => {
	const workspaceRoot = mkdtempSync(join(tmpdir(), "release-prerelease-bdd-failclosed-"));
	t.teardown(() => rmSync(workspaceRoot, { force: true, recursive: true }));
	const cacheDir = mkdtempSync(join(tmpdir(), "release-prerelease-bdd-failclosed-cache-"));
	t.teardown(() => rmSync(cacheDir, { force: true, recursive: true }));

	t.throws(() => validateSthCli({
		workspaceRoot,
		environment: hermeticNpxEnvironment({ npm_config_cache: cacheDir }),
	}), { message: /fail-closed/ });
	t.false(existsSync(join(workspaceRoot, "node_modules", ".bin", "scramjet-transform-hub")));
});
