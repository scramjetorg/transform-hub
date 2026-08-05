"use strict";

const test = require("ava").default;
const { rmSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");

const { consumeCheckpoint } = require("../checkpoint/consume.js");
const { checkpointLabels, createIdentity, createStatement, digestDocument } = require("../checkpoint/provenance.js");

const REPOSITORY = "ghcr.io/scramjetorg/transform-hub/ci-deps";
const SOURCE_SHA = "a".repeat(40);
const IMAGE_DIGEST = `sha256:${"b".repeat(64)}`;
const STATEMENT_IMAGE_DIGEST = `sha256:${"e".repeat(64)}`;

function identity() {
	return createIdentity({
		lockSha256: `sha256:${"c".repeat(64)}`,
		node: "v22.14.0",
		npm: "10.9.2",
		packages: [{ name: "@scramjet/sth", packageJsonSha256: `sha256:${"d".repeat(64)}`, version: "2.0.0" }],
		platform: { oci: "linux/amd64", runner: "linux/x64" },
		repository: "https://github.com/scramjetorg/transform-hub",
		sourceSha: SOURCE_SHA,
	});
}

function consumerFixture({ cacheLabels = null } = {}) {
	const expectedIdentity = identity();
	const identityDigest = digestDocument(expectedIdentity);
	const statement = createStatement({
		identityDigest,
		image: { digest: IMAGE_DIGEST, platform: "linux/amd64", repository: REPOSITORY },
	});
	const labels = checkpointLabels(expectedIdentity, identityDigest);
	let container = 0;

	return {
		createPlan: async () => ({
			identity: expectedIdentity,
			identityDigest,
			promotion: { pointerTag: "cp-v1-devel" },
		}),
		run: (args, capture) => {
			if (args[0] === "pull") return "";
			if (args[0] === "image" && args.includes("{{join .RepoDigests \"\\n\"}}")) {
				return `${REPOSITORY}@${args.some((arg) => arg.includes("-statement")) ? STATEMENT_IMAGE_DIGEST : IMAGE_DIGEST}`;
			}
			if (args[0] === "image" && args.includes("{{json .Config.Labels}}")) {
				return JSON.stringify(args.some((arg) => arg.includes(STATEMENT_IMAGE_DIGEST))
					? { ...labels, "io.scramjet.provenance.statement-digest": digestDocument(statement) }
					: (cacheLabels || labels));
			}
			if (args[0] === "create") return `container-${container++}`;
			if (args[0] === "cp") {
				const [source, destination] = args.slice(1);
				if (source.includes("identity.v1.json")) writeFileSync(join(destination, "identity.v1.json"), JSON.stringify(expectedIdentity));
				if (source.includes("statement.v1.json")) writeFileSync(join(destination, "statement.v1.json"), JSON.stringify(statement));
				return "";
			}
			if (args[0] === "rm") return "";
			throw new Error(`Unexpected Docker command: ${args.join(" ")}`);
		},
	};
}

test("uses clean npm ci when no compatible checkpoint branch exists", async (t) => {
	const result = await consumeCheckpoint({ branch: "release/unsupported" }, { log: () => {} });
	t.deepEqual(result, { checkpoint: null, fallback: "clean-npm-ci", reason: "no-compatible-checkpoint-branch" });
});

test("rejects a pointer image whose identity labels do not match the checkout", async (t) => {
	const fixture = consumerFixture({ cacheLabels: {} });
	const result = await consumeCheckpoint({ branch: "devel" }, {
		...fixture,
		log: () => {},
		sourceSha: () => SOURCE_SHA,
	});
	t.is(result.reason, "image-label-mismatch");
	t.is(result.fallback, "clean-npm-ci");
});

test("uses only a digest-bound, label-verified checkpoint cache", async (t) => {
	const fixture = consumerFixture();
	const result = await consumeCheckpoint({ branch: "devel" }, {
		...fixture,
		log: () => {},
		sourceSha: () => SOURCE_SHA,
	});
	t.is(result.checkpoint, `${REPOSITORY}@${IMAGE_DIGEST}`);
	t.truthy(result.cache);
	rmSync(dirname(result.cache), { force: true, recursive: true });
});
