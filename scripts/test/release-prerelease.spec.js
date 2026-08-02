"use strict";

const test = require("ava");
const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const {
	REGISTRY,
	assertLivePublicationConfigured,
	createManifest,
	publishManifest,
	releasePrereleaseVersion,
	verifyManifest,
	writeManifest,
} = require("../release-prerelease.js");

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const ATTEMPT_A = "r100.a1";
const ATTEMPT_B = "r100.a2";

function createPackages(t, extra = {}) {
	const root = mkdtempSync(join(tmpdir(), "release-prerelease-"));
	t.teardown(() => rmSync(root, { force: true, recursive: true }));
	for (const [directory, manifest] of Object.entries({
		"scramjet-a": {
			name: "@scramjet/a",
			version: "2.0.0",
			dependencies: { "@scramjet/b": "^2.0.0" },
		},
		"scramjet-b": { name: "@scramjet/b", version: "1.4.0" },
		...extra,
	})) {
		const packageDir = join(root, directory);
		mkdirSync(packageDir, { recursive: true });
		writeFileSync(join(packageDir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
	}
	return root;
}

test("release PR prerelease versions are valid and unique to the PR, source SHA, and run attempt", (t) => {
	const version = releasePrereleaseVersion("2.0.0", 42, SHA_A, ATTEMPT_A);
	t.is(version, "2.0.0-pr.42.aaaaaaaaaaaa.r100.a1");
	t.regex(version, /^\d+\.\d+\.\d+-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*$/);
	t.not(version, releasePrereleaseVersion("2.0.0", 42, SHA_B, ATTEMPT_A));
	t.not(version, releasePrereleaseVersion("2.0.0", 43, SHA_A, ATTEMPT_A));
	t.not(version, releasePrereleaseVersion("2.0.0", 42, SHA_A, ATTEMPT_B));
});

test("prerelease manifest is scoped to public Scramjet packages and pins internal dependencies", (t) => {
	const packagesDir = createPackages(t, {
		private: { name: "@scramjet/private", version: "2.0.0", private: true },
	});
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A });

	t.is(manifest.registry, REGISTRY);
	t.is(manifest.distTag, "release-pr-42");
	t.deepEqual(manifest.packages.map((entry) => entry.name), ["@scramjet/a", "@scramjet/b"]);
	t.is(manifest.attempt, ATTEMPT_A);
	t.true(manifest.packages.every((entry) => entry.version.endsWith(".aaaaaaaaaaaa.r100.a1")));
	const packageA = JSON.parse(readFileSync(join(packagesDir, "scramjet-a", "package.json"), "utf8"));
	t.is(packageA.dependencies["@scramjet/b"], manifest.packages.find((entry) => entry.name === "@scramjet/b").version);
	t.is(packageA.scramjet.prerelease.packageChecksum, manifest.packages.find((entry) => entry.name === "@scramjet/a").checksum);
	verifyManifest(manifest, packagesDir);
});

test("prerelease planning rejects packages outside the GitHub Packages scope", (t) => {
	const packagesDir = createPackages(t, {
		outside: { name: "not-scramjet", version: "1.0.0" },
	});
	t.throws(() => createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A }), { message: /Only @scramjet packages/i });
});

test("manifest writes are idempotent and reject checksum drift", (t) => {
	const packagesDir = createPackages(t);
	const output = join(packagesDir, "manifest.json");
	const firstManifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A });
	t.is(writeManifest(output, firstManifest).status, "created");
	const firstContents = readFileSync(output, "utf8");
	const rerunManifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A });
	t.is(writeManifest(output, rerunManifest).status, "reused");
	t.is(readFileSync(output, "utf8"), firstContents);
	const tampered = { ...rerunManifest, checksum: `sha256:${"0".repeat(64)}` };
	t.throws(() => verifyManifest(tampered, packagesDir), { message: /checksum/i });
});

test("live publishing fails closed without scoped configuration and uses exact GitHub Packages policy", (t) => {
	const packagesDir = createPackages(t);
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A });
	t.throws(() => assertLivePublicationConfigured({}), { message: /disabled/i });
	t.throws(() => publishManifest({ manifest, packagesDir, environment: { PRERELEASE_PUBLISH_ENABLED: "true" } }), { message: /publisher configuration/i });

	const calls = [];
	const npmrc = join(packagesDir, "scoped.npmrc");
	writeFileSync(npmrc, "@scramjet:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=test-token\nalways-auth=true\n");
	publishManifest({
		manifest,
		packagesDir,
		environment: {
			NODE_AUTH_TOKEN: "test-token",
			NPM_CONFIG_USERCONFIG: npmrc,
			PRERELEASE_PUBLISH_ENABLED: "true",
			SCRAMJET_GH_PACKAGES_PRERELEASE_PUBLISHER: "github-packages",
		},
		runner: (command, args, options) => {
			calls.push({ command, args, options });
			if (args[0] === "view") throw new Error("not found");
		},
	});
	t.is(calls.filter(({ args }) => args.includes("publish")).length, 2);
	t.true(calls.filter(({ args }) => args.includes("publish")).every(({ command, args }) => command === "npm" && args.includes("--registry") && args.includes(REGISTRY) && args.includes("--tag") && args.includes("release-pr-42") && args.includes("--access") && args.includes("restricted")));
});

test("partial publication retries reuse only checksum-matching immutable packages", (t) => {
	const packagesDir = createPackages(t);
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A });
	const npmrc = join(packagesDir, "scoped.npmrc");
	writeFileSync(npmrc, "@scramjet:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=test-token\n");
	const environment = {
		NODE_AUTH_TOKEN: "test-token",
		NPM_CONFIG_USERCONFIG: npmrc,
		PRERELEASE_PUBLISH_ENABLED: "true",
		SCRAMJET_GH_PACKAGES_PRERELEASE_PUBLISHER: "github-packages",
	};
	const published = new Map();
	let failedOnce = false;
	const runner = (command, args, options) => {
		if (args[0] === "view") {
			const entry = manifest.packages.find((item) => `${item.name}@${item.version}` === args[1]);
			if (!published.has(entry.name)) throw new Error("not found");
			return JSON.stringify(published.get(entry.name));
		}
		const packageJson = JSON.parse(readFileSync(join(options.cwd, "package.json"), "utf8"));
		if (packageJson.name === "@scramjet/b" && !failedOnce) {
			failedOnce = true;
			throw new Error("transient publish failure");
		}
		published.set(packageJson.name, packageJson);
	};

	t.throws(() => publishManifest({ manifest, packagesDir, environment, runner }), { message: /transient publish failure/i });
	const retry = publishManifest({ manifest, packagesDir, environment, runner });
	t.deepEqual(retry.reused, ["@scramjet/a"]);
	t.deepEqual(retry.published, ["@scramjet/b"]);
});

test("immutable version collisions with a matching source checksum but mismatched final package checksum fail closed", (t) => {
	const packagesDir = createPackages(t);
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A });
	const npmrc = join(packagesDir, "scoped.npmrc");
	writeFileSync(npmrc, "@scramjet:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=test-token\n");
	const mismatched = {
		name: manifest.packages[0].name,
		version: manifest.packages[0].version,
		scramjet: {
			prerelease: {
				attempt: ATTEMPT_A,
				sourceChecksum: manifest.packages[0].sourceChecksum,
				packageChecksum: `sha256:${"0".repeat(64)}`,
			},
		},
	};
	t.throws(() => publishManifest({
		manifest,
		packagesDir,
		environment: {
			NODE_AUTH_TOKEN: "test-token",
			NPM_CONFIG_USERCONFIG: npmrc,
			PRERELEASE_PUBLISH_ENABLED: "true",
			SCRAMJET_GH_PACKAGES_PRERELEASE_PUBLISHER: "github-packages",
		},
		runner: (_command, args) => args[0] === "view" ? JSON.stringify(mismatched) : undefined,
	}), { message: /Immutable prerelease.*matching package checksum/i });
});
