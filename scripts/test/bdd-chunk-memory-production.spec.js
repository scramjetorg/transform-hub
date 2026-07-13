"use strict";

const test = require("ava");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const runner = path.resolve(__dirname, "..", "run-bdd-docker.js");

function createFakeDocker(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-fake-docker-"));
    const executable = path.join(root, "docker");
    fs.writeFileSync(executable, `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
if (args[0] === "--version") process.exit(0);
if (args[0] === "run") {
  const volume = args.find((arg, index) => args[index - 1] === "-v" && arg.endsWith(":/work-tmp"));
  const tmp = volume && volume.slice(0, -":/work-tmp".length);
  const breach = process.env.BDD_FAKE_RESULT === "breach";
  const missing = process.env.BDD_FAKE_RESULT === "missing";
  const conflict = process.env.BDD_FAKE_RESULT === "conflict";
  const processPresent = process.env.BDD_FAKE_RESULT === "process-present";
  const expected = JSON.parse(process.env.SCRAMJET_BDD_EXPECTED_COMPONENTS || "{}");
  const limit = 2 * 1024 * 1024;
  const finalGrowth = breach ? limit + 1 : 0;
  const metrics = {
    featurePaths: ["features/e2e/fake.feature"],
    componentExpectations: conflict ? { container: true, processes: [] } : expected,
    parentHeap: {
      baselineBytes: 100,
      peakBytes: missing ? null : 100,
      finalBytes: missing ? null : 100,
      finalGrowthBytes: missing ? null : finalGrowth,
      peakGrowthBytes: missing ? null : finalGrowth,
      sampleCount: 1
    },
    processes: processPresent ? [{ label: "hub:owned", pid: 123, baselineRss: 100, readyBaselineRss: 100, peakRss: 110, finalRss: 105, finalGrowthBytes: 5, peakGrowthBytes: 10, expectExit: true, lifecycle: "exited" }] : [],
    chunkContainer: { readyBytes: 100, finalBytes: 100, peakBytes: 100, sampleCount: 3, enginePeakSampleCount: 1 }
  };
  fs.writeFileSync(path.join(tmp, "chunk-memory.json"), JSON.stringify(metrics));
  fs.writeFileSync(path.join(tmp, "chunk-ready.json"), JSON.stringify({ ready: true, containerReadyBytes: 100 }));
  process.stdout.write("fake-container\\n");
  process.exit(0);
}
if (args[0] === "inspect") { process.stdout.write(JSON.stringify({ OOMKilled: false, StartedAt: "now", FinishedAt: "now" })); process.exit(0); }
if (args[0] === "wait") { process.stdout.write("0\\n"); process.exit(0); }
process.exit(0);
`, { mode: 0o755 });
    t.teardown(() => fs.rmSync(root, { recursive: true, force: true }));
    return root;
}

function runProductionPath(t, result) {
    const fakeDockerRoot = createFakeDocker(t);
    return spawnSync(process.execPath, [runner, "--", "--fail-fast"], {
        cwd: path.resolve(__dirname, "../.."),
        encoding: "utf8",
        env: {
            ...process.env,
            PATH: `${fakeDockerRoot}:${process.env.PATH}`,
            SCRAMJET_BDD_MEMORY_GUARD: "1",
            SCRAMJET_BDD_CHUNK_MEMORY_POLICY: "enforce",
            SCRAMJET_BDD_EXPECTED_COMPONENTS: JSON.stringify({ container: true, processes: result === "conflict" || result.startsWith("process-") ? ["hub:"] : [] }),
            BDD_FAKE_RESULT: result,
        },
    });
}

test("production Docker runner rejects an enforced chunk limit breach", t => {
    const result = runProductionPath(t, "breach");
    t.not(result.status, 0);
    t.true(`${result.stderr}${result.stdout}`.includes("WOULD_FAIL"));
});

test("production Docker runner rejects enforced insufficient telemetry", t => {
    const result = runProductionPath(t, "missing");
    t.not(result.status, 0);
    t.true(`${result.stderr}${result.stdout}`.includes("INSUFFICIENT_TELEMETRY"));
    t.true(`${result.stderr}${result.stdout}`.includes("parent final measurement"));
});

test("production Docker runner rejects downgraded metrics component expectations", t => {
    const result = runProductionPath(t, "conflict");
    t.not(result.status, 0);
    t.true(`${result.stderr}${result.stdout}`.includes("conflicting metrics component expectations"));
});

test("production Docker runner admits a required process from completed telemetry", t => {
    const result = runProductionPath(t, "process-present");
    t.is(result.status, 0);
});

test("production Docker runner rejects a missing required process", t => {
    const result = runProductionPath(t, "process-absent");
    t.not(result.status, 0);
    t.true(`${result.stderr}${result.stdout}`.includes("expected process component hub:"));
});
