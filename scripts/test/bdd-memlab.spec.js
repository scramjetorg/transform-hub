"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const helper = require("../lib/bdd-memlab.js");

test("preload is a disabled no-op until a selected hook invokes capture", t => {
    const preload = path.resolve(__dirname, "../lib/bdd-memlab-preload.cjs");
    const result = spawnSync(process.execPath, ["-r", preload, "-e", "process.stdout.write(String(globalThis.__scramjetBddMemlabCapture('baseline')))"], { encoding: "utf8", env: { ...process.env, SCRAMJET_BDD_MEMLAB_ARTIFACT_DIR: "" } });
    t.is(result.status, 0);
    t.is(result.stdout, "null");
});

test("scenario selection requires exactly one exact match", t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memlab-select-"));
    const file = path.join(dir, "sample.feature");
    fs.writeFileSync(file, "Feature: sample\n  Scenario: chosen\n  Scenario: other\n");
    t.deepEqual(helper.selectScenario(file, "chosen"), { line: 2, name: "chosen" });
    t.throws(() => helper.selectScenario(file, "missing"), { message: /found 0/ });
    fs.rmSync(dir, { recursive: true, force: true });
});

test("scenario selection rejects outlines and ambiguous names", t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memlab-select-"));
    const outline = path.join(dir, "outline.feature");
    fs.writeFileSync(outline, "Feature: sample\n  Scenario Outline: chosen\n    Given <value>\n    Examples:\n      | value |\n      | one   |\n");
    t.throws(() => helper.selectScenario(outline, "chosen"), { message: /Scenario Outline/ });
    const multiple = path.join(dir, "multiple.feature");
    fs.writeFileSync(multiple, "Feature: sample\n  Scenario: chosen\n  Scenario: chosen\n");
    t.throws(() => helper.selectScenario(multiple, "chosen"), { message: /found 2/ });
    const ignored = path.join(dir, "ignored.feature");
    fs.writeFileSync(ignored, "@ignore\nFeature: sample\n  Scenario: chosen\n");
    t.throws(() => helper.selectScenario(ignored, "chosen"), { message: /@ignore/ });
    fs.rmSync(dir, { recursive: true, force: true });
});

test("preload rejects duplicate capture phases", t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memlab-capture-"));
    const preload = path.resolve(__dirname, "../lib/bdd-memlab-preload.cjs");
    const result = spawnSync(process.execPath, ["-r", preload, "-e", "globalThis.__scramjetBddMemlabCapture('baseline'); globalThis.__scramjetBddMemlabCapture('baseline')"], { encoding: "utf8", env: { ...process.env, SCRAMJET_BDD_MEMLAB_ARTIFACT_DIR: dir } });
    t.not(result.status, 0);
    t.regex(result.stderr, /duplicate MemLab capture phase/);
    fs.rmSync(dir, { recursive: true, force: true });
});

test("artifact validation rejects incomplete directories and accepts the three snapshots", t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memlab-artifact-"));
    const manifest = { version: 1, createdAt: new Date().toISOString(), feature: "sample.feature", scenario: "chosen", runId: "run-1", snapshots: ["baseline.heapsnapshot", "target.heapsnapshot", "final.heapsnapshot"] };
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest));
    t.throws(() => helper.validateArtifactDirectory(dir), { message: /missing baseline/ });
    for (const phase of helper.PHASES) fs.writeFileSync(path.join(dir, `${phase}.heapsnapshot`), "snapshot");
    t.is(helper.validateArtifactDirectory(dir).manifest.snapshots.length, 3);
    fs.rmSync(dir, { recursive: true, force: true });
});

test("diagnostic Docker wiring is opt-in and does not alter ordinary mounts", t => {
    const source = fs.readFileSync(path.resolve(__dirname, "../run-bdd-docker.js"), "utf8");
    t.true(source.includes('memlabEnabled = process.env.SCRAMJET_BDD_MEMLAB === "1"'));
    t.true(source.includes("bdd-memlab-preload.cjs"));
    t.true(source.includes('["-v", `${process.env.SCRAMJET_BDD_MEMLAB_ARTIFACT_HOST_DIR}:/work-memlab`]'));
    t.true(source.includes('"SCRAMJET_BDD_MEMLAB_ARTIFACT_DIR=/work-memlab"'));
    t.true(source.includes('`${tmpDir}:/work-tmp`'));
    t.true(source.includes('if (memlabEnabled)'));
});

test("dedicated MemLab enforcement is snapshot-only and disables ordinary budgets", t => {
    const runner = fs.readFileSync(path.resolve(__dirname, "../run-bdd-memlab.js"), "utf8");
    const analyzer = fs.readFileSync(path.resolve(__dirname, "../memlab/analyze-bdd-heap.js"), "utf8");
    t.true(runner.includes('SCRAMJET_BDD_CHUNK_MEMORY_POLICY: "off"'));
    t.true(runner.includes('"--enforce"'));
    t.true(analyzer.includes("result.length !== 0"));
    t.true(analyzer.includes("findLeaksBySnapshotFilePaths"));
});

test("capture hook order is baseline, target, final", t => {
    const memory = fs.readFileSync(path.resolve(__dirname, "../../bdd/support/memory-hooks.ts"), "utf8");
    const timing = fs.readFileSync(path.resolve(__dirname, "../../bdd/support/timing-boundary.ts"), "utf8");
    t.true(memory.indexOf('"baseline"') < memory.indexOf('"final"'));
    t.true(timing.indexOf('"target"') < timing.indexOf("beginCleanupTiming(this)"));
    t.true(memory.includes("const baselineUsage = process.memoryUsage();\n    const baseline = memoryUsageTotal(baselineUsage)"));
});

test("diagnostic capacity rejects unsafe defaults", t => {
    t.throws(() => helper.validateDiagnosticCapacity({ BDD_DOCKER_MEMORY: "1536m", BDD_TIMEOUT_MS: "600000" }), { message: /3GiB/ });
    t.notThrows(() => helper.validateDiagnosticCapacity({ BDD_DOCKER_MEMORY: "3g", BDD_TIMEOUT_MS: "900000" }));
});

test("diagnostic guard rejects disabled and skipped overrides", t => {
    t.throws(() => helper.validateDiagnosticMemoryGuard({ SCRAMJET_BDD_MEMORY_GUARD: "0" }), { message: /requires SCRAMJET_BDD_MEMORY_GUARD=1/ });
    t.throws(() => helper.validateDiagnosticMemoryGuard({ SCRAMJET_MEMORY_SKIP: "1" }), { message: /does not allow SCRAMJET_MEMORY_SKIP/ });
    t.notThrows(() => helper.validateDiagnosticMemoryGuard({ SCRAMJET_BDD_MEMORY_GUARD: "1" }));
});

test("diagnostic capacity rejects malformed memory and timeout values", t => {
    t.throws(() => helper.validateDiagnosticCapacity({ BDD_DOCKER_MEMORY: "not-memory", BDD_TIMEOUT_MS: "900000" }), { message: /BDD_DOCKER_MEMORY must be/ });
    t.throws(() => helper.validateDiagnosticCapacity({ BDD_DOCKER_MEMORY: "3g", BDD_TIMEOUT_MS: "not-timeout" }), { message: /BDD_TIMEOUT_MS must be/ });
    t.throws(() => helper.validateDiagnosticCapacity({ BDD_DOCKER_MEMORY: "NaN", BDD_TIMEOUT_MS: "900000" }), { message: /BDD_DOCKER_MEMORY must be/ });
    t.throws(() => helper.validateDiagnosticCapacity({ BDD_DOCKER_MEMORY: "3g", BDD_TIMEOUT_MS: "Infinity" }), { message: /BDD_TIMEOUT_MS must be/ });
    t.throws(() => helper.validateDiagnosticCapacity({ BDD_DOCKER_MEMORY: "", BDD_TIMEOUT_MS: "900000" }), { message: /BDD_DOCKER_MEMORY must be/ });
});
