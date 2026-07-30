"use strict";

const test = require("ava");

const {
	canonicalize,
	checkpointLabels,
	createIdentity,
	createStatement,
	digestDocument,
	immutableTag,
	pointerTag,
	pointerUpdatePlan,
	resolveCheckpoint,
} = require("../checkpoint/provenance.js");

const SOURCE_SHA = "a".repeat(40);
const LOCK_SHA = `sha256:${"b".repeat(64)}`;
const PACKAGE_SHA = `sha256:${"c".repeat(64)}`;
const IMAGE_DIGEST = `sha256:${"d".repeat(64)}`;

function identity() {
	return createIdentity({
		lockSha256: LOCK_SHA,
		node: "v22.14.0",
		npm: "10.9.2",
		packages: [{ name: "@scramjet/sth", packageJsonSha256: PACKAGE_SHA, version: "2.0.0" }],
		platform: { oci: "linux/amd64", runner: "linux/x64" },
		repository: "https://github.com/scramjetorg/transform-hub",
		sourceSha: SOURCE_SHA,
	});
}

test("canonical provenance digest is independent of object key order", (t) => {
	t.is(canonicalize({ b: 2, a: 1 }), canonicalize({ a: 1, b: 2 }));
	t.is(digestDocument({ b: 2, a: 1 }), digestDocument({ a: 1, b: 2 }));
});

test("derives immutable tags and trusted branch pointers", (t) => {
	const digest = digestDocument(identity());
	t.is(immutableTag(digest), `cp-v1-${digest.slice(7)}`);
	t.is(pointerTag("feat/manager-oss"), "cp-v1-feat-manager-oss");
	t.throws(() => pointerTag("feature/untrusted"));
});

test("consumes only a matching statement image by immutable digest", (t) => {
	const sourceIdentity = identity();
	const identityDigest = digestDocument(sourceIdentity);
	const statement = createStatement({
		identityDigest,
		image: { digest: IMAGE_DIGEST, platform: "linux/amd64", repository: "ghcr.io/scramjetorg/transform-hub/ci-deps" },
	});
	const resolved = resolveCheckpoint({
		branch: "devel",
		expectedIdentity: sourceIdentity,
		checkpoint: {
			digest: IMAGE_DIGEST,
			identity: sourceIdentity,
			identityDigest,
			labels: checkpointLabels(sourceIdentity, identityDigest),
			repository: "ghcr.io/scramjetorg/transform-hub/ci-deps",
			statement,
		},
	});

	t.is(resolved.checkpoint, `ghcr.io/scramjetorg/transform-hub/ci-deps@${IMAGE_DIGEST}`);
	t.is(resolved.pointerTag, "cp-v1-devel");
});

test("falls back when checkpoint labels do not match the expected identity", (t) => {
	const sourceIdentity = identity();
	const identityDigest = digestDocument(sourceIdentity);
	const resolved = resolveCheckpoint({
		branch: "devel",
		expectedIdentity: sourceIdentity,
		checkpoint: {
			digest: IMAGE_DIGEST,
			identity: sourceIdentity,
			identityDigest,
			labels: {},
			repository: "ghcr.io/scramjetorg/transform-hub/ci-deps",
			statement: createStatement({
				identityDigest,
				image: { digest: IMAGE_DIGEST, platform: "linux/amd64", repository: "ghcr.io/scramjetorg/transform-hub/ci-deps" },
			}),
		},
	});

	t.is(resolved.reason, "image-label-mismatch");
});

test("falls back to a clean npm install when checkpoint identity is missing or mismatched", (t) => {
	const fallback = resolveCheckpoint({ branch: "main", expectedIdentity: identity(), checkpoint: null });
	t.deepEqual(fallback, { checkpoint: null, fallback: "clean-npm-ci", reason: "no-checkpoint-pointer" });

	const mismatched = resolveCheckpoint({
		branch: "main",
		expectedIdentity: identity(),
		checkpoint: { digest: IMAGE_DIGEST, identity: identity(), identityDigest: `sha256:${"e".repeat(64)}` },
	});
	t.is(mismatched.fallback, "clean-npm-ci");
});

test("rejects stale pointer updates", (t) => {
	const digest = digestDocument(identity());
	t.throws(() => pointerUpdatePlan({
		branch: "devel",
		currentSha: "f".repeat(40),
		identityDigest: digest,
		repository: "ghcr.io/scramjetorg/transform-hub/ci-deps",
		sourceSha: SOURCE_SHA,
	}), { message: /stale checkpoint pointer/i });
});
