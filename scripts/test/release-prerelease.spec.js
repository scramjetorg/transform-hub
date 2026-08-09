"use strict";

const test = require("ava").default;
const { execFileSync } = require("node:child_process");
const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const {
	REGISTRY,
	assertLivePublicationConfigured,
	createManifest,
	prereleasePackageName,
	publishManifest,
	releasePrereleaseVersion,
	verifyManifest,
	writeManifest,
} = require("../release-prerelease.js");

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const ATTEMPT_A = "r100.a1";
const ATTEMPT_B = "r100.a2";
const TEST_BOUNDARY = new Set(["@scramjet/a", "@scramjet/b"]);
const NPM_CLI = join(__dirname, "..", "..", "node_modules", "npm", "bin", "npm-cli.js");

function createPackages(t, extra = {}, { external = true } = {}) {
	const root = mkdtempSync(join(tmpdir(), "release-prerelease-"));
	t.teardown(() => rmSync(root, { force: true, recursive: true }));
	for (const [directory, manifest] of Object.entries({
		"scramjet-a": {
			name: "@scramjet/a",
			version: "2.0.0",
			dependencies: { "@scramjet/b": "^2.0.0", ...(external ? { "@signicode/verser2-host": "0.7.0" } : {}) },
			devDependencies: { "@scramjet/b": "^2.0.0" },
		},
		"scramjet-b": { name: "@scramjet/b", version: "1.4.0" },
		...extra,
	})) {
		const packageDir = join(root, directory);
		mkdirSync(packageDir, { recursive: true });
		writeFileSync(join(packageDir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
		writeFileSync(join(packageDir, "index.js"), directory === "scramjet-a" ? "module.exports = require(\"@scramjet/b\");\n" : "module.exports = \"mapped prerelease dependency\";\n");
		writeFileSync(join(packageDir, "subpaths.js"), directory === "scramjet-a" ? "const required = require(\"@scramjet/b/runtime\");\nconst resolved = require.resolve(\"@scramjet/b/package.json\");\nconst loaded = import(\"@scramjet/b/loader\");\nconst dynamicSubpath = require(`@scramjet/b/${process.env.SUBPATH}`);\nconst external = require(\"@signicode/verser2-host/package.json\");\nmodule.exports = { dynamicSubpath, external, loaded, required, resolved };\n" : "module.exports = {};\n");
		writeFileSync(join(packageDir, "identity.js"), "module.exports = \"@scramjet/a\";\n");
		writeFileSync(join(packageDir, "index.d.ts"), directory === "scramjet-a" ? "export type Dependency = import(\"@scramjet/b\").Dependency;\n" : "export type Dependency = string;\n");
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
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A, boundary: TEST_BOUNDARY });

	t.is(manifest.registry, REGISTRY);
	t.is(manifest.distTag, "release-pr-42");
	t.deepEqual(manifest.packages.map((entry) => entry.name), ["@scramjetorg/a", "@scramjetorg/b"]);
	t.deepEqual(manifest.packages.map((entry) => entry.sourceName), ["@scramjet/a", "@scramjet/b"]);
	t.is(prereleasePackageName("@scramjet/a"), "@scramjetorg/a");
	t.is(manifest.attempt, ATTEMPT_A);
	t.true(manifest.packages.every((entry) => entry.version.endsWith(".aaaaaaaaaaaa.r100.a1")));
	const packageA = JSON.parse(readFileSync(join(packagesDir, "scramjet-a", "package.json"), "utf8"));
	t.is(packageA.name, "@scramjetorg/a");
	t.is(packageA.dependencies["@scramjetorg/b"], manifest.packages.find((entry) => entry.name === "@scramjetorg/b").version);
	t.is(packageA.devDependencies["@scramjetorg/b"], manifest.packages.find((entry) => entry.name === "@scramjetorg/b").version);
	t.false("@scramjet/b" in packageA.dependencies);
	t.is(packageA.dependencies["@signicode/verser2-host"], "0.7.0");
	t.is(packageA.scramjet.prerelease.sourceName, "@scramjet/a");
	t.is(packageA.scramjet.prerelease.registryName, "@scramjetorg/a");
	t.is(packageA.scramjet.prerelease.packageChecksum, manifest.packages.find((entry) => entry.name === "@scramjetorg/a").checksum);
	t.is(readFileSync(join(packagesDir, "scramjet-a", "index.js"), "utf8"), "module.exports = require(\"@scramjetorg/b\");\n");
	t.is(readFileSync(join(packagesDir, "scramjet-a", "subpaths.js"), "utf8"), "const required = require(\"@scramjetorg/b/runtime\");\nconst resolved = require.resolve(\"@scramjetorg/b/package.json\");\nconst loaded = import(\"@scramjetorg/b/loader\");\nconst dynamicSubpath = require(`@scramjetorg/b/${process.env.SUBPATH}`);\nconst external = require(\"@signicode/verser2-host/package.json\");\nmodule.exports = { dynamicSubpath, external, loaded, required, resolved };\n");
	t.is(readFileSync(join(packagesDir, "scramjet-a", "identity.js"), "utf8"), "module.exports = \"@scramjet/a\";\n");
	t.is(readFileSync(join(packagesDir, "scramjet-a", "index.d.ts"), "utf8"), "export type Dependency = import(\"@scramjetorg/b\").Dependency;\n");
	verifyManifest(manifest, packagesDir, TEST_BOUNDARY);
});

test("prerelease validation rejects a restored source package subpath specifier", (t) => {
	const packagesDir = createPackages(t);
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A, boundary: TEST_BOUNDARY });
	const subpaths = join(packagesDir, "scramjet-a", "subpaths.js");
	writeFileSync(subpaths, "module.exports = require.resolve(\"@scramjet/b/package.json\");\n");
	t.throws(() => verifyManifest(manifest, packagesDir, TEST_BOUNDARY), { message: /still references source runtime package @scramjet\/b/i });
});

test("prerelease planning rejects packages outside the GitHub Packages scope", (t) => {
	const packagesDir = createPackages(t, {
		outside: { name: "@scramjet/verser", version: "1.0.0" },
	});
	t.throws(() => createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A, boundary: TEST_BOUNDARY }), { message: /outside the release boundary/i });
});

test("manifest writes are idempotent and reject checksum drift", (t) => {
	const packagesDir = createPackages(t);
	const output = join(packagesDir, "manifest.json");
	const firstManifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A, boundary: TEST_BOUNDARY });
	t.is(writeManifest(output, firstManifest).status, "created");
	const firstContents = readFileSync(output, "utf8");
	const rerunManifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A, boundary: TEST_BOUNDARY });
	t.is(writeManifest(output, rerunManifest).status, "reused");
	t.is(readFileSync(output, "utf8"), firstContents);
	const tampered = { ...rerunManifest, checksum: `sha256:${"0".repeat(64)}` };
	t.throws(() => verifyManifest(tampered, packagesDir, TEST_BOUNDARY), { message: /checksum/i });
});

test("transformed prerelease tarballs install and execute only through the mapped namespace", (t) => {
	const packagesDir = createPackages(t, {}, { external: false });
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A, boundary: TEST_BOUNDARY });
	const tarballs = join(packagesDir, "tarballs");
	const consumer = join(packagesDir, "consumer");
	mkdirSync(tarballs);
	mkdirSync(consumer);
	const packed = manifest.packages.map((entry) => {
		const packageDir = join(packagesDir, entry.path, "..");
		return JSON.parse(execFileSync(process.execPath, [NPM_CLI, "pack", "--ignore-scripts", "--json", "--pack-destination", tarballs], { cwd: packageDir, encoding: "utf8" }))[0].filename;
	});
	writeFileSync(join(consumer, "package.json"), `${JSON.stringify({ name: "mapped-prerelease-consumer", private: true, version: "0.0.0" })}\n`);
	execFileSync(process.execPath, [NPM_CLI, "install", "--ignore-scripts", "--no-package-lock", ...packed.map((name) => join(tarballs, name))], { cwd: consumer, encoding: "utf8" });
	writeFileSync(join(consumer, "consumer.js"), "process.stdout.write(require(\"@scramjetorg/a\"));\n");
	t.is(execFileSync(process.execPath, ["consumer.js"], { cwd: consumer, encoding: "utf8" }), "mapped prerelease dependency");
	const publicResolution = t.throws(() => execFileSync(process.execPath, ["-e", "require.resolve('@scramjet/a')"], { cwd: consumer, stdio: ["ignore", "pipe", "pipe"] }));
	t.regex(publicResolution.stderr.toString("utf8"), /Cannot find module '@scramjet\/a'/);
});

test("live publishing fails closed without scoped configuration and uses exact GitHub Packages policy", (t) => {
	const packagesDir = createPackages(t);
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A, boundary: TEST_BOUNDARY });
	t.throws(() => assertLivePublicationConfigured({}), { message: /disabled/i });
	t.throws(() => publishManifest({ manifest, packagesDir, boundary: TEST_BOUNDARY, environment: { PRERELEASE_PUBLISH_ENABLED: "true" } }), { message: /publisher configuration/i });

	const calls = [];
	const npmrc = join(packagesDir, "scoped.npmrc");
	writeFileSync(npmrc, "@scramjetorg:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=test-token\nalways-auth=true\n");
	publishManifest({
		manifest,
		packagesDir,
		boundary: TEST_BOUNDARY,
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
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A, boundary: TEST_BOUNDARY });
	const npmrc = join(packagesDir, "scoped.npmrc");
	writeFileSync(npmrc, "@scramjetorg:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=test-token\n");
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
		if (packageJson.name === "@scramjetorg/b" && !failedOnce) {
			failedOnce = true;
			throw new Error("transient publish failure");
		}
		published.set(packageJson.name, packageJson);
	};

	t.throws(() => publishManifest({ manifest, packagesDir, boundary: TEST_BOUNDARY, environment, runner }), { message: /transient publish failure/i });
	const retry = publishManifest({ manifest, packagesDir, boundary: TEST_BOUNDARY, environment, runner });
	t.deepEqual(retry.reused, ["@scramjetorg/a"]);
	t.deepEqual(retry.published, ["@scramjetorg/b"]);
});

test("immutable version collisions with a matching source checksum but mismatched final package checksum fail closed", (t) => {
	const packagesDir = createPackages(t);
	const manifest = createManifest({ packagesDir, pullRequest: 42, sha: SHA_A, attempt: ATTEMPT_A, boundary: TEST_BOUNDARY });
	const npmrc = join(packagesDir, "scoped.npmrc");
	writeFileSync(npmrc, "@scramjetorg:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=test-token\n");
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
		boundary: TEST_BOUNDARY,
		environment: {
			NODE_AUTH_TOKEN: "test-token",
			NPM_CONFIG_USERCONFIG: npmrc,
			PRERELEASE_PUBLISH_ENABLED: "true",
			SCRAMJET_GH_PACKAGES_PRERELEASE_PUBLISHER: "github-packages",
		},
		runner: (_command, args) => args[0] === "view" ? JSON.stringify(mismatched) : undefined,
	}), { message: /Immutable prerelease.*matching package checksum/i });
});
