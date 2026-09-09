"use strict";

const test = require("ava").default;
const { spawnSync } = require("node:child_process");
const {
	chmodSync,
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const { artifactForPlatform, checksumForArchive, readManifest } = require("../security/bootstrap-gitleaks.js");
const { REQUIRED_HOOKS } = require("../security/install-hooks.js");
const { ZERO_SHA, outgoingRange, parseOutgoingRefs, scanOutgoingRefs } = require("../security/pre-push.js");
const { parseArgs: parseHistoryArgs, scanGitHistory } = require("../security/scan-git-history.js");

const LOCAL_SHA = "a".repeat(40);
const REMOTE_SHA = "b".repeat(40);
const GITLEAKS_IGNORE = resolve(__dirname, "..", "..", ".gitleaksignore");
const EXACT_FINGERPRINT = /^[a-f0-9]{40}:[^:\r\n]+:[^:\r\n]+:[1-9][0-9]*$/i;
const ENTRY_COMMENT = "# Reviewed historic generated/test/revoked record; exact user-approved exception.";
const APPROVED_HISTORICAL_FINGERPRINTS = [
	"211fcbc025895b0945107a874a2f789b17fa72b4:sth-config-dev-aw3-new.json:generic-api-key:17",
	"2f22e3d928ef94d9509e5f1e990f274ecb9209e4:packages/cli/test/config.spec.ts:jwt:19",
	"2f22e3d928ef94d9509e5f1e990f274ecb9209e4:packages/cli/test/config.spec.ts:jwt:20",
	"4d362dca26f14365df13a20604f21b8b0aa10322:.slim/codemap.json:generic-api-key:192",
	"4d362dca26f14365df13a20604f21b8b0aa10322:.slim/codemap.json:generic-api-key:193",
	"4d362dca26f14365df13a20604f21b8b0aa10322:.slim/codemap.json:generic-api-key:195",
	"4d362dca26f14365df13a20604f21b8b0aa10322:.slim/codemap.json:generic-api-key:257",
	"4d362dca26f14365df13a20604f21b8b0aa10322:.slim/codemap.json:generic-api-key:697",
	"4d362dca26f14365df13a20604f21b8b0aa10322:.slim/codemap.json:generic-api-key:699",
	"4d362dca26f14365df13a20604f21b8b0aa10322:.slim/codemap.json:generic-api-key:703",
	"4d362dca26f14365df13a20604f21b8b0aa10322:.slim/codemap.json:generic-api-key:737",
	"4d362dca26f14365df13a20604f21b8b0aa10322:.slim/codemap.json:generic-api-key:758",
	"4d362dca26f14365df13a20604f21b8b0aa10322:.slim/codemap.json:generic-api-key:769",
	"4d362dca26f14365df13a20604f21b8b0aa10322:.slim/codemap.json:generic-api-key:782",
	"4d362dca26f14365df13a20604f21b8b0aa10322:.slim/codemap.json:generic-api-key:94",
	"7c812a472e6a4ea74a82356258b173c52e3507fe:packages/manager/test/verser2-trust-export.spec.ts:private-key:87",
	"7ee0e2092b9752f744d2b8ee41c6e68ad4c61114:.slim/codemap.json:generic-api-key:173",
	"7ee0e2092b9752f744d2b8ee41c6e68ad4c61114:.slim/codemap.json:generic-api-key:682",
	"adc67de07825c9157565a6a5590160b65c695345:.slim/codemap.json:generic-api-key:584",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:192",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:194",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:195",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:255",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:256",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:257",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:317",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:318",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:319",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:694",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:696",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:700",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:753",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:755",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:766",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:779",
	"e2b5f6138b6b04cf1f84c6711735153a7ff04f81:.slim/codemap.json:generic-api-key:85",
	"f85512f25fc30b150117af925ffe85426185b158:packages/cli/test/config.spec.ts:jwt:20",
	"f85512f25fc30b150117af925ffe85426185b158:packages/cli/test/config.spec.ts:jwt:21",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:168",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:311",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:339",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:508",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:574",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:576",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:608",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:621",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:632",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:665",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:666",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:667",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:668",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:669",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:670",
	"f8b4dd6ed0c5b162996fc65de722b3f33ab5e100:.slim/codemap.json:generic-api-key:671",
];

test("keeps historical Gitleaks exceptions exact and auditable", (t) => {
	const lines = readFileSync(GITLEAKS_IGNORE, "utf8").trimEnd().split(/\r?\n/);
	const fingerprints = lines.filter((line) => line && !line.startsWith("#"));

	t.true(lines.includes("# User approval: 2026-08-03; owner: repository maintainers; review expiry: 2027-08-03."));
	t.true(lines.includes("# Rationale: reviewed historic generated/test/revoked records."));
	t.true(lines.includes("# Each entry is an exact immutable commit:file:rule-id:startLine fingerprint; no token values are retained."));
	t.deepEqual(fingerprints, APPROVED_HISTORICAL_FINGERPRINTS);
	t.is(fingerprints.length, 54);
	t.is(new Set(fingerprints).size, fingerprints.length);
	for (const fingerprint of fingerprints) {
		t.regex(fingerprint, EXACT_FINGERPRINT);
		t.is(lines[lines.indexOf(fingerprint) - 1], ENTRY_COMMENT);
	}
});

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

test("repository-managed hooks include an executable pre-commit lockfile gate and the pre-push scanner", (t) => {
	const rootPkg = require("../../package.json");
	t.is(
		rootPkg.scripts["check:lockfile"],
		"npm run build:lockfile && git diff --exit-code -- package-lock.json",
		"check:lockfile must compose the pinned rebuild with the diff gate"
	);
	t.is(
		rootPkg.scripts["build:lockfile"],
		"npx --yes npm@11.19.0 install --package-lock-only --ignore-scripts",
		"build:lockfile must stay pinned to npm 11.19.0"
	);

	const preCommit = resolve(__dirname, "..", "..", ".githooks", "pre-commit");
	const prePush = resolve(__dirname, "..", "..", ".githooks", "pre-push");
	const preCommitSource = readFileSync(preCommit, "utf8");

	t.true(preCommitSource.includes("check:lockfile"), "pre-commit must reference the shared check:lockfile command");
	t.regex(
		preCommitSource,
		/npm\s+--prefix\s+"\$repo_root"\s+run\s+check:lockfile/,
		"pre-commit must invoke npm run check:lockfile at the repository root"
	);
	t.true((statSync(preCommit).mode & 0o111) !== 0, "pre-commit must be executable");
	t.true((statSync(prePush).mode & 0o111) !== 0, "pre-push must remain executable");
});

test("install-hooks requires and installs both checked-in repository hooks", (t) => {
	t.deepEqual(REQUIRED_HOOKS, ["pre-commit", "pre-push"]);

	for (const hook of REQUIRED_HOOKS) {
		const hookPath = resolve(__dirname, "..", "..", ".githooks", hook);
		t.true(existsSync(hookPath), `${hook} must be checked in under .githooks`);
		t.true((statSync(hookPath).mode & 0o111) !== 0, `${hook} must be executable`);
	}

	const source = readFileSync(resolve(__dirname, "..", "security", "install-hooks.js"), "utf8");
	t.true(source.includes('"pre-commit"'), "install-hooks must require the checked-in pre-commit hook");
	t.true(source.includes('"pre-push"'), "install-hooks must require the checked-in pre-push hook");
	t.true(source.includes("core.hooksPath"), "install-hooks must keep configuring core.hooksPath");
	t.true(source.includes('".githooks"'), "core.hooksPath must remain .githooks");
});

test("pre-commit hook runs check:lockfile and blocks commits with a stale lockfile", (t) => {
	const root = mkdtempSync(join(tmpdir(), "lockfile-gate-"));
	t.teardown(() => rmSync(root, { recursive: true, force: true }));

	const repoRoot = join(root, "repo");
	mkdirSync(join(repoRoot, ".githooks"), { recursive: true });

	const rootPkg = require("../../package.json");
	const checkLockfile = rootPkg.scripts["check:lockfile"];
	t.true(typeof checkLockfile === "string" && checkLockfile.length > 0, "root package.json must define check:lockfile");

	// The fixture mirrors the root wiring exactly: the same check:lockfile
	// string, with an offline deterministic stand-in for the pinned npm rebuild
	// that derives the lockfile from package.json like a real lock rebuild.
	writeFileSync(
		join(repoRoot, "package.json"),
		JSON.stringify({
			name: "lockfile-gate-fixture",
			version: "1.0.0",
			private: true,
			scripts: {
				"build:lockfile": "node build-lockfile.js",
				"check:lockfile": checkLockfile,
			},
			dependencies: {},
		}, null, 2) + "\n",
	);
	writeFileSync(
		join(repoRoot, "build-lockfile.js"),
		[
			'const { writeFileSync } = require("node:fs");',
			'const pkg = require("./package.json");',
			'writeFileSync("package-lock.json", JSON.stringify({ name: pkg.name, lockfileVersion: 3, packages: { "": { name: pkg.name, version: pkg.version, dependencies: pkg.dependencies } } }, null, 2) + "\\n");',
		].join("\n") + "\n",
	);

	// Use the real tracked hook: this guards the hook -> npm run check:lockfile
	// wiring against drift.
	copyFileSync(resolve(__dirname, "..", "..", ".githooks", "pre-commit"), join(repoRoot, ".githooks", "pre-commit"));
	chmodSync(join(repoRoot, ".githooks", "pre-commit"), 0o755);

	const git = (...args) => spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
	const run = (script) => spawnSync("node", [script], { cwd: repoRoot, encoding: "utf8" });

	t.is(git("init", "-q").status, 0, "git init must succeed");
	t.is(git("config", "core.hooksPath", ".githooks").status, 0, "core.hooksPath must be configured");
	t.is(git("config", "user.name", "lockfile-gate-test").status, 0, "test user.name must be configured");
	t.is(git("config", "user.email", "lockfile-gate-test@example.com").status, 0, "test user.email must be configured");

	// Baseline: generate a reproducible lockfile and commit it. The hook must
	// pass when the lockfile rebuild produces no diff.
	t.is(run("build-lockfile.js").status, 0, "baseline lockfile generation must succeed");
	t.is(git("add", ".").status, 0, "baseline files must stage");
	t.is(git("commit", "-q", "-m", "baseline").status, 0, "a reproducible lockfile must not block the commit");

	// Stale: editing package.json without regenerating the lockfile must block
	// the next commit through the pre-commit hook.
	writeFileSync(
		join(repoRoot, "package.json"),
		readFileSync(join(repoRoot, "package.json"), "utf8").replace('"dependencies": {}', '"dependencies": { "left-pad": "^1.3.0" }'),
	);
	const blocked = git("commit", "-q", "--allow-empty", "-m", "stale lockfile");
	t.not(blocked.status, 0, "a stale lockfile must block the commit via pre-commit");
	t.is(git("rev-list", "--count", "HEAD").stdout.trim(), "1", "the blocked commit must not be created");

	// The hook's rebuild already regenerated the lockfile in the working tree;
	// staging the synced state must commit cleanly again.
	t.is(git("add", "-A").status, 0, "regenerated state must stage");
	t.is(git("commit", "-q", "-m", "regenerated lockfile").status, 0, "the regenerated lockfile must commit cleanly");
});
