#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { resolveFeature, selectScenario, createArtifactDirectory, validateDiagnosticCapacity, validateDiagnosticMemoryGuard, writeManifest, validateArtifactDirectory } = require("./lib/bdd-memlab.js");

function arg(name) {
    const index = process.argv.indexOf(name);
    return index === -1 ? undefined : process.argv[index + 1];
}

const feature = arg("--feature");
const scenario = arg("--scenario");
const enforce = process.argv.includes("--enforce");
if (!feature || !scenario) {
    process.stderr.write("usage: npm run diagnose:bdd-memlab -- --feature <feature> --scenario <exact name>\n");
    process.exit(2);
}

try {
    const featureFile = resolveFeature(feature);
    const selected = selectScenario(featureFile, scenario, { includeLongRunning: true, includeNeedsFix: true, includeHarnessSelftest: true });
    const capacityEnv = { ...process.env, BDD_DOCKER_MEMORY: process.env.BDD_DOCKER_MEMORY === undefined ? "3g" : process.env.BDD_DOCKER_MEMORY, BDD_TIMEOUT_MS: process.env.BDD_TIMEOUT_MS === undefined ? "900000" : process.env.BDD_TIMEOUT_MS };
    validateDiagnosticMemoryGuard(capacityEnv);
    validateDiagnosticCapacity(capacityEnv);
    const repoRoot = path.resolve(__dirname, "..");
    const runId = `run-${Date.now()}-${process.pid}`;
    const artifactDir = createArtifactDirectory(repoRoot, runId);
    const relativeFeature = path.relative(path.resolve(repoRoot, "bdd/features"), featureFile);
    const namePattern = `^${scenario.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
    const env = {
        ...capacityEnv,
        SCRAMJET_BDD_MEMLAB: "1",
        SCRAMJET_BDD_MEMLAB_ARTIFACT_DIR: "/work-memlab",
        SCRAMJET_BDD_MEMLAB_FEATURE: relativeFeature,
        SCRAMJET_BDD_MEMLAB_SCENARIO: scenario,
        SCRAMJET_BDD_MEMLAB_ARTIFACT_HOST_DIR: artifactDir,
        SCRAMJET_BDD_MEMORY_GUARD: process.env.SCRAMJET_BDD_MEMORY_GUARD || "1",
        BDD_INCLUDE_LONG_RUNNING: "1",
        BDD_INCLUDE_NEEDS_FIX: "1",
        BDD_INCLUDE_HARNESS_SELFTEST: "1",
        SCRAMJET_BDD_CHUNK_MEMORY_POLICY: "off",
    };
    const result = spawnSync(process.execPath, [path.join(__dirname, "run-bdd-docker.js"), "--", `features/${relativeFeature}`, "--name", namePattern], { stdio: "inherit", env });
    writeManifest(artifactDir, { feature: relativeFeature, scenario, scenarioLine: selected.line, runId, node: process.version, command: "supported Docker BDD runner" });
    process.stderr.write(`[diagnose:bdd-memlab] artifacts: ${artifactDir}\n[diagnose:bdd-memlab] snapshots are sensitive; delete manually with: rm -rf -- ${artifactDir}\n`);
    try {
        validateArtifactDirectory(artifactDir);
    } catch (error) {
        process.stderr.write(`[diagnose:bdd-memlab] incomplete artifacts: ${error.message}\n`);
        process.exit(1);
    }
    if (enforce) {
        const analysis = spawnSync(process.execPath, [path.join(__dirname, "memlab/analyze-bdd-heap.js"), artifactDir, "--enforce"], { stdio: "inherit", env: process.env });
        if (analysis.status !== 0) process.exit(analysis.status === null ? 1 : analysis.status);
    }
    process.exit(result.status === null ? 1 : result.status);
} catch (error) {
    process.stderr.write(`[diagnose:bdd-memlab] ${error.message}\n`);
    process.exit(2);
}
