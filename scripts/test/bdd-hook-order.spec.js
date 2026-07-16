/**
 * @file scripts/test/bdd-hook-order.spec.js
 *
 * Live Cucumber hook-order regression test.
 *
 * Verifies that step-definition After hooks execute BEFORE the
 * memory-hooks.ts After hook.  This ordering is critical: the memory
 * measurement must happen after owned resources are fully released.
 *
 * Protocol:
 *   1. A temporary JS step-def After hook appends "step-def-after" to
 *      the file at BDD_HOOK_ORDER_FILE.
 *   2. The production memory-hooks.ts After hook appends
 *      "memory-guard-after" to the same file (guarded by env var).
 *
 * Hook ordering rule:
 *   After hooks run in REVERSE definition order.
 *   Loaded FIRST => defined FIRST => run LAST.
 *   memory-hooks.ts loaded FIRST => its After runs LAST.
 *
 * Usage:
 *   node scripts/run-ava.js scripts/test/bdd-hook-order.spec.js
 */

"use strict";

const test = require("ava");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

async function runHookOrderScenario() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-hook-order-"));
    const repoRoot = path.resolve(__dirname, "../..");
    const bddRoot = path.resolve(__dirname, "../../bdd");
    const orderDir = path.join(bddRoot, ".tmp-hook-order");
    const orderFile = path.join(orderDir, "hook-order.txt");
    fs.mkdirSync(orderDir, { recursive: true });

    // Create a temporary feature file.
    const featureDir = path.join(tmpDir, "features");
    fs.mkdirSync(featureDir, { recursive: true });
    const featureFile = path.join(featureDir, "hook-order-test.feature");
    fs.writeFileSync(featureFile, [
        "@hook-order-test",
        "Feature: Hook order verification",
        "",
        "  Scenario: Hook order test",
        "    Given hook order test setup",
    ].join("\n"), "utf8");

    // Create a temporary JS step-def file (not TS — avoids ts-node
    // module-resolution issues in temp dirs).
    const stepDefFile = path.join(tmpDir, "steps.js");
    fs.writeFileSync(stepDefFile, [
        'const { Given, After } = require("@cucumber/cucumber");',
        'const fs = require("fs");',
        'const ORDER_FILE = process.env.BDD_HOOK_ORDER_FILE || "";',
        'Given("hook order test setup", function() { /* no-op */ });',
        'After(async function() {',
        '  if (ORDER_FILE) fs.appendFileSync(ORDER_FILE, "step-def-after\\n", "utf8");',
        '  await new Promise(resolve => setTimeout(resolve, 15));',
        "});",
    ].join("\n"), "utf8");

    const tempFeatureDir = path.join(bddRoot, ".tmp-hook-order-features");
    const tempStepDir = path.join(bddRoot, ".tmp-hook-order-steps");
    fs.mkdirSync(tempFeatureDir, { recursive: true });
    fs.mkdirSync(tempStepDir, { recursive: true });
    const repoFeatureFile = path.join(tempFeatureDir, "hook-order-test.feature");
    const repoStepDefFile = path.join(tempStepDir, "steps.js");
    fs.copyFileSync(featureFile, repoFeatureFile);
    fs.copyFileSync(stepDefFile, repoStepDefFile);

    const args = [
        path.join(repoRoot, "scripts/run-bdd-docker.js"),
        "--",
        "--require", ".tmp-hook-order-steps/steps.js",
        "--tags", "@hook-order-test",
        "--format", "progress",
        "--exit",
        ".tmp-hook-order-features/hook-order-test.feature",
    ];

    return new Promise((resolve) => {
        const { spawnSync } = require("node:child_process");
        const result = spawnSync(process.execPath, args, {
            cwd: repoRoot,
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 30000,
            env: {
                ...process.env,
                SCRAMJET_BDD_MEMORY_GUARD: "1",
                NO_HOST: "true",
                NODE_OPTIONS: "--max-old-space-size=1024",
                BDD_HOOK_ORDER_FILE: "/work/bdd/.tmp-hook-order/hook-order.txt",
            },
        });

        let lines = [];
        try {
            const content = fs.readFileSync(orderFile, "utf8");
            lines = content.trim().split("\n").filter(Boolean);
        } catch {}

        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        try { fs.rmSync(tempFeatureDir, { recursive: true, force: true }); } catch {}
        try { fs.rmSync(tempStepDir, { recursive: true, force: true }); } catch {}
        try { fs.rmSync(orderDir, { recursive: true, force: true }); } catch {}

        resolve({
            exitCode: result.status,
            lines,
            stdout: result.stdout.toString(),
            stderr: result.stderr.toString(),
        });
    });
}

test("Cucumber After hook ordering: step-def After runs before memory-hooks After", async (t) => {
    const result = await runHookOrderScenario();

    if (result.exitCode !== 0) {
        t.log("Cucumber exit code:", result.exitCode);
        t.log("stdout:", result.stdout);
        t.log("stderr:", result.stderr);
    }

    t.is(result.exitCode, 0, "Cucumber scenario should pass");

    t.true(
        result.lines.length >= 2,
        `expected >=2 order entries, got ${result.lines.length}: [${result.lines.join(", ")}]`
    );

    const stepDefIdx = result.lines.indexOf("step-def-after");
    const memoryGuardIdx = result.lines.indexOf("memory-guard-after");

    t.true(stepDefIdx >= 0, "step-def-after entry must exist");
    t.true(memoryGuardIdx >= 0, "memory-guard-after entry must exist");
    t.true(
        stepDefIdx < memoryGuardIdx,
        `hook order violation: step-def After (${stepDefIdx}) ` +
        `must run before memory-hooks After (${memoryGuardIdx})`
    );
    t.true(result.stderr.includes("slowest-step="), "supported chunk output must report the slowest step");
    t.true(result.stderr.includes("cleanup=feature-after+world-cleanup"), "cleanup timing must include feature After hooks");
    t.true(result.stderr.includes("scenario="), "timing output must identify the scenario");
});

test("timing boundary is initialized for no-step and failing-Before scenarios", async t => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-timing-boundary-"));
    const bddRoot = path.resolve(__dirname, "../../bdd");
    const featureDir = path.join(bddRoot, ".tmp-timing-boundary-features");
    const stepDir = path.join(bddRoot, ".tmp-timing-boundary-steps");
    fs.mkdirSync(featureDir, { recursive: true });
    fs.mkdirSync(stepDir, { recursive: true });
    fs.writeFileSync(path.join(featureDir, "timing-boundary.feature"), [
        "@timing-boundary-test",
        "Feature: Timing boundary failure paths",
        "",
        "  Scenario: no-step scenario",
        "",
        "  Scenario: failing-Before scenario",
        "    Given boundary setup",
    ].join("\n"), "utf8");
    fs.writeFileSync(path.join(stepDir, "steps.js"), [
        'const { Given, Before, After } = require("@cucumber/cucumber");',
        'Given("boundary setup", function() {});',
        'Before(function(testCase) { if (testCase.pickle.name === "failing-Before scenario") throw new Error("intentional boundary failure"); });',
        'After(function() {});',
    ].join("\n"), "utf8");

    const { spawnSync } = require("node:child_process");
    const result = spawnSync(process.execPath, [
        path.resolve(__dirname, "../run-bdd-docker.js"), "--",
        "--require", ".tmp-timing-boundary-steps/steps.js",
        "--tags", "@timing-boundary-test", "--format", "progress", "--exit",
        ".tmp-timing-boundary-features/timing-boundary.feature",
    ], {
        cwd: path.resolve(__dirname, "../.."),
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30000,
        env: { ...process.env, SCRAMJET_BDD_MEMORY_GUARD: "1", NO_HOST: "true", NODE_OPTIONS: "--max-old-space-size=1024" },
    });
    const stderr = result.stderr.toString();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(featureDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(stepDir, { recursive: true, force: true }); } catch {}

    t.not(result.status, 0, "the intentional Before failure must remain visible");
    t.true(stderr.includes("cleanup=feature-after+world-cleanup"), "cleanup output must exist despite Before failure");
    t.true(stderr.includes("scenario="), "failure-path timing must retain scenario attribution");
});
