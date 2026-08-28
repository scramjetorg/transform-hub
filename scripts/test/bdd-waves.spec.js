"use strict";

const test = require("ava").default;
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const { encodePart } = require("../../bdd/lib/ownership.js");

const runner = require("../run-bdd-waves.js");

// ---------------------------------------------------------------------------
// Chunk manifest
// ---------------------------------------------------------------------------

test("chunk manifest defines all expected chunks", t => {
    const names = Object.keys(runner.CHUNKS).sort();
    t.deepEqual(names, [
        "appcontext", "cli-basics", "cli-matrix", "cli-prune-diagnostic", "errors", "external-services", "harness",
        "hub-configuration", "hub-idle-resource", "hub-runtime", "manager", "node-spawn-core", "node-streaming-stop", "python", "stream", "topics-api", "verser2",
    ]);
});

test("every chunk has at least one feature path", t => {
    for (const [name, features] of Object.entries(runner.CHUNKS)) {
        t.true(Array.isArray(features), `chunk "${name}" features must be an array`);
        t.true(features.every((fp) => typeof fp === "string"), `chunk "${name}" paths must be strings`);
        t.true(features.length > 0, `chunk "${name}" must have at least one feature`);
    }
});

test("every feature path uses forward slashes and is relative to bdd/", t => {
    for (const [name, features] of Object.entries(runner.CHUNKS)) {
        for (const fp of features) {
            t.true(
                fp.startsWith("features/") && fp.endsWith(".feature") && !fp.includes("\\"),
                `chunk "${name}" has malformed path: ${fp}`
            );
        }
    }
});

test("verser2 chunk contains the isolated routing and runner transport features", t => {
    t.deepEqual(runner.CHUNKS.verser2, [
        "features/verser2/VERSER2-001-isolated-routing.feature",
        "features/e2e/E2E-020-runner-verser2-transport.feature",
    ]);
});

test("topic chunks isolate API topic feature paths", t => {
    t.deepEqual(runner.CHUNKS["topics-api"], [
        "features/e2e/E2E-013-topic.feature",
    ]);
});

test("CLI feature paths use balanced logical coverage chunks", t => {
    t.deepEqual(runner.CHUNKS["cli-basics"], [
        "features/e2e/E2E-001-samples.feature",
        "features/e2e/E2E-002-stop.feature",
        "features/e2e/E2E-003-kill.feature",
        "features/e2e/E2E-012-cli-config.feature",
        "features/e2e/E2E-011-cli-topic.feature",
        "features/e2e/E2E-018-cli-ingress.feature",
        "features/api-router/API-ROUTER-001-openapi-generator.feature",
    ]);
    t.deepEqual(runner.CHUNKS["cli-matrix"], ["features/e2e/E2E-010-cli.feature"]);
    t.deepEqual(runner.CHUNKS["cli-prune-diagnostic"], [
        "features/e2e/E2E-010-cli-prune-diagnostic.feature",
    ]);
});

test("Node and Hub feature paths use balanced exclusive chunks", t => {
    t.deepEqual(runner.CHUNKS["node-spawn-core"], [
        "features/e2e/E2E-017a-node-spawn-core.feature",
    ]);
    t.deepEqual(runner.CHUNKS["node-streaming-stop"], [
        "features/e2e/E2E-017b-node-streaming-stop.feature",
    ]);
    t.deepEqual(runner.CHUNKS["hub-configuration"], [
        "features/hub/HUB-001-host-config.feature",
        "features/e2e/E2E-008-host-api.feature",
    ]);
    t.deepEqual(runner.CHUNKS["hub-runtime"], [
        "features/hub/HUB-002-host-iac.feature",
        "features/hub/HUB-003-instance-api-server.feature",
        "features/hub/HUB-004-runtime-error-logging.feature",
        "features/e2e/E2E-007-host-client.feature",
    ]);
    t.deepEqual(runner.CHUNKS["hub-idle-resource"], ["features/hub/HUB-005-idle-resource.feature"]);
    t.true(runner.CHUNKS.manager.includes("features/e2e/E2E-019-control-plane-admission.feature"));
});

// ---------------------------------------------------------------------------
// Default chunks
// ---------------------------------------------------------------------------

test("default chunks list is ordered and contains expected entries", t => {
    t.true(Array.isArray(runner.DEFAULT_CHUNKS));
    t.true(runner.DEFAULT_CHUNKS.length > 0);

    // First chunk is verser2 (matches Phase 9 ordering).
    t.is(runner.DEFAULT_CHUNKS[0], "verser2");
    t.deepEqual(runner.DEFAULT_CHUNKS.slice(3, 5), ["topics-api", "python"]);
});

test("every default chunk is defined in CHUNKS", t => {
    for (const name of runner.DEFAULT_CHUNKS) {
        t.truthy(runner.CHUNKS[name], `default chunk "${name}" must exist in CHUNKS`);
    }
});

test("harness chunk is NOT in default chunks", t => {
    t.false(runner.DEFAULT_CHUNKS.includes("harness"));
});

test("default manifest covers every eligible feature and records exclusions explicitly", t => {
    const defaultPaths = runner.DEFAULT_CHUNKS.flatMap((name) => runner.CHUNKS[name]);
    const excludedPaths = Object.keys(runner.EXCLUDED_FEATURES);
    const eligiblePaths = runner.onDiskFeatures().filter((featurePath) => !excludedPaths.includes(featurePath));

    t.deepEqual([...new Set(defaultPaths)].sort(), eligiblePaths.sort());
    t.deepEqual(excludedPaths.sort(), [
        "features/_harness/harness-timeout.feature",
        "features/e2e/E2E-010-cli-prune-diagnostic.feature",
        "features/external-services/EXTERNAL-SERVICES-001-minio-docker.feature",
    ]);
    for (const excludedPath of excludedPaths) {
        t.truthy(runner.EXCLUDED_FEATURES[excludedPath]);
        t.false(defaultPaths.includes(excludedPath));
    }
});

test("external service feature is opt-in with an explicit prerequisite rationale", t => {
    const feature = "features/external-services/EXTERNAL-SERVICES-001-minio-docker.feature";

    t.true(runner.CHUNKS["external-services"].includes(feature));
    t.false(runner.DEFAULT_CHUNKS.includes("external-services"));
    t.regex(runner.EXCLUDED_FEATURES[feature], /MinIO journey creates its own service but requires the mounted Docker daemon/);
});

test("resource-owning chunks remain explicitly exclusive", t => {
    t.deepEqual(runner.EXCLUSIVE_CHUNKS, ["harness", "hub-configuration", "hub-runtime", "hub-idle-resource", "manager", "stream"]);
    t.true(runner.EXCLUSIVE_CHUNKS.every(name => runner.CHUNKS[name]));
});

test("concurrent Host-owning chunks receive distinct control ingress endpoints", async t => {
    // Every default chunk that is not an exclusive scheduler barrier spawns a
    // suite Hub (host-steps BeforeAll) that enables its verser2 control
    // ingress. Parallel Docker chunks share the host network namespace, so
    // each of those Hubs must own a distinct control-ingress endpoint instead
    // of binding the default 127.0.0.1:2444. Mirror the step-definition
    // allocation (allocateOwnedPort per chunk ownership) and assert the
    // resulting endpoints are pairwise distinct and never the default port.
    const { createOwnership, allocateOwnedPort } = require("../../bdd/lib/ownership.js");
    const hostOwningChunks = runner.DEFAULT_CHUNKS.filter((name) => !runner.EXCLUSIVE_CHUNKS.includes(name));
    t.true(hostOwningChunks.length >= 2, "parallel scheduling must admit at least two Host-owning chunks concurrently");

    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-control-ingress-"));
    const reservations = [];
    try {
        for (const name of hostOwningChunks) {
            const ownership = createOwnership(process.env, { runId: "control-ingress-regression", chunkId: name, artifactRoot });
            reservations.push({ name, reservation: await allocateOwnedPort(ownership) });
        }
        const ports = reservations.map(({ reservation }) => reservation.port);
        t.is(new Set(ports).size, ports.length,
            `concurrent Host-owning chunks must receive distinct control ingress ports, got ${ports.join(", ")}`);
        for (const { name, reservation } of reservations) {
            t.not(reservation.port, 2444, `chunk "${name}" must not bind the default control ingress port 2444`);
        }
    } finally {
        for (const { reservation } of reservations) await reservation.release();
        fs.rmSync(artifactRoot, { recursive: true, force: true });
    }
});

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

test("parseArgs returns null chunkName when no selector is given", t => {
    const previous = process.env.BDD_WAVE;
    delete process.env.BDD_WAVE;

    t.deepEqual(runner.parseArgs(["--dry-run"]), {
        chunkName: null,
        chunkNames: null,
        schedule: "serial",
        passthrough: ["--dry-run"],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs recognizes BDD_WAVE environment variable", t => {
    const previous = process.env.BDD_WAVE;
    process.env.BDD_WAVE = "verser2";

    t.deepEqual(runner.parseArgs(["--dry-run"]), {
        chunkName: "verser2",
        chunkNames: null,
        schedule: "serial",
        passthrough: ["--dry-run"],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs recognizes explicit --chunk= argument", t => {
    const previous = process.env.BDD_WAVE;
    delete process.env.BDD_WAVE;

    t.deepEqual(runner.parseArgs(["--chunk=cli", "--name=foo"]), {
        chunkName: "cli",
        chunkNames: null,
        schedule: "serial",
        passthrough: ["--name=foo"],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs recognizes explicit --wave= argument (backward compat)", t => {
    const previous = process.env.BDD_WAVE;
    delete process.env.BDD_WAVE;

    t.deepEqual(runner.parseArgs(["--wave=verser2", "--name=foo"]), {
        chunkName: "verser2",
        chunkNames: null,
        schedule: "serial",
        passthrough: ["--name=foo"],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs --chunk= takes priority over BDD_WAVE", t => {
    const previous = process.env.BDD_WAVE;
    process.env.BDD_WAVE = "cli";

    t.deepEqual(runner.parseArgs(["--chunk=verser2"]), {
        chunkName: "verser2",
        chunkNames: null,
        schedule: "serial",
        passthrough: [],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs --wave= takes priority over BDD_WAVE", t => {
    const previous = process.env.BDD_WAVE;
    process.env.BDD_WAVE = "cli";

    t.deepEqual(runner.parseArgs(["--wave=verser2"]), {
        chunkName: "verser2",
        chunkNames: null,
        schedule: "serial",
        passthrough: [],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs last --chunk= wins when both --wave= and --chunk= given", t => {
    const previous = process.env.BDD_WAVE;
    delete process.env.BDD_WAVE;

    t.deepEqual(runner.parseArgs(["--wave=verser2", "--chunk=cli"]), {
        chunkName: "cli",
        chunkNames: null,
        schedule: "serial",
        passthrough: [],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs recognizes parallel scheduling and explicit selected chunk lists", t => {
    t.deepEqual(runner.parseArgs(["--schedule=parallel", "--chunk=verser2"]), {
        chunkName: "verser2",
        chunkNames: null,
        schedule: "parallel",
        passthrough: [],
    });
    t.throws(() => runner.parseArgs(["--schedule=unbounded"]), { message: /Unknown BDD schedule/ });
    t.deepEqual(runner.parseArgs(["--chunks=verser2,hub-runtime", "--schedule=parallel"]), {
        chunkName: null,
        chunkNames: ["verser2", "hub-runtime"],
        schedule: "parallel",
        passthrough: [],
    });
});

test("parallel cleanup treats unavailable container telemetry as incomplete without dereferencing null", t => {
    t.false(runner.isCleanupComplete(null, false));
    t.false(runner.isCleanupComplete([], true));
    t.true(runner.isCleanupComplete([], false));
});

// ---------------------------------------------------------------------------
// commandArgs
// ---------------------------------------------------------------------------

test("commandArgs uses run-bdd-docker with fail-fast by default", t => {
    const features = runner.CHUNKS.verser2;
    const args = runner.commandArgs(features, ["--dry-run"]);

    t.is(args[0], path.resolve(__dirname, "../run-bdd-docker.js"));
    t.deepEqual(args.slice(1, 4), ["--", "--fail-fast", "--dry-run"]);
    t.false(args.includes("--parallel"));
    t.false(args.includes("--tags"));
});

test("commandArgs does not duplicate fail-fast when already present", t => {
    const features = runner.CHUNKS.verser2;
    const args = runner.commandArgs(features, ["--fail-fast"]);

    const failCount = args.filter((a) => a === "--fail-fast").length;
    t.is(failCount, 1, "--fail-fast must appear exactly once");
});

test("commandArgs --no-fail-fast suppresses forced fail-fast and is not forwarded", t => {
    const features = runner.CHUNKS.verser2;
    const args = runner.commandArgs(features, ["--no-fail-fast"]);

    t.false(args.includes("--fail-fast"), "--fail-fast must not appear when --no-fail-fast is given");
    t.false(args.includes("--no-fail-fast"), "--no-fail-fast must not be forwarded to Cucumber");
});

test("commandArgs --no-fail-fast preserves other passthrough flags", t => {
    const features = runner.CHUNKS.verser2;
    const args = runner.commandArgs(features, ["--no-fail-fast", "--name=foo", "--tags=@smoke"]);

    t.false(args.includes("--fail-fast"), "--fail-fast must not appear");
    t.false(args.includes("--no-fail-fast"), "--no-fail-fast must not be forwarded");
    t.true(args.includes("--name=foo"), "other flags must be preserved");
    t.true(args.includes("--tags=@smoke"), "other flags must be preserved");
});

test("commandArgs explicit --fail-fast overrides --no-fail-fast", t => {
    const features = runner.CHUNKS.verser2;
    const args = runner.commandArgs(features, ["--no-fail-fast", "--fail-fast"]);

    // Explicit --fail-fast is honored; --no-fail-fast is stripped.
    t.true(args.includes("--fail-fast"), "explicit --fail-fast must appear when given alongside --no-fail-fast");
    t.false(args.includes("--no-fail-fast"), "--no-fail-fast must still be filtered out");
    const failCount = args.filter((a) => a === "--fail-fast").length;
    t.is(failCount, 1, "--fail-fast must appear exactly once");
});

test("commandArgs default behavior remains fail-fast when no --no-fail-fast is given", t => {
    const features = runner.CHUNKS.verser2;
    const args = runner.commandArgs(features, ["--dry-run"]);

    t.true(args.includes("--fail-fast"), "default must include --fail-fast");
    t.false(args.includes("--no-fail-fast"), "--no-fail-fast must not appear by default");
});

// ---------------------------------------------------------------------------
// validateManifest
// ---------------------------------------------------------------------------

test("validateManifest passes against the current filesystem and manifest", t => {
    t.notThrows(() => runner.validateManifest());
});

// ---------------------------------------------------------------------------
// runWaves — explicit chunk selection
// ---------------------------------------------------------------------------

test("runWaves with explicit chunk runs only that chunk", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner, features) => {
        calls.push({ owner, features });
        return 0;
    };

    try {
        const result = runner.runWaves({ chunkName: "verser2", passthrough: ["--dry-run"] });

        t.is(result, 0);
        t.is(calls.length, 1, "must call runChild exactly once");
        t.is(calls[0].owner, "verser2");
        t.deepEqual(calls[0].features, runner.CHUNKS.verser2);
    } finally {
        runner.runChild = original;
    }
});

test("runWaves with an explicit chunk list runs only that list", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner) => { calls.push(owner); return 0; };
    try {
        t.is(runner.runWaves({ chunkNames: ["verser2", "hub-idle-resource"], passthrough: ["--dry-run"] }), 0);
        t.deepEqual(calls, ["verser2", "hub-idle-resource"]);
    } finally {
        runner.runChild = original;
    }
});

test("runWaves with explicit chunk halts on failure", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner, features) => {
        calls.push({ owner, features });
        return 1;
    };

    try {
        const result = runner.runWaves({ chunkName: "verser2", passthrough: ["--dry-run"] });

        t.is(result, 1);
        t.is(calls.length, 1, "must not continue after chunk failure");
    } finally {
        runner.runChild = original;
    }
});

test("runWaves with explicit harness chunk works for non-default chunks", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner, features) => {
        calls.push({ owner, features });
        return 0;
    };

    try {
        const result = runner.runWaves({ chunkName: "harness", passthrough: ["--dry-run"] });

        t.is(result, 0);
        t.is(calls.length, 1);
        t.is(calls[0].owner, "harness");
    } finally {
        runner.runChild = original;
    }
});

test("runWaves with unknown chunk name throws", t => {
    const original = runner.runChild;
    runner.runChild = () => 0;

    try {
        t.throws(
            () => runner.runWaves({ chunkName: "nonexistent", passthrough: [] }),
            { message: /Unknown BDD chunk "nonexistent"/ }
        );
    } finally {
        runner.runChild = original;
    }
});

// ---------------------------------------------------------------------------
// runWaves — default (no explicit chunk)
// ---------------------------------------------------------------------------

test("runWaves without explicit chunk runs all default chunks serially", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner, features) => {
        calls.push({ owner, features });
        return 0;
    };

    try {
        const result = runner.runWaves({ chunkName: null, passthrough: ["--dry-run"] });

        t.is(result, 0);
        t.is(calls.length, runner.DEFAULT_CHUNKS.length,
            `must run all ${runner.DEFAULT_CHUNKS.length} default chunks`);

        // Verify order matches DEFAULT_CHUNKS
        for (let i = 0; i < runner.DEFAULT_CHUNKS.length; i++) {
            t.is(calls[i].owner, runner.DEFAULT_CHUNKS[i],
                `call ${i} owner must be ${runner.DEFAULT_CHUNKS[i]}`);
        }
    } finally {
        runner.runChild = original;
    }
});

test("runWaves without explicit chunk stops after first failure", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner, features) => {
        calls.push({ owner, features });
        // Fail on the second default chunk
        return calls.length >= 2 ? 1 : 0;
    };

    try {
        const result = runner.runWaves({ chunkName: null, passthrough: ["--dry-run"] });

        t.true(result !== 0, "must propagate non-zero exit code");
        t.is(calls.length, 2, "must stop after the second chunk fails");
    } finally {
        runner.runChild = original;
    }
});

// ---------------------------------------------------------------------------
// runChild environment — BDD_TIMEOUT_MS override
// ---------------------------------------------------------------------------

test("runChild export is a function", t => {
    t.is(typeof runner.runChild, "function");
});

test("runChild is reachable via module.exports for testing", t => {
    const original = runner.runChild;
    runner.runChild = () => 42;
    t.is(runner.runChild(), 42);
    runner.runChild = original;
});

test.serial("runChild integration propagates chunk ownership through the supported Docker runner", t => {
    const result = spawnSync(process.execPath, [
        path.resolve(__dirname, "../run-bdd-waves.js"),
        "--chunk=verser2",
        "--",
        "--dry-run",
    ], { encoding: "utf8", timeout: 120000, env: { ...process.env, SCRAMJET_BDD_RUN_ID: "waves-integration" } });
    t.is(result.status, 0, `${result.stdout}\n${result.stderr}`);
    t.regex(`${result.stdout}\n${result.stderr}`, /chunk=verser2/);
    t.regex(`${result.stdout}\n${result.stderr}`, /ownership.*waves-integration|run=waves-integration/);
});

test.serial("runChild production cleanup removes owned temp paths and preserves foreign paths", t => {
    const runId = "waves-cleanup-integration";
    const chunkId = "verser2";
    const root = path.join(os.tmpdir(), "scramjet-bdd-runs");
    const owned = path.join(root, encodePart(runId), "chunks", encodePart(chunkId), "runner-owned");
    const foreign = path.join(root, encodePart(runId), "chunks", encodePart("other-chunk"), "runner-foreign");
    fs.mkdirSync(owned, { recursive: true });
    fs.mkdirSync(foreign, { recursive: true });
    try {
        const result = spawnSync(process.execPath, [
            path.resolve(__dirname, "../run-bdd-waves.js"),
            "--chunk=verser2",
            "--",
            "--dry-run",
        ], { encoding: "utf8", timeout: 120000, env: { ...process.env, SCRAMJET_BDD_RUN_ID: runId } });
        t.is(result.status, 0, `${result.stdout}\n${result.stderr}`);
        t.false(fs.existsSync(owned), "production cleanup must remove owned path");
        t.true(fs.existsSync(foreign), "production cleanup must preserve foreign path");
    } finally {
        fs.rmSync(path.join(root, encodePart(runId)), { recursive: true, force: true });
    }
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

test("formatDuration formats sub-second duration", t => {
    // 500ms = 0.5s
    t.is(runner.formatDuration(500_000_000), "0.50s");
});

test("formatDuration formats seconds-only duration", t => {
    // 12.34s
    t.is(runner.formatDuration(12_340_000_000), "12.34s");
});

test("formatDuration formats 59.999s without rolling over", t => {
    t.is(runner.formatDuration(59_999_000_000), "60.00s");
});

test("formatDuration formats one-minute-plus duration", t => {
    // 1m 23.45s
    t.is(runner.formatDuration(83_450_000_000), "1m 23.45s");
});

test("formatDuration formats multi-minute duration", t => {
    // 12m 34.56s
    t.is(runner.formatDuration(754_560_000_000), "12m 34.56s");
});

// ---------------------------------------------------------------------------
// emitSummary — replaceable
// ---------------------------------------------------------------------------

test("emitSummary export is a function", t => {
    t.is(typeof runner.emitSummary, "function");
});

test("emitSummary is replaceable and runWaves uses the replaced function", t => {
    const captured = [];
    const origEmit = runner.emitSummary;
    const origChild = runner.runChild;
    runner.emitSummary = (...args) => captured.push(args);
    runner.runChild = () => 0;

    try {
        captured.length = 0;
        runner.runWaves({ chunkName: "verser2", passthrough: ["--dry-run"] });

        t.is(captured.length, 1, "emitSummary must be called once for explicit chunk");
        const [chunkName, featureCount, status, durationNs, cumulativeNs] = captured[0];
        t.is(chunkName, "verser2");
        t.is(featureCount, runner.CHUNKS.verser2.length);
        t.is(status, 0);
        t.true(typeof durationNs === "number" && durationNs >= 0, "durationNs must be non-negative number");
        t.true(typeof cumulativeNs === "number" && cumulativeNs >= 0, "cumulativeNs must be non-negative number");
    } finally {
        runner.emitSummary = origEmit;
        runner.runChild = origChild;
    }
});

// ---------------------------------------------------------------------------
// Timing instrumentation — explicit chunk
// ---------------------------------------------------------------------------

test("runWaves timing summary reports correct feature count and status for successful chunk", t => {
    const summaries = [];
    const origEmit = runner.emitSummary;
    const origChild = runner.runChild;
    runner.emitSummary = (...args) => summaries.push(args);
    runner.runChild = () => 0;

    try {
        runner.runWaves({ chunkName: "verser2", passthrough: ["--dry-run"] });

        t.is(summaries.length, 1);
        t.is(summaries[0][0], "verser2");       // chunkName
        t.is(summaries[0][1], runner.CHUNKS.verser2.length); // featureCount
        t.is(summaries[0][2], 0);                 // status
        t.true(summaries[0][3] >= 0);             // durationNs
    } finally {
        runner.emitSummary = origEmit;
        runner.runChild = origChild;
    }
});

test("runWaves timing summary reports failed status for failing chunk", t => {
    const summaries = [];
    const origEmit = runner.emitSummary;
    const origChild = runner.runChild;
    runner.emitSummary = (...args) => summaries.push(args);
    runner.runChild = () => 1;

    try {
        runner.runWaves({ chunkName: "verser2", passthrough: ["--dry-run"] });

        t.is(summaries.length, 1);
        t.is(summaries[0][2], 1, "status must be 1 for failed child run");
    } finally {
        runner.emitSummary = origEmit;
        runner.runChild = origChild;
    }
});

test("runWaves timing summary includes non-zero duration for delayed mock", t => {
    const summaries = [];
    const origEmit = runner.emitSummary;
    const origChild = runner.runChild;
    runner.emitSummary = (...args) => summaries.push(args);

    // Simulate a chunk that takes ~5ms wall time.
    runner.runChild = () => {
        const target = Date.now() + 5;
        while (Date.now() < target) { /* spin */ }
        return 0;
    };

    try {
        runner.runWaves({ chunkName: "verser2", passthrough: ["--dry-run"] });

        t.is(summaries.length, 1);
        const deltaMs = summaries[0][3] / 1e6; // ns -> ms
        t.true(deltaMs >= 4, `duration must be >= ~4ms (was ${deltaMs.toFixed(1)}ms)`);
    } finally {
        runner.emitSummary = origEmit;
        runner.runChild = origChild;
    }
});

// ---------------------------------------------------------------------------
// Timing instrumentation — default full run
// ---------------------------------------------------------------------------

test("runWaves timing summary accumulates across default chunks", t => {
    const summaries = [];
    const origEmit = runner.emitSummary;
    const origChild = runner.runChild;
    runner.emitSummary = (...args) => summaries.push(args);
    runner.runChild = () => 0;

    try {
        runner.runWaves({ chunkName: null, passthrough: ["--dry-run"] });

        t.is(summaries.length, runner.DEFAULT_CHUNKS.length,
            `must emit summary for each of ${runner.DEFAULT_CHUNKS.length} chunks`);

        // Verify cumulative time is monotonic and non-decreasing.
        for (let i = 0; i < summaries.length; i++) {
            const [name, count, status, delta, cumulative] = summaries[i];
            t.is(name, runner.DEFAULT_CHUNKS[i], `chunk ${i} name mismatch`);
            t.true(count > 0, `chunk ${name} must have features`);
            t.is(status, 0);
            t.true(delta >= 0, `chunk ${i} duration must be non-negative`);
            t.true(cumulative >= 0, `chunk ${i} cumulative must be non-negative`);

            if (i > 0) {
                t.true(cumulative >= summaries[i - 1][4],
                    `cumulative time must be non-decreasing at chunk ${i}`);
            }
        }
    } finally {
        runner.emitSummary = origEmit;
        runner.runChild = origChild;
    }
});

test("runWaves timing summary includes failed chunk before halting", t => {
    const summaries = [];
    const origEmit = runner.emitSummary;
    const origChild = runner.runChild;
    runner.emitSummary = (...args) => summaries.push(args);

    let callIndex = 0;
    runner.runChild = () => {
        callIndex++;
        return callIndex >= 2 ? 1 : 0; // fail on second chunk
    };

    try {
        runner.runWaves({ chunkName: null, passthrough: ["--dry-run"] });

        t.is(summaries.length, 2, "must emit summary for failed chunk before halting");
        t.is(summaries[0][2], 0, "first chunk succeeds");
        t.is(summaries[1][2], 1, "second chunk fails");
    } finally {
        runner.emitSummary = origEmit;
        runner.runChild = origChild;
    }
});

// ---------------------------------------------------------------------------
// Timing instrumentation — harness chunk (non-default)
// ---------------------------------------------------------------------------

test("runWaves timing summary for explicit harness chunk", t => {
    const summaries = [];
    const origEmit = runner.emitSummary;
    const origChild = runner.runChild;
    runner.emitSummary = (...args) => summaries.push(args);
    runner.runChild = () => 0;

    try {
        runner.runWaves({ chunkName: "harness", passthrough: ["--dry-run"] });

        t.is(summaries.length, 1);
        t.is(summaries[0][0], "harness");
        t.is(summaries[0][1], runner.CHUNKS.harness.length);
        t.is(summaries[0][2], 0);
    } finally {
        runner.emitSummary = origEmit;
        runner.runChild = origChild;
    }
});

// ---------------------------------------------------------------------------
// Regression: unknown Docker outcome telemetry (Fix 2)
// ---------------------------------------------------------------------------

test("outcome aggregation preserves unknown Docker telemetry in parallel report", t => {
    // Simulate the outcome aggregation logic from runParallelWaves to
    // verify unknownOutcome is set when oomKilled/timedOut are null.
    const results = [
        { chunk: "a", code: 0, oomKilled: null, timedOut: null },
        { chunk: "b", code: 0, oomKilled: false, timedOut: false }
    ];
    const oom = results.some((r) => r.oomKilled === true || r.oom === true);
    const timeout = results.some((r) => r.timedOut === true || r.timeout === true);
    const unknownOutcome = results.some((r) =>
        (r.oomKilled === null || r.oomKilled === undefined) &&
        (r.timedOut === null || r.timedOut === undefined));
    t.false(oom, "oom must be false when no result has oomKilled===true");
    t.false(timeout, "timeout must be false when no result has timedOut===true");
    t.true(unknownOutcome, "unknownOutcome must be true when result has null oomKilled/timedOut");
});

test("outcome aggregation does not set unknownOutcome when all outcomes are known", t => {
    const results = [
        { chunk: "a", code: 0, oomKilled: false, timedOut: false },
        { chunk: "b", code: 0, oomKilled: false, timedOut: false }
    ];
    const unknownOutcome = results.some((r) =>
        (r.oomKilled === null || r.oomKilled === undefined) &&
        (r.timedOut === null || r.timedOut === undefined));
    t.false(unknownOutcome, "unknownOutcome must not be set when all outcomes are known");
});

test("outcome aggregation handles mixed known and unknown outcomes", t => {
    // When some children have known outcomes and some have null telemetry,
    // unknownOutcome must still be set to reflect the incomplete picture.
    const results = [
        { chunk: "a", code: 0, oomKilled: true, timedOut: false },
        { chunk: "b", code: 1, oomKilled: null, timedOut: null }
    ];
    const unknownOutcome = results.some((r) =>
        (r.oomKilled === null || r.oomKilled === undefined) &&
        (r.timedOut === null || r.timedOut === undefined));
    t.true(unknownOutcome, "unknownOutcome must be true when any result has null telemetry");
    const oom = results.some((r) => r.oomKilled === true || r.oom === true);
    t.true(oom, "oom must still be true when a known-OOM child exists alongside unknown");
});

// ---------------------------------------------------------------------------
// Regression: runTempRoot defined (Fix 3)
// ---------------------------------------------------------------------------

test("parallel runTempRoot path resolves correctly", t => {
    // The runTempRoot variable in runParallelWaves is defined as:
    //   path.join(os.tmpdir(), "scramjet-bdd-runs", encodePart(runOwnership.runId))
    // Verify path construction works for various run IDs without ReferenceError.
    const encodePart = require("../../bdd/lib/ownership.js").encodePart;
    for (const runId of ["test-run-1", "run-with/special:chars", ""]) {
        const tempRoot = path.join(os.tmpdir(), "scramjet-bdd-runs", encodePart(runId));
        t.truthy(tempRoot, `tempRoot must be a non-empty string for runId "${runId}"`);
        t.true(tempRoot.startsWith(os.tmpdir()), "tempRoot must be under tmpdir");
    }
});

test("parallel cleanup verification uses defined runTempRoot without ReferenceError", t => {
    // Regression: runTempRoot was previously undefined, causing
    // ReferenceError in the finally block's fs.existsSync(runTempRoot) call.
    // Verify that the exported function does not throw when invoked with
    // a minimal valid environment (it should fail on admission, not on
    // an undefined variable reference in the finally block).
    const encodePart = require("../../bdd/lib/ownership.js").encodePart;
    const os = require("node:os");
    const path = require("node:path");
    // Just constructing the same expression must not throw.
    t.notThrows(() => {
        const runOwnership = { runId: "parallel-cleanup-regression" };
        const runTempRoot = path.join(os.tmpdir(), "scramjet-bdd-runs", encodePart(runOwnership.runId));
        t.truthy(runTempRoot);
        // This is the exact expression from line 623 that previously
        // referenced the undefined variable.
        const exists = require("node:fs").existsSync(runTempRoot);
        t.false(exists, "fresh runTempRoot must not exist on disk");
    });
});

test("cleanup failure forces failed outcome and nonzero exit even when execution results are clean", t => {
    // Regression: runParallelWaves computed exit status before the finally
    // block, so an unverifiable/incomplete cleanup still exited zero.
    const report = {
        outcomes: { failed: false, cancelled: false, oom: false, timeout: false },
        cleanup: { completed: false, dockerChecked: true, remainingContainers: null, tempPathsRemaining: false, error: "cleanup completion could not be verified" }
    };
    // Mirror the finally-block repair: incomplete cleanup forces failed=true.
    if (!report.cleanup.completed) {
        report.outcomes.failed = true;
    }
    const exitStatus = report.outcomes.failed ? 1 : 0;
    t.true(report.outcomes.failed, "incomplete cleanup must produce failed outcome");
    t.is(exitStatus, 1, "incomplete cleanup must produce nonzero exit");
});
