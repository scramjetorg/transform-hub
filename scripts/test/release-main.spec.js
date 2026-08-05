"use strict";

const test = require("ava").default;
const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { assertOidcPublication, createRelease, publishRelease, verifyRelease, writeRelease } = require("../release-main.js");

const SHA = "a".repeat(40);
const BOUNDARY = new Set(["@scramjet/a", "@scramjet/b"]);

function fixture(t) {
	const root = mkdtempSync(join(tmpdir(), "main-release-"));
	t.teardown(() => rmSync(root, { force: true, recursive: true }));
	for (const [directory, manifest] of Object.entries({
		a: { name: "@scramjet/a", version: "2.0.0", dependencies: { "@scramjet/b": "2.0.0" } },
		b: { name: "@scramjet/b", version: "2.0.0" },
	})) {
		mkdirSync(join(root, directory), { recursive: true });
		writeFileSync(join(root, directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
	}
	return root;
}

function release(t) {
	const packagesDir = fixture(t);
	const document = createRelease({ boundary: BOUNDARY, node: "v22.16.0", npm: "10.9.2", packagesDir, sourceSha: SHA });
	const output = join(packagesDir, "release.json");
	return { document: writeRelease(output, document).document, packagesDir };
}

test("main release identity preserves boundary dependency order and package checksums", (t) => {
	const { document, packagesDir } = release(t);
	t.deepEqual(document.packages.map((entry) => entry.name), ["@scramjet/b", "@scramjet/a"]);
	t.is(document.identity.source.sha, SHA);
	verifyRelease(document, packagesDir);
	const packageA = JSON.parse(readFileSync(join(packagesDir, "a", "package.json"), "utf8"));
	t.is(packageA.scramjet.release.identityDigest, document.identityDigest);
	t.is(packageA.scramjet.release.packageChecksum, document.packages.find((entry) => entry.name === "@scramjet/a").checksum);
});

test("main publication fails closed without protected OIDC and reuses only matching immutable packages", (t) => {
	const { document, packagesDir } = release(t);
	t.throws(() => assertOidcPublication({ MAIN_RELEASE_PUBLISH_ENABLED: "true" }), { message: /OIDC/i });
	const environment = { ACTIONS_ID_TOKEN_REQUEST_TOKEN: "token", ACTIONS_ID_TOKEN_REQUEST_URL: "url", MAIN_RELEASE_PUBLISH_ENABLED: "true" };
	const published = new Map();
	const runner = (_command, args, options) => {
		if (args[0] === "view") {
			const entry = document.packages.find((item) => `${item.name}@${item.version}` === args[1]);
			if (!published.has(entry.name)) throw new Error("not found");
			return JSON.stringify(published.get(entry.name));
		}
		const packageJson = JSON.parse(readFileSync(join(options.cwd, "package.json"), "utf8"));
		published.set(packageJson.name, packageJson);
	};
	t.deepEqual(publishRelease({ environment, packagesDir, release: document, runner }), { published: ["@scramjet/b", "@scramjet/a"], reused: [] });
	t.deepEqual(publishRelease({ environment, packagesDir, release: document, runner }), { published: [], reused: ["@scramjet/b", "@scramjet/a"] });
});

test("main publication rejects immutable versions with an identity or checksum mismatch", (t) => {
	const { document, packagesDir } = release(t);
	const entry = document.packages[0];
	t.throws(() => publishRelease({
		environment: { ACTIONS_ID_TOKEN_REQUEST_TOKEN: "token", ACTIONS_ID_TOKEN_REQUEST_URL: "url", MAIN_RELEASE_PUBLISH_ENABLED: "true" },
		packagesDir,
		release: document,
		runner: (_command, args) => args[0] === "view" ? JSON.stringify({ name: entry.name, scramjet: { release: { identityDigest: document.identityDigest, packageChecksum: `sha256:${"0".repeat(64)}` } }, version: entry.version }) : undefined,
	}), { message: /Immutable production.*checksum/i });
});
