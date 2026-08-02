"use strict";

const test = require("ava");

const { promotionDecision } = require("../checkpoint/promotion.js");

const SOURCE_SHA = "a".repeat(40);
const IDENTITY_DIGEST = `sha256:${"b".repeat(64)}`;
const REFERENCE = `ghcr.io/scramjetorg/transform-hub/ci-deps@sha256:${"c".repeat(64)}`;

function plan() {
	return {
		dryRun: true,
		identityDigest: IDENTITY_DIGEST,
		promotion: { repository: "ghcr.io/scramjetorg/transform-hub/ci-deps" },
	};
}

test("reuses only an immutable checkpoint with the matching identity", (t) => {
	const decision = promotionDecision({
		checkpointIdentityDigest: IDENTITY_DIGEST,
		checkpointReference: REFERENCE,
		currentSha: SOURCE_SHA,
		plan: plan(),
		publisherConfigured: true,
		sourceSha: SOURCE_SHA,
	});

	t.is(decision.mode, "live-promote");
	t.is(decision.reference, REFERENCE);
	t.is(decision.pointer.pointerTag, "cp-v1-devel");
});

test("fails closed when publisher configuration or immutable output is absent", (t) => {
	t.throws(() => promotionDecision({
		currentSha: SOURCE_SHA,
		plan: plan(),
		publisherConfigured: false,
		sourceSha: SOURCE_SHA,
	}), { message: /scoped GHCR publisher/i });

	t.throws(() => promotionDecision({
		currentSha: SOURCE_SHA,
		plan: plan(),
		publisherConfigured: true,
		sourceSha: SOURCE_SHA,
	}), { message: /verified immutable/i });
});

test("rejects stale SHA and identity drift", (t) => {
	t.throws(() => promotionDecision({
		currentSha: "d".repeat(40),
		plan: plan(),
		publisherConfigured: true,
		sourceSha: SOURCE_SHA,
	}), { message: /stale checkpoint pointer/i });

	t.throws(() => promotionDecision({
		checkpointIdentityDigest: `sha256:${"e".repeat(64)}`,
		checkpointReference: REFERENCE,
		currentSha: SOURCE_SHA,
		plan: plan(),
		publisherConfigured: true,
		sourceSha: SOURCE_SHA,
	}), { message: /identity does not match/i });

});
