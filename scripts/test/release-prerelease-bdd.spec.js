"use strict";

const test = require("ava").default;
const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { createManifest } = require("../release-prerelease.js");
const {
	assertPublisherManifest,
	consumptionRecord,
	verifyInstallLock,
	writeInstallManifest,
} = require("../release-prerelease-bdd.js");

const SHA = "a".repeat(40);
const IMAGE_DIGEST = `sha256:${"b".repeat(64)}`;
const SRI = `sha512-${Buffer.alloc(64).toString("base64")}`;

function fixturePackages(t) {
	const root = mkdtempSync(join(tmpdir(), "release-prerelease-bdd-"));
	t.teardown(() => rmSync(root, { force: true, recursive: true }));
	for (const [directory, manifest] of Object.entries({
		"scramjet-a": { name: "@scramjet/a", version: "2.0.0", dependencies: { "@scramjet/b": "^2.0.0" } },
		"scramjet-b": { name: "@scramjet/b", version: "2.0.0" },
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
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA, attempt: "r100.a1" });
	const record = consumptionRecord({
		manifest,
		expectedChecksum: manifest.checksum,
		images: [{ role: "bdd-node", reference: `ghcr.io/scramjetorg/transform-hub/bdd-node@${IMAGE_DIGEST}` }],
		runner: metadataRunner,
		environment: {},
	});
	return { manifest, packagesDir, record };
}

test("consumption requires the publisher manifest SHA-256 and exact prerelease versions", (t) => {
	const packagesDir = fixturePackages(t);
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA, attempt: "r100.a1" });
	t.is(assertPublisherManifest(manifest, manifest.checksum), manifest);
	t.throws(() => assertPublisherManifest(manifest, `sha256:${"0".repeat(64)}`), { message: /SHA-256/i });
	const ranged = {
		...manifest,
		packages: [{ ...manifest.packages[0], version: `^${manifest.packages[0].version}` }, ...manifest.packages.slice(1)],
	};
	ranged.checksum = require("../release-prerelease.js").manifestChecksum(ranged);
	t.throws(() => assertPublisherManifest(ranged, ranged.checksum), { message: /exact prerelease/i });
});

test("consumption records exact GitHub Packages tarball SRI, SHA-256, and image digests", (t) => {
	const { record } = trustedRecord(t);
	t.is(record.packages.length, 2);
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
	lock.packages["node_modules/@scramjet/a"].integrity = "sha512-bad";
	t.throws(() => verifyInstallLock(lock, record), { message: /integrity verification/i });
});

test("consumption fails closed when registry metadata or image digest verification fails", (t) => {
	const packagesDir = fixturePackages(t);
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA, attempt: "r100.a1" });
	t.throws(() => consumptionRecord({
		manifest,
		expectedChecksum: manifest.checksum,
		images: [],
		runner: metadataRunner,
		environment: {},
	}), { message: /images are required/i });
	t.throws(() => consumptionRecord({
		manifest,
		expectedChecksum: manifest.checksum,
		images: [{ role: "bdd-node", reference: `ghcr.io/scramjetorg/transform-hub/bdd-node@${IMAGE_DIGEST}` }],
		runner: (command, args) => command === "docker" ? `sha256:${"d".repeat(64)}` : metadataRunner(command, args),
		environment: {},
	}), { message: /Image digest verification failed/i });
});
