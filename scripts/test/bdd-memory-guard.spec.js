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

const test = require("ava");

const {
    isBddMemoryGuardEnabled,
    bddMemoryHeapThresholdBytes,
    ensureGlobalGc,
    checkBddMemorySkip,
    formatComponentBreakdown,
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
