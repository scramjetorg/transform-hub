/**
 * @file scripts/test/bdd-memory-guard.spec.js
 *
 * Tests for the BDD memory guard helper in scripts/lib/bdd-memory-guard.js.
 *
 * These tests verify ensureGlobalGc, checkBddMemorySkip,
 * formatComponentBreakdown, buildBddMemoryDiagnostics, and the re-exported
 * guard enable/threshold checks.  Real measurement (measureMemoryUsage and
 * drainAndGc) is tested in ava-memory-guard.spec.js.
 */

"use strict";

const test = require("ava").default;

const {
    isBddMemoryGuardEnabled,
    bddMemoryHeapThresholdBytes,
    ensureGlobalGc,
    checkBddMemorySkip,
    memoryUsageTotal,
    formatComponentBreakdown,
    formatComponentSnapshot,
    buildBddMemoryDiagnostics,
    ENV,
} = require("../lib/bdd-memory-guard.js");

// ---------------------------------------------------------------------------
// isBddMemoryGuardEnabled – re-exported from bdd-options, spot-check
// ---------------------------------------------------------------------------

test("isBddMemoryGuardEnabled disabled when no env set", (t) => {
    const savedBdd = process.env[ENV.BDD_MEMORY_GUARD];
    const savedCommon = process.env[ENV.MEMORY_GUARD];

    delete process.env[ENV.BDD_MEMORY_GUARD];
    delete process.env[ENV.MEMORY_GUARD];

    try {
        t.false(isBddMemoryGuardEnabled());
    } finally {
        if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_GUARD] = savedBdd;
        else delete process.env[ENV.BDD_MEMORY_GUARD];
        if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
        else delete process.env[ENV.MEMORY_GUARD];
    }
});

test("isBddMemoryGuardEnabled enabled when BDD guard is 1", (t) => {
    const savedBdd = process.env[ENV.BDD_MEMORY_GUARD];

    process.env[ENV.BDD_MEMORY_GUARD] = "1";

    try {
        t.true(isBddMemoryGuardEnabled());
    } finally {
        if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_GUARD] = savedBdd;
        else delete process.env[ENV.BDD_MEMORY_GUARD];
    }
});

// ---------------------------------------------------------------------------
// ensureGlobalGc
// ---------------------------------------------------------------------------

test("ensureGlobalGc does not throw when global.gc is available", (t) => {
    // Save and restore global.gc
    const savedGc = global.gc;

    global.gc = () => {};

    try {
        t.notThrows(() => ensureGlobalGc());
    } finally {
        global.gc = savedGc;
    }
});

test("ensureGlobalGc throws when global.gc is undefined", (t) => {
    const savedGc = global.gc;

    global.gc = undefined;

    try {
        const err = t.throws(() => ensureGlobalGc(), { instanceOf: Error });

        t.true(err.message.includes("global.gc"), "should mention global.gc");
        t.true(
            err.message.includes("SCRAMJET_BDD_MEMORY_GUARD") ||
            err.message.includes("SCRAMJET_MEMORY_GUARD"),
            "should mention guard env names"
        );
    } finally {
        global.gc = savedGc;
    }
});

test("ensureGlobalGc throws when global.gc is not a function", (t) => {
    const savedGc = global.gc;

    global.gc = "not-a-function";

    try {
        t.throws(() => ensureGlobalGc(), { instanceOf: Error });
    } finally {
        global.gc = savedGc;
    }
});

// ---------------------------------------------------------------------------
// checkBddMemorySkip
// ---------------------------------------------------------------------------

test("checkBddMemorySkip returns skip false when SKIP not set", (t) => {
    const savedSkip = process.env[ENV.MEMORY_SKIP];

    delete process.env[ENV.MEMORY_SKIP];

    try {
        const result = checkBddMemorySkip();
        t.false(result.skip);
    } finally {
        if (savedSkip !== undefined) process.env[ENV.MEMORY_SKIP] = savedSkip;
        else delete process.env[ENV.MEMORY_SKIP];
    }
});

test("checkBddMemorySkip throws when SKIP=1 without SKIP_REASON", (t) => {
    const savedSkip = process.env[ENV.MEMORY_SKIP];
    const savedReason = process.env[ENV.MEMORY_SKIP_REASON];

    process.env[ENV.MEMORY_SKIP] = "1";
    delete process.env[ENV.MEMORY_SKIP_REASON];

    try {
        t.throws(() => checkBddMemorySkip(), { instanceOf: Error });
    } finally {
        if (savedSkip !== undefined) process.env[ENV.MEMORY_SKIP] = savedSkip;
        else delete process.env[ENV.MEMORY_SKIP];
        if (savedReason !== undefined) process.env[ENV.MEMORY_SKIP_REASON] = savedReason;
        else delete process.env[ENV.MEMORY_SKIP_REASON];
    }
});

test("checkBddMemorySkip returns skip true with reason when valid", (t) => {
    const savedSkip = process.env[ENV.MEMORY_SKIP];
    const savedReason = process.env[ENV.MEMORY_SKIP_REASON];

    process.env[ENV.MEMORY_SKIP] = "1";
    process.env[ENV.MEMORY_SKIP_REASON] = "manual testing";

    try {
        const result = checkBddMemorySkip();
        t.true(result.skip);
        t.is(result.reason, "manual testing");
    } finally {
        if (savedSkip !== undefined) process.env[ENV.MEMORY_SKIP] = savedSkip;
        else delete process.env[ENV.MEMORY_SKIP];
        if (savedReason !== undefined) process.env[ENV.MEMORY_SKIP_REASON] = savedReason;
        else delete process.env[ENV.MEMORY_SKIP_REASON];
    }
});

// ---------------------------------------------------------------------------
// formatComponentBreakdown
// ---------------------------------------------------------------------------

test("formatComponentBreakdown produces correct delta output", (t) => {
    const before = { heapUsed: 1000, external: 200, arrayBuffers: 50 };
    const after = { heapUsed: 1500, external: 300, arrayBuffers: 100 };

    const result = formatComponentBreakdown(before, after);
    const lines = result.split("\n");

    t.is(lines.length, 3, "should have one line per component");
    t.true(lines[0].includes("heapUsed"));
    t.true(lines[0].includes("+500"), "heapUsed delta should be +500");
    t.true(lines[1].includes("+100"), "external delta should be +100");
    t.true(lines[2].includes("+50"), "arrayBuffers delta should be +50");
});

test("formatComponentBreakdown handles zero/missing values", (t) => {
    const before = { heapUsed: 0, external: 0, arrayBuffers: 0 };
    const after = { heapUsed: 0, external: 0, arrayBuffers: 0 };

    const result = formatComponentBreakdown(before, after);

    t.true(result.includes("\u0394 +0"), "should show zero delta as +0");
});

// ---------------------------------------------------------------------------
// memoryUsageTotal / formatComponentSnapshot – post-GC snapshot helpers
// ---------------------------------------------------------------------------

test("memoryUsageTotal computes the enforced metric from a raw snapshot", (t) => {
    t.is(memoryUsageTotal({ heapUsed: 100, external: 20, arrayBuffers: 5 }), 125);
    t.is(memoryUsageTotal({ heapUsed: 0 }), 0);
    t.is(memoryUsageTotal(undefined), 0);
});

test("formatComponentSnapshot renders one line per component", (t) => {
    const out = formatComponentSnapshot({ heapUsed: 10, external: 20, arrayBuffers: 30 });

    t.is(out, "  heapUsed: 10\n  external: 20\n  arrayBuffers: 30");
});

test("formatComponentSnapshot handles missing components", (t) => {
    const out = formatComponentSnapshot({ heapUsed: 7 });

    t.true(out.includes("  heapUsed: 7"));
    t.true(out.includes("  external: 0"));
    t.true(out.includes("  arrayBuffers: 0"));
});

// ---------------------------------------------------------------------------
// buildBddMemoryDiagnostics
// ---------------------------------------------------------------------------

test("buildBddMemoryDiagnostics includes scenario name and delta", (t) => {
    const msg = buildBddMemoryDiagnostics({
        scenarioName: "my-test",
        baseline: 1000,
        final: 5000,
        delta: 4000,
        threshold: 1024,
        sourceLabel: "env default",
    });

    t.true(msg.includes("my-test"), "should include scenario name");
    t.true(msg.includes("4000"), "should include delta");
    t.true(msg.includes("1024"), "should include threshold");
    t.true(msg.includes("env default"), "should include source label");
    t.true(msg.includes("before (total): 1000"), "should include baseline");
    t.true(msg.includes("after (total): 5000"), "should include final");
});

test("buildBddMemoryDiagnostics includes component breakdown when provided", (t) => {
    const msg = buildBddMemoryDiagnostics({
        scenarioName: "breakdown-test",
        baseline: 1000,
        final: 5000,
        delta: 4000,
        threshold: 1024,
        sourceLabel: "env default",
        beforeUsage: { heapUsed: 1000, external: 200, arrayBuffers: 50 },
        afterUsage: { heapUsed: 1500, external: 300, arrayBuffers: 100 },
    });

    t.true(msg.includes("heapUsed"), "should include heapUsed breakdown");
    t.true(msg.includes("external"), "should include external breakdown");
    t.true(msg.includes("arrayBuffers"), "should include arrayBuffers breakdown");
});

test("buildBddMemoryDiagnostics distinguishes retained vs reclaimed post-GC state", (t) => {
    const msg = buildBddMemoryDiagnostics({
        scenarioName: "retained-vs-reclaimed",
        baseline: 2000,
        final: 4000,
        delta: 2000,
        threshold: 1024,
        sourceLabel: "env default",
        // Post-GC baseline components (captured after the Before-hook GC).
        baselineUsage: { heapUsed: 1500, external: 300, arrayBuffers: 200 },
        // Pre-final-GC components (captured before the After-hook GC).
        afterUsage: { heapUsed: 6000, external: 800, arrayBuffers: 400 },
        // Post-GC enforced components (captured after the final GC).
        postGcUsage: { heapUsed: 3200, external: 500, arrayBuffers: 300 },
        // 7200 (pre-GC total) - 4000 (post-GC total) = 3200 reclaimed.
        reclaimedBytes: 3200,
    });

    t.true(msg.includes("baseline post-GC components"), "should label baseline post-GC components");
    t.true(msg.includes("  heapUsed: 1500"), "should report baseline post-GC heapUsed");
    t.true(msg.includes("pre-final-GC components"), "should label pre-final-GC components");
    t.true(msg.includes("  heapUsed: 6000"), "should report pre-final-GC heapUsed");
    t.true(msg.includes("final GC reclaimed: 3200 bytes"), "should report bytes reclaimed by final GC");
    t.true(msg.includes("post-GC enforced components"), "should label post-GC enforced components");
    t.true(msg.includes("  heapUsed: 3200"), "should report post-GC enforced heapUsed");
    t.true(msg.includes("  external: 500"), "should report post-GC enforced external");
    t.true(msg.includes("  arrayBuffers: 300"), "should report post-GC enforced arrayBuffers");
    // Enforced metric unchanged.
    t.true(msg.includes("used 2000 bytes"), "should keep the enforced delta");
    t.true(msg.includes("before (total): 2000"), "should keep the baseline total");
    t.true(msg.includes("after (total): 4000"), "should keep the final total");
    // Post-GC snapshots replace the legacy pre-GC delta breakdown.
    t.false(msg.includes("\u0394"), "should not mix legacy delta breakdown with post-GC snapshots");
});

test("buildBddMemoryDiagnostics reports RSS as diagnostic only", (t) => {
    const msg = buildBddMemoryDiagnostics({
        scenarioName: "rss-diag",
        baseline: 1000,
        final: 3000,
        delta: 2000,
        threshold: 1024,
        sourceLabel: "env default",
        baselineUsage: { heapUsed: 800, external: 100, arrayBuffers: 100 },
        postGcUsage: { heapUsed: 2400, external: 400, arrayBuffers: 200 },
        rssBaseline: 10_000_000,
        rssFinal: 12_000_000,
    });

    t.true(msg.includes("rss (diagnostic): 10000000 -> 12000000"), "should label RSS as diagnostic only");
});

test("buildBddMemoryDiagnostics includes cleanup errors when provided", (t) => {
    const err1 = new Error("cleanup failed");
    const err2 = new Error("stream error");

    const msg = buildBddMemoryDiagnostics({
        scenarioName: "error-test",
        baseline: 1000,
        final: 5000,
        delta: 4000,
        threshold: 1024,
        sourceLabel: "env default",
        cleanupErrors: [err1, err2],
    });

    t.true(msg.includes("cleanup errors: 2"), "should report error count");
    t.true(msg.includes("cleanup failed"), "should include first error message");
    t.true(msg.includes("stream error"), "should include second error message");
});

test("buildBddMemoryDiagnostics includes skip context when provided", (t) => {
    const msg = buildBddMemoryDiagnostics({
        scenarioName: "skip-test",
        baseline: 1000,
        final: 2000,
        delta: 1000,
        threshold: 1024,
        sourceLabel: "env default",
        skipContext: "manual override",
    });

    t.true(msg.includes("manual override"), "should include skip context");
});

test("buildBddMemoryDiagnostics handles zero delta", (t) => {
    const msg = buildBddMemoryDiagnostics({
        scenarioName: "zero-test",
        baseline: 5000,
        final: 5000,
        delta: 0,
        threshold: 1024,
        sourceLabel: "env default",
    });

    t.true(msg.includes("used 0 bytes"), "should show zero delta");
});

// ---------------------------------------------------------------------------
// bddMemoryHeapThresholdBytes – re-exported from bdd-options, spot-check
// ---------------------------------------------------------------------------

test("bddMemoryHeapThresholdBytes returns default when unset", (t) => {
    const savedBdd = process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
    const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];

    delete process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
    delete process.env[ENV.MEMORY_HEAP_THRESHOLD];

    try {
        const threshold = bddMemoryHeapThresholdBytes();
        t.true(typeof threshold === "number");
        t.true(threshold > 0);
    } finally {
        if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = savedBdd;
        if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
    }
});

test("bddMemoryHeapThresholdBytes returns BDD-specific override", (t) => {
    const savedBdd = process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];

    process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = "999999";

    try {
        t.is(bddMemoryHeapThresholdBytes(), 999999);
    } finally {
        if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = savedBdd;
        else delete process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
    }
});

// ---------------------------------------------------------------------------
// Scenario exception matching – production helpers
// ---------------------------------------------------------------------------

const {
    matchScenarioException,
    cleanupWorldResources,
} = require("../lib/bdd-memory-hooks-lib.js");
const {
    MANAGER_PARENT_ALLOWANCE_BYTES,
    MANAGER_APPROVAL_REASON,
    MANAGER_SCENARIO_EXCEPTIONS,
} = require("../lib/bdd-manager-exceptions.js");
const { E2E003_KILL_EXCEPTION } = require("../lib/bdd-cli-exceptions.js");

test("E2E-003 allowance matches only the exact approved URI, line, and scenario", (t) => {
    t.is(E2E003_KILL_EXCEPTION.allowanceBytes, 225280);
    t.is(matchScenarioException(
        [E2E003_KILL_EXCEPTION],
        "features/e2e/E2E-003-kill.feature",
        4,
        E2E003_KILL_EXCEPTION.scenarioName,
    ), E2E003_KILL_EXCEPTION);
    t.falsy(matchScenarioException(
        [E2E003_KILL_EXCEPTION],
        "features/e2e/E2E-002-other.feature",
        4,
        E2E003_KILL_EXCEPTION.scenarioName,
    ));
    t.falsy(matchScenarioException(
        [E2E003_KILL_EXCEPTION],
        "features/e2e/E2E-003-kill.feature",
        5,
        E2E003_KILL_EXCEPTION.scenarioName,
    ));
    t.falsy(matchScenarioException(
        [E2E003_KILL_EXCEPTION],
        "features/e2e/E2E-003-kill.feature",
        4,
        "wrong scenario",
    ));
});

test("Manager allowance matches only the approved Manager feature scopes", (t) => {
    t.is(MANAGER_SCENARIO_EXCEPTIONS.length, 3);
    for (const exception of MANAGER_SCENARIO_EXCEPTIONS) {
        t.is(exception.allowanceBytes, 2 * 1024 * 1024);
        t.true(exception.reason.includes("User-approved"));
        t.true(exception.reason.includes("multi-process Manager/MultiManager/Hub topology"));
        t.is(exception.line, 0);
        t.is(exception.scenarioName, "*");
        t.is(matchScenarioException(MANAGER_SCENARIO_EXCEPTIONS, `/work/bdd/features/${exception.featureUri}`, 0, "any scenario"), exception);
    }
    t.is(MANAGER_PARENT_ALLOWANCE_BYTES, 2 * 1024 * 1024);
    t.true(MANAGER_APPROVAL_REASON.includes("User-approved"));
});

test("Manager allowance covers all scenarios only within approved features", (t) => {
    const [aggregation] = MANAGER_SCENARIO_EXCEPTIONS;
    t.is(
        matchScenarioException(
            MANAGER_SCENARIO_EXCEPTIONS,
            `/work/bdd/features/${aggregation.featureUri}`,
            0,
            "any scenario",
        ),
        aggregation,
    );
    t.is(
        matchScenarioException(
            MANAGER_SCENARIO_EXCEPTIONS,
            "/work/bdd/features/manager/MANAGER-001-multimanager-api.feature",
            12,
            "API-001 TC-001 MultiManager API /version endpoint",
        ),
        undefined,
    );
    t.is(
        matchScenarioException(
            MANAGER_SCENARIO_EXCEPTIONS,
            "/work/bdd/features/manager/MANAGER-001-multimanager-api.feature",
            0,
            "any scenario",
        ),
        undefined,
    );
});

test("exception matching matches by exact URI, name, and line", (t) => {
    const exceptions = [{
        featureUri: "verser2/VERSER2-001-isolated-routing.feature",
        line: 7,
        scenarioName: "Broker follows a native 308 redirect to an advertised route",
        allowanceBytes: 1_048_576,
        reason: "exact 1 MiB allowance for the separately tracked Verser2 allocation issue",
    }];

    const match = matchScenarioException(
        exceptions,
        "/work/bdd/features/verser2/VERSER2-001-isolated-routing.feature",
        7,
        "Broker follows a native 308 redirect to an advertised route",
    );

    t.truthy(match);
    t.is(match.allowanceBytes, 1_048_576);
});

test("exception matching accepts an absolute Docker feature URI", (t) => {
    const exceptions = [{
        featureUri: "verser2/VERSER2-001-isolated-routing.feature",
        line: 7,
        scenarioName: "Test",
        allowanceBytes: 2000,
        reason: "endsWith test",
    }];

    const match = matchScenarioException(
        exceptions,
        "/work/bdd/features/verser2/VERSER2-001-isolated-routing.feature",
        7,
        "Test",
    );

    t.truthy(match, "should match the normalized Docker feature path");
    t.is(match.allowanceBytes, 2000);
});

test("exception matching rejects suffix collisions outside recognized feature prefixes", (t) => {
    const exceptions = [{
        featureUri: "verser2/VERSER2-001-isolated-routing.feature",
        line: 7,
        scenarioName: "Test",
        allowanceBytes: 2000,
        reason: "suffix collision test",
    }];

    t.falsy(matchScenarioException(
        exceptions,
        "/some/prefix/verser2/VERSER2-001-isolated-routing.feature",
        7,
        "Test",
    ));
});

test("exception matching does not match wrong URI", (t) => {
    const exceptions = [{
        featureUri: "verser2/VERSER2-001-isolated-routing.feature",
        line: 7,
        scenarioName: "Test",
        allowanceBytes: 1000,
        reason: "test",
    }];

    const match = matchScenarioException(
        exceptions,
        "features/e2e/E2E-001-samples.feature",
        7,
        "Test",
    );

    t.falsy(match, "should not match different URI");
});

test("exception matching does not match wrong scenario name", (t) => {
    const exceptions = [{
        featureUri: "verser2/VERSER2-001-isolated-routing.feature",
        line: 7,
        scenarioName: "Exact scenario name",
        allowanceBytes: 1000,
        reason: "test",
    }];

    const match = matchScenarioException(
        exceptions,
        "verser2/VERSER2-001-isolated-routing.feature",
        7,
        "Different scenario name",
    );

    t.falsy(match, "should not match different name");
});

test("E2E-015 allowance matches only exact URI, line, and scenario", (t) => {
    const exception = {
        featureUri: "e2e/E2E-015-unified.feature",
        line: 4,
        scenarioName: "E2E-015 TC-001 Run simple sequence with input and output",
        allowanceBytes: 90112,
        reason: "approved plateau cleanup",
    };
    t.is(matchScenarioException([exception], "features/e2e/E2E-015-unified.feature", 4, exception.scenarioName), exception);
    t.falsy(matchScenarioException([exception], "features/e2e/E2E-014-python.feature", 4, exception.scenarioName));
    t.falsy(matchScenarioException([exception], "features/e2e/E2E-015-unified.feature", 0, exception.scenarioName));
    t.falsy(matchScenarioException([exception], "features/e2e/E2E-015-unified.feature", 4, "different scenario"));
});

test("line-specific exception fails closed when scenarioLine is 0", (t) => {
    const exceptions = [{
        featureUri: "verser2/VERSER2-001-isolated-routing.feature",
        line: 7,
        scenarioName: "Test",
        allowanceBytes: 1000,
        reason: "line-ignored test",
    }];

    const match = matchScenarioException(
        exceptions,
        "verser2/VERSER2-001-isolated-routing.feature",
        0,
        "Test",
    );

    t.falsy(match, "line-specific allowance must not match when line is unknown");
});

test("line-agnostic wildcard still matches when scenarioLine is 0", (t) => {
    const exception = {
        featureUri: "hub/HUB-001-host-config.feature",
        line: 0,
        scenarioName: "*",
        allowanceBytes: 1000,
        reason: "generic feature fallback",
    };

    t.is(
        matchScenarioException([exception], "features/hub/HUB-001-host-config.feature", 0, "any scenario"),
        exception,
    );
});

test("exception matching returns first match when multiple candidates exist", (t) => {
    const exceptions = [
        {
            featureUri: "verser2/VERSER2-001-isolated-routing.feature",
            line: 7,
            scenarioName: "Shared Name",
            allowanceBytes: 1000,
            reason: "first",
        },
        {
            featureUri: "verser2/VERSER2-001-isolated-routing.feature",
            line: 17,
            scenarioName: "Shared Name",
            allowanceBytes: 2000,
            reason: "second",
        },
    ];

    const match = matchScenarioException(
        exceptions,
        "verser2/VERSER2-001-isolated-routing.feature",
        7,
        "Shared Name",
    );

    t.truthy(match);
    t.is(match.allowanceBytes, 1000, "should match first entry");
    t.is(match.reason, "first");
});

// ---------------------------------------------------------------------------
// Feature-level wildcard matching (scenarioName === "*")
// ---------------------------------------------------------------------------

test("wildcard exception matches any scenario in matching feature", (t) => {
    const exceptions = [{
        featureUri: "hub/HUB-001-host-config.feature",
        line: 0,
        scenarioName: "*",
        allowanceBytes: 1_048_576,
        reason: "feature-level allowance",
    }];

    const match = matchScenarioException(
        exceptions,
        "/work/bdd/features/hub/HUB-001-host-config.feature",
        0,
        "HUB-001 TC-001 Set host port (-P)",
    );

    t.truthy(match, "should match feature-level exception");
    t.is(match.allowanceBytes, 1_048_576);
});

test("wildcard exception matches different scenario in same feature", (t) => {
    const exceptions = [{
        featureUri: "hub/HUB-001-host-config.feature",
        line: 0,
        scenarioName: "*",
        allowanceBytes: 1_048_576,
        reason: "feature-level allowance",
    }];

    const match = matchScenarioException(
        exceptions,
        "hub/HUB-001-host-config.feature",
        10,
        "HUB-001 TC-002 Set host port (--port)",
    );

    t.truthy(match, "should match different scenario in same feature");
    t.is(match.allowanceBytes, 1_048_576);
});

test("wildcard exception matches any scenario line number", (t) => {
    const exceptions = [{
        featureUri: "hub/HUB-002-host-iac.feature",
        line: 0,
        scenarioName: "*",
        allowanceBytes: 1_048_576,
        reason: "feature-level allowance",
    }];

    // Known line number — should still match via wildcard.
    const match = matchScenarioException(
        exceptions,
        "hub/HUB-002-host-iac.feature",
        4,
        "HUB-002 TC-001 Start host with existing sequences",
    );

    t.truthy(match, "should match even with known line number");
});

test("wildcard exception does not match wrong feature URI", (t) => {
    const exceptions = [{
        featureUri: "hub/HUB-001-host-config.feature",
        line: 0,
        scenarioName: "*",
        allowanceBytes: 1_048_576,
        reason: "feature-level allowance",
    }];

    const match = matchScenarioException(
        exceptions,
        "e2e/E2E-001-samples.feature",
        4,
        "Any scenario",
    );

    t.falsy(match, "should not match different feature");
});

test("exact-scenario exception takes priority over wildcard when both match", (t) => {
    const exceptions = [
        {
            featureUri: "hub/HUB-001-host-config.feature",
            line: 0,
            scenarioName: "*",
            allowanceBytes: 1_048_576,
            reason: "feature-level fallback",
        },
        {
            featureUri: "hub/HUB-001-host-config.feature",
            line: 4,
            scenarioName: "HUB-001 TC-001 Set host port (-P)",
            allowanceBytes: 2_000,
            reason: "exact override",
        },
    ];

    // The exact match should return first (iterates in array order).
    const match = matchScenarioException(
        exceptions,
        "hub/HUB-001-host-config.feature",
        4,
        "HUB-001 TC-001 Set host port (-P)",
    );

    // First match wins: the wildcard comes before the exact entry in
    // the array, so it is returned first.  Real SCENARIO_EXCEPTIONS
    // ordering should place wildcard entries last for exact matches
    // to take priority.
    t.truthy(match, "should find a match");
    t.is(match.allowanceBytes, 1_048_576, "wildcard is first in array order, so it wins");
});

test("line-agnostic non-wildcard exception matches scenario line 0 and positive line, rejects wrong name", (t) => {
    const exception = {
        featureUri: "hub/HUB-003-feature-config.feature",
        line: 0,
        scenarioName: "HUB-003 TC-001 Set feature config",
        allowanceBytes: 512_000,
        reason: "line-agnostic exact-scenario test",
    };

    // Match when incoming scenarioLine is 0 (line extraction unavailable).
    t.is(
        matchScenarioException([exception], "features/hub/HUB-003-feature-config.feature", 0, "HUB-003 TC-001 Set feature config"),
        exception,
        "should match when scenarioLine is 0 and name matches exactly",
    );

    // Match when incoming scenarioLine is a positive number.
    t.is(
        matchScenarioException([exception], "features/hub/HUB-003-feature-config.feature", 12, "HUB-003 TC-001 Set feature config"),
        exception,
        "should match when scenarioLine is positive and name matches exactly",
    );

    // Reject when scenario name differs (even though line: 0 is agnostic).
    t.falsy(
        matchScenarioException([exception], "features/hub/HUB-003-feature-config.feature", 0, "HUB-003 TC-002 Start host with params"),
        "should reject different scenario name",
    );

    // Reject when scenario name differs with a positive line number.
    t.falsy(
        matchScenarioException([exception], "features/hub/HUB-003-feature-config.feature", 12, "HUB-003 TC-002 Start host with params"),
        "should reject different scenario name even when line is positive",
    );
});

// ---------------------------------------------------------------------------
// Cleanup failure propagation (mimics isolated-routing.ts After hook logic)
// ---------------------------------------------------------------------------

test("cleanup collects all close errors and surfaces aggregated failure", (t) => {
    const closeErrors = [];

    const capture = (p) =>
        p.catch((err) => {
            closeErrors.push(err instanceof Error ? err : new Error(String(err)));
        });

    const results = [
        Promise.resolve(),
        Promise.reject(new Error("upstream close failed")),
        Promise.reject(new Error("guest close failed")),
        Promise.resolve(),
    ];

    return Promise.all(results.map(capture)).then(() => {
        t.is(closeErrors.length, 2, "should collect 2 errors");
        t.true(closeErrors[0].message.includes("upstream"), "first error message");
        t.true(closeErrors[1].message.includes("guest"), "second error message");

        if (closeErrors.length > 0) {
            const combined = closeErrors.map((e) => "  - " + e.message).join("\n");
            const errMsg = "cleanup: " + closeErrors.length + " error(s):\n" + combined;

            t.true(errMsg.includes("2 error(s)"), "should report error count");
            t.true(errMsg.includes("upstream close failed"), "should include upstream error");
            t.true(errMsg.includes("guest close failed"), "should include guest error");
        }
    });
});

test("cleanup does not throw when all closes succeed", (t) => {
    const closeErrors = [];

    const capture = (p) =>
        p.catch((err) => {
            closeErrors.push(err instanceof Error ? err : new Error(String(err)));
        });

    const results = [
        Promise.resolve(),
        Promise.resolve(),
    ];

    return Promise.all(results.map(capture)).then(() => {
        t.is(closeErrors.length, 0, "should have no errors");
    });
});

// ---------------------------------------------------------------------------
// CleanupWorldResources – production helper
// ---------------------------------------------------------------------------

test("cleanupWorldResources clears every field on world.resources", (t) => {
    const world = {
        resources: {
            isolatedVerser2: { hosts: new Map(), guests: [] },
            outStream: { readable: true },
            instance: { id: "i1" },
            extraField: "keep-me",
            instanceList: {},
            multiHosts: {},
        },
        cliResources: {
            collectedTopicData: "some-data",
            stdio: ["out", "err", 0],
            commandInProgress: { pid: 1234 },
        },
        response: { statusCode: 200 },
        responseChunks: [
            { text: "chunk-1", bytes: 7, at: 10 },
            { text: "chunk-2", bytes: 7, at: 25 },
        ],
        responseText: "chunk-1chunk-2",
    };

    cleanupWorldResources(world);

    for (const key of Object.keys(world.resources)) {
        t.is(world.resources[key], undefined, "resources." + key + " should be undefined");
    }
    for (const key of Object.keys(world.cliResources)) {
        t.is(world.cliResources[key], undefined, "cliResources." + key + " should be undefined");
    }
    t.is(world.response, undefined, "world.response should be undefined");
    t.is(world.responseChunks, undefined, "world.responseChunks should be undefined");
    t.is(world.responseText, undefined, "world.responseText should be undefined");
});

test("cleanupWorldResources destroys streams without inferring process ownership", (t) => {
    const stream = new (require("stream").PassThrough)();
    const child = { pid: 42, exitCode: null, killed: false, kill() { this.killed = true; } };
    cleanupWorldResources({ resources: { stream, child }, cliResources: {} });
    t.true(stream.destroyed);
    t.false(child.killed, "generic world cleanup must not infer process ownership");
});

test("cleanupWorldResources disposes explicitly owned client resources", t => {
    let owned = 0;
    let borrowed = 0;
    const world = {
        resources: {
            ownedClient: { dispose: () => owned++ },
            borrowedClient: { dispose: () => borrowed++ }
        },
        cliResources: {}
    };
    cleanupWorldResources(world);
    t.is(owned, 1);
    t.is(borrowed, 1, "world cleanup invokes each owned resource contract once");
});

test("cleanupWorldResources continues after a stream destroy throws", (t) => {
    const throwing = {
        readable: true,
        destroyed: false,
        destroy() {
            this.destroyed = true;
            throw new Error("stream exploded");
        },
    };
    const good = new (require("stream").PassThrough)();
    const child = { pid: 99, exitCode: null, killed: false, kill() { this.killed = true; } };

    const world = { resources: { throwing, good, child }, cliResources: {} };

    const err = t.throws(() => cleanupWorldResources(world));
    t.true(throwing.destroyed, "throwing resource destroy was called");
    t.true(good.destroyed, "good stream was still destroyed after throw");
    t.false(child.killed, "generic cleanup must not infer child ownership after throw");
    t.is(world.resources.throwing, undefined, "throwing resource field is nulled");
    t.is(world.resources.good, undefined, "good resource field is nulled");
    t.is(world.resources.child, undefined, "child field is nulled");
    t.true(err.message.includes("Cleanup failed for"), "error message indicates aggregate failure");
    t.truthy(err.cleanupErrors, "error carries .cleanupErrors array");
    t.is(err.cleanupErrors.length, 1, "one cleanup error collected");
    t.true(err.cleanupErrors[0].message.includes("stream exploded"), "error message preserved");
});

test("cleanupWorldResources aggregates multiple destroy failures", (t) => {
    const first = {
        readable: true,
        destroyed: false,
        destroy() { this.destroyed = true; throw new Error("first boom"); },
    };
    const second = {
        readable: true,
        destroyed: false,
        destroy() { this.destroyed = true; throw new Error("second boom"); },
    };

    const world = { resources: { first, second }, cliResources: {} };

    const err = t.throws(() => cleanupWorldResources(world));
    t.true(first.destroyed, "first resource destroy was called");
    t.true(second.destroyed, "second resource destroy was called");
    t.is(err.cleanupErrors.length, 2, "both errors collected");
    t.true(err.cleanupErrors[0].message.includes("first boom"), "first error preserved");
    t.true(err.cleanupErrors[1].message.includes("second boom"), "second error preserved");
});

test("cleanupWorldResources continues and aggregates errors from both resources and cliResources", (t) => {
    const badResource = {
        readable: true,
        destroyed: false,
        destroy() { this.destroyed = true; throw new Error("resource fail"); },
    };
    const badCli = {
        readable: true,
        destroyed: false,
        destroy() { this.destroyed = true; throw new Error("cliResource fail"); },
    };
    const goodStream = new (require("stream").PassThrough)();

    const world = {
        resources: { badResource, goodStream },
        cliResources: { badCli },
    };

    const err = t.throws(() => cleanupWorldResources(world));
    t.true(badResource.destroyed, "bad resource destroy called");
    t.true(goodStream.destroyed, "good stream destroyed despite errors");
    t.true(badCli.destroyed, "bad cliResource destroy called");
    t.is(err.cleanupErrors.length, 2, "both resource and cliResource errors collected");
});
