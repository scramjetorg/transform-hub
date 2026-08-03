"use strict";

const test = require("ava");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { checkpointLabels, createIdentity, createStatement, digestDocument } = require("../checkpoint/provenance.js");
const { assertLabels, dockerfile, immutableReference, parseArgs, parseRemoteSha, publishCheckpoint, statementDockerfile } = require("../checkpoint/publish.js");

const REPOSITORY = "ghcr.io/scramjetorg/transform-hub/ci-deps";
const SOURCE_SHA = "b".repeat(40);
const IMAGE_DIGEST = `sha256:${"a".repeat(64)}`;

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

test("checkpoint publication requires all trusted publication inputs", (t) => {
	t.deepEqual(parseArgs([
		"--plan", "checkpoint-plan.json",
		"--branch", "devel",
		"--source-sha", "b".repeat(40),
		"--current-sha", "b".repeat(40),
		"--npm-cache", "/tmp/npm-cache",
	]), {
		plan: "checkpoint-plan.json",
		branch: "devel",
		sourceSha: "b".repeat(40),
		currentSha: "b".repeat(40),
		npmCache: "/tmp/npm-cache",
	});
	t.throws(() => parseArgs(["--plan", "checkpoint-plan.json"]), { message: /required/i });
});

test("checkpoint publication verifies immutable digests and provenance labels", (t) => {
	const reference = immutableReference(REPOSITORY, `${REPOSITORY}@${IMAGE_DIGEST}\n`);
	t.deepEqual(reference, { digest: IMAGE_DIGEST, reference: `${REPOSITORY}@${IMAGE_DIGEST}` });
	t.throws(() => immutableReference(REPOSITORY, `${REPOSITORY}:cp-v1-current`), { message: /immutable image digest/i });

	const labels = { "io.scramjet.provenance.identity-digest": IMAGE_DIGEST };
	t.true(dockerfile(labels).includes(`LABEL io.scramjet.provenance.identity-digest="${IMAGE_DIGEST}"`));
	t.true(statementDockerfile(labels).includes("FROM scratch"));
	assertLabels(labels, labels);
	t.throws(() => assertLabels({}, labels), { message: /label mismatch/i });
});

test("checkpoint publication validates the remote source SHA before pointer promotion", (t) => {
	t.is(parseRemoteSha(`${"b".repeat(40)}\trefs/heads/devel\n`), "b".repeat(40));
	t.throws(() => parseRemoteSha(""), { message: /trusted branch SHA/i });
});

test("checkpoint publication builds, verifies, and promotes only a matching immutable image", (t) => {
	const cache = mkdtempSync(join(tmpdir(), "checkpoint-publish-test-"));
	const checkpointIdentity = identity();
	const identityDigest = digestDocument(checkpointIdentity);
	const labels = checkpointLabels(checkpointIdentity, identityDigest);
	const statement = createStatement({
		identityDigest,
		image: { digest: IMAGE_DIGEST, platform: "linux/amd64", repository: REPOSITORY },
	});
	const statementLabels = {
		...labels,
		"io.scramjet.provenance.statement-digest": digestDocument(statement),
	};
	const commands = [];
	const previousConfiguration = process.env.SCRAMJET_GHCR_SCOPED_PUBLISHER;
	process.env.SCRAMJET_GHCR_SCOPED_PUBLISHER = "true";
	t.teardown(() => {
		rmSync(cache, { force: true, recursive: true });
		if (previousConfiguration === undefined) delete process.env.SCRAMJET_GHCR_SCOPED_PUBLISHER;
		else process.env.SCRAMJET_GHCR_SCOPED_PUBLISHER = previousConfiguration;
	});

	const result = publishCheckpoint({
		branch: "devel",
		currentSha: SOURCE_SHA,
		npmCache: cache,
		plan: {
			dryRun: true,
			identity: checkpointIdentity,
			identityDigest,
			labels,
			promotion: { repository: REPOSITORY },
		},
		sourceSha: SOURCE_SHA,
	}, {
		remoteSha: () => SOURCE_SHA,
		run: (args, capture) => {
			commands.push(args);
			if (!capture) return "";
			if (args.includes("{{json .Config.Labels}}")) return JSON.stringify(args.some((arg) => arg.includes("-statement")) ? statementLabels : labels);
			if (args.includes("{{join .RepoDigests \"\\n\"}}")) return `${REPOSITORY}@${IMAGE_DIGEST}`;
			if (args[0] === "buildx") return IMAGE_DIGEST;
			throw new Error(`Unexpected captured command: ${args.join(" ")}`);
		},
	});

	t.is(result.mode, "live-promote");
	t.is(result.reference, `${REPOSITORY}@${IMAGE_DIGEST}`);
	t.true(result.statementReference.endsWith("-statement"));
	t.deepEqual(commands.map(([command]) => command), ["build", "image", "push", "image", "build", "image", "push", "tag", "push", "buildx"]);
});
