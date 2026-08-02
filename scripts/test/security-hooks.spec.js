"use strict";

const test = require("ava");

const { artifactForPlatform, checksumForArchive, readManifest } = require("../security/bootstrap-gitleaks.js");
const { ZERO_SHA, outgoingRange, parseOutgoingRefs, scanOutgoingRefs } = require("../security/pre-push.js");
const { parseArgs: parseHistoryArgs, scanGitHistory } = require("../security/scan-git-history.js");

const LOCAL_SHA = "a".repeat(40);
const REMOTE_SHA = "b".repeat(40);

test("pins official v8.21.2 archive hashes for every supported platform", (t) => {
	const manifest = readManifest();
	t.deepEqual(
		Object.fromEntries(Object.entries(manifest.artifacts).map(([platform, artifact]) => [platform, artifact.sha256])),
		{
			"darwin-arm64": "sha256:cad3de5dc9a4d5447d967a70a4d49499c557f04db028274cc324f9ff983f6502",
			"darwin-x64": "sha256:5b42c6e4b1fd693eaeb2b5b7faa5f17a1434299d4deb2de63d4b2efd7c753128",
			"linux-arm64": "sha256:654c935542c89f565aabe7bf7c6c500830f116c114f0aeb509d2460c1ac2e6da",
			"linux-x64": "sha256:5bc41815076e6ed6ef8fbecc9d9b75bcae31f39029ceb55da08086315316e3ba",
		},
	);
	t.is(artifactForPlatform(manifest, "linux-x64").file, "gitleaks_8.21.2_linux_x64.tar.gz");
});

test("extracts the exact pinned archive checksum", (t) => {
	const archive = "gitleaks_8.21.2_linux_x64.tar.gz";
	const checksum = "c".repeat(64);
	t.is(checksumForArchive(`${checksum}  ${archive}\n`, archive), `sha256:${checksum}`);
	t.throws(() => checksumForArchive(`${checksum} other-file.tar.gz\n`, archive));
});

test("parses outgoing updates, new branches, and deletions", (t) => {
	const refs = parseOutgoingRefs([
		`refs/heads/devel ${LOCAL_SHA} refs/heads/devel ${REMOTE_SHA}`,
		`refs/heads/topic ${LOCAL_SHA} refs/heads/topic ${ZERO_SHA}`,
		`(delete) ${ZERO_SHA} refs/heads/old ${REMOTE_SHA}`,
	].join("\n"));

	t.is(outgoingRange(refs[0]), `${REMOTE_SHA}..${LOCAL_SHA}`);
	t.is(outgoingRange(refs[1]), LOCAL_SHA);
	t.is(outgoingRange(refs[2]), null);
});

test("rejects malformed pre-push protocol input", (t) => {
	t.throws(() => parseOutgoingRefs("refs/heads/main not-a-sha refs/heads/main also-not-a-sha"));
});

test("fails closed when the verified scanner is unavailable", async (t) => {
	const error = await t.throwsAsync(() => scanOutgoingRefs(
		`refs/heads/devel ${LOCAL_SHA} refs/heads/devel ${REMOTE_SHA}`,
		{ scanner: async () => { throw new Error("missing scanner"); } },
	));

	t.true(error.message.includes("verified Gitleaks scanner is unavailable"));
});

test("does not expose scanner output when a synthetic finding rejects a push", async (t) => {
	const syntheticFinding = "synthetic-secret-value-do-not-use";
	const error = await t.throwsAsync(() => scanOutgoingRefs(
		`refs/heads/devel ${LOCAL_SHA} refs/heads/devel ${REMOTE_SHA}`,
		{
			scanner: async () => "/verified/gitleaks",
			spawn: () => ({ status: 1, stderr: syntheticFinding, stdout: syntheticFinding }),
		},
	));

	t.false(error.message.includes(syntheticFinding));
	t.true(error.message.includes("Secret scan blocked outgoing ref"));
});

test("runs Gitleaks with redaction over the outgoing commit range", async (t) => {
	let invocation;
	await scanOutgoingRefs(
		`refs/heads/devel ${LOCAL_SHA} refs/heads/devel ${REMOTE_SHA}`,
		{
			scanner: async () => "/verified/gitleaks",
			spawn: (binary, args, options) => {
				invocation = { args, binary, options };
				return { status: 0 };
			},
		},
	);

	t.is(invocation.binary, "/verified/gitleaks");
	t.true(invocation.args.includes("--redact"));
	t.true(invocation.args.includes("--log-opts"));
	t.true(invocation.args.includes(`${REMOTE_SHA}..${LOCAL_SHA}`));
	t.is(invocation.options.stdio, "pipe");
});

test("parses only explicit history ranges or all-history scanning", (t) => {
	t.deepEqual(parseHistoryArgs(["--all"]), { logOpts: "--all" });
	t.deepEqual(parseHistoryArgs(["--range", `${REMOTE_SHA}..${LOCAL_SHA}`]), {
		logOpts: `${REMOTE_SHA}..${LOCAL_SHA}`,
	});
	t.throws(() => parseHistoryArgs(["--range", "main..HEAD"]));
});

test("CI history scanning uses redaction without exposing a synthetic finding", async (t) => {
	const syntheticFinding = "synthetic-secret-value-do-not-use";
	const error = await t.throwsAsync(() => scanGitHistory(["--all"], {
		scanner: async () => "/verified/gitleaks",
		spawn: () => ({ status: 1, stderr: syntheticFinding, stdout: syntheticFinding }),
	}));

	t.false(error.message.includes(syntheticFinding));
	t.true(error.message.includes("Secret scan failed"));
});
