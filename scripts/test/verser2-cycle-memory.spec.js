/**
 * @file scripts/test/verser2-cycle-memory.spec.js
 *
 * Repeated create/request/close cycle test — fixed baseline methodology.
 *
 * Measures `process.memoryUsage()` ONCE before any cycle, then after
 * each full create→request→close→GC sequence records the absolute growth
 * from that single fixed baseline.  The resulting series shows whether
 * retained memory grows unboundedly (linear accumulation) or plateaus
 * (slope → 0) — the latter indicates bounded per-scenario overhead.
 *
 * Two topologies are tested:
 *   1. Simple  (1 host + 1 broker)       – mirrors Scenario 1
 *   2. Complex (2 hosts + 1 upstream + 1 broker) – mirrors Scenario 2
 *
 * A plateau is declared when the trailing absolute-growth range and slope
 * remain within the explicitly reported GC-noise budget.
 *
 * Usage:
 *   ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024 --expose-gc" \
 *     SCRAMJET_AVA_JITLESS=0 node scripts/run-ava.js \
 *       scripts/test/verser2-cycle-memory.spec.js
 */

"use strict";

const test = require("ava").default;
const path = require("node:path");
const { existsSync, readFileSync } = require("node:fs");
const { execFileSync } = require("node:child_process");

const {
    createVerserHost,
} = require("@signicode/verser2-host");
// The direct broker API used by this cycle harness does not exercise the
// optional Undici Dispatcher/fetch integration.  Loading Undici under the
// exact guarded AVA command asynchronously bootstraps Node's lazyllhttp WASM
// module; under the repository's strict virtual-memory limit that bootstrap
// rejects after the tests have completed.  Keep this harness on the HTTP/2
// broker path it measures and avoid creating that unrelated async resource.
const Module = require("node:module");
const originalModuleLoad = Module._load;
Module._load = function(request, parent, isMain) {
    if (request === "undici") {
        return { Dispatcher: class Dispatcher {} };
    }
    return originalModuleLoad.call(this, request, parent, isMain);
};
let createVerserBroker;
try {
    ({ createVerserBroker } = require("@signicode/verser2-guest-node"));
} finally {
    Module._load = originalModuleLoad;
}

// ---------------------------------------------------------------------------
// Fixture setup (mirrors isolated-routing.ts)
// ---------------------------------------------------------------------------

const certDir = path.resolve(__dirname, "../../packages/verser/test/cert");

function ensureCerts() {
    if (
        existsSync(path.join(certDir, "localhost.crt")) &&
        existsSync(path.join(certDir, "localhost.key")) &&
        existsSync(path.join(certDir, "myCA.pem"))
    ) {
        return;
    }
    execFileSync(path.join(certDir, "gen-localhost-cert.sh"), { cwd: certDir, stdio: "ignore" });
}

ensureCerts();

const serverCert = readFileSync(path.join(certDir, "localhost.crt"), "utf8");
const serverKey = readFileSync(path.join(certDir, "localhost.key"), "utf8");
const ca = readFileSync(path.join(certDir, "myCA.pem"), "utf8");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Drain microtasks and run a full GC.
 */
async function drainAndGc() {
    await new Promise((r) => setImmediate(r));
    if (typeof global.gc === "function") {
        global.gc();
    }
}

/**
 * Consume a readable stream to completion.
 */
async function streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }
    return Buffer.concat(chunks).toString("utf8");
}

/**
 * Collect close errors without swallowing — matches production pattern.
 */
function captureClose(p) {
    return p.catch((err) => Promise.reject(new Error(
        err instanceof Error ? err.message : String(err)
    )));
}

/**
 * Close helpers — all errors propagated so tests fail on incomplete cleanup.
 */
async function closeBroker(broker) {
    if (broker) await captureClose(broker.close("test-cleanup"));
}

async function closeGuest(guest) {
    if (guest) await captureClose(guest.close("test-cleanup"));
}

async function closeHost(host) {
    if (host) await captureClose(host.close("test-cleanup"));
}

async function closeUpstream(upstream) {
    if (upstream) await captureClose(upstream.close("test-cleanup"));
}

async function closeCycleResources(label, resources, operationError) {
    const closeErrors = [];

    for (const resource of resources.reverse()) {
        try {
            await resource.close();
        } catch (error) {
            closeErrors.push(new Error(`${resource.label}: ${error instanceof Error ? error.message : String(error)}`));
        }
    }

    if (operationError || closeErrors.length > 0) {
        const errors = [];
        if (operationError) errors.push(`operation: ${operationError.message}`);
        errors.push(...closeErrors.map(error => `cleanup: ${error.message}`));
        throw new Error(`${label} cycle failed:\n  - ${errors.join("\n  - ")}`);
    }
}

test("cycle close failures are propagated", async t => {
    await t.throwsAsync(
        closeHost({ close: async () => { throw new Error("host close failed"); } }),
        { message: "host close failed" }
    );
});

// ---------------------------------------------------------------------------
// Cycle runners
// ---------------------------------------------------------------------------

/**
 * Create → request → close for the simple topology
 * (1 host + 1 guest route + 1 broker).
 */
async function runSimpleCycle(idx) {
    const resources = [];
    let operationError;

    try {
        const host = createVerserHost({
            hostId: `cycle-simple-${idx}`,
            host: "127.0.0.1",
            port: 0,
            tls: { cert: serverCert, key: serverKey },
        });
        resources.push({ label: "host", close: () => closeHost(host) });
        await host.start();

        const guest = await host.attachLocalGuest({
            guestId: `gs-${idx}`,
            routedDomains: [`s${idx}.test`],
            listener(_req, res) { res.writeHead(200); res.end("ok"); },
        });
        resources.push({ label: "guest", close: () => closeGuest(guest) });

        const broker = createVerserBroker({
            hostUrl: `https://localhost:${host.address.port}`,
            brokerId: `br-s-${idx}`,
            tls: { ca },
        });
        resources.push({ label: "broker", close: () => closeBroker(broker) });
        await broker.connect();
        await broker.waitForRoute(`s${idx}.test`);
        const resp = await broker.request({ targetId: `gs-${idx}`, method: "GET", path: "/" });
        await streamToString(resp.body);
    } catch (error) {
        operationError = error instanceof Error ? error : new Error(String(error));
    } finally {
        await closeCycleResources("simple", resources, operationError);
    }
}

/**
 * Create → request → close for the complex topology
 * (2 hosts + 1 route on each + 1 upstream + 1 broker).
 */
async function runComplexCycle(idx) {
    const resources = [];
    let operationError;

    try {
        const hostA = createVerserHost({
            hostId: `cycle-ca-${idx}`,
            host: "127.0.0.1",
            port: 0,
            tls: { cert: serverCert, key: serverKey },
        });
        resources.push({ label: "hostA", close: () => closeHost(hostA) });
        await hostA.start();

        const hostB = createVerserHost({
            hostId: `cycle-cb-${idx}`,
            host: "127.0.0.1",
            port: 0,
            tls: { cert: serverCert, key: serverKey },
        });
        resources.push({ label: "hostB", close: () => closeHost(hostB) });
        await hostB.start();

        const guestA = await hostA.attachLocalGuest({
            guestId: `cga-${idx}`,
            routedDomains: [`a${idx}.test`],
            listener(_req, res) { res.writeHead(200); res.end("a-ok"); },
        });
        resources.push({ label: "guestA", close: () => closeGuest(guestA) });

        const guestB = await hostB.attachLocalGuest({
            guestId: `cgb-${idx}`,
            routedDomains: [`b${idx}.test`],
            listener(_req, res) { res.writeHead(200); res.end("b-ok"); },
        });
        resources.push({ label: "guestB", close: () => closeGuest(guestB) });

        const upstream = await hostA.connectUpstream({
            upstreamId: `cu-${idx}`,
            url: `https://localhost:${hostB.address.port}`,
            tls: { ca },
        });
        resources.push({ label: "upstream", close: () => closeUpstream(upstream) });

        const broker = createVerserBroker({
            hostUrl: `https://localhost:${hostA.address.port}`,
            brokerId: `br-c-${idx}`,
            tls: { ca },
        });
        resources.push({ label: "broker", close: () => closeBroker(broker) });
        await broker.connect();
        await broker.waitForRoute(`a${idx}.test`);
        await broker.waitForRoute(`b${idx}.test`);

        const resp = await broker.request({ targetId: `cga-${idx}`, method: "GET", path: "/" });
        await streamToString(resp.body);
    } catch (error) {
        operationError = error instanceof Error ? error : new Error(String(error));
    } finally {
        await closeCycleResources("complex", resources, operationError);
    }
}

// ---------------------------------------------------------------------------
// Plateau computation
// ---------------------------------------------------------------------------

/**
 * Compute the trailing slope (bytes/cycle) over the last K samples of
 * absolute-growth data.
 *
 * Uses simple linear regression: slope = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
 *
 * @param {number[]} absoluteGrowth  Array of absolute-growth values from
 *                                   a fixed baseline.
 * @param {number}   window          Trailing window size.
 * @returns {{ slope: number, mean: number, max: number, min: number, spread: number }}
 */
function trailingSlope(absoluteGrowth, window = 4) {
    if (absoluteGrowth.length < 2) return { slope: 0, mean: 0, max: 0, min: 0, spread: 0 };

    const tail = absoluteGrowth.slice(-window);
    const n = tail.length;

    if (n < 2) return { slope: 0, mean: 0, max: 0, min: 0, spread: 0 };

    const indices = Array.from({ length: n }, (_, i) => i);
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = tail.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((a, i) => a + i * tail[i], 0);
    const sumX2 = indices.reduce((a, i) => a + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const mean = sumY / n;
    const max = Math.max(...tail);
    const min = Math.min(...tail);

    return { slope, mean, max, min, spread: max - min };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/**
 * Run N cycles of a topology function against a FIXED pre-test baseline.
 *
 * @param {string}   label       Topology label ("simple" / "complex").
 * @param {function} cycleFn     Async (idx) => void.
 * @param {number}   warmup      Number of initial cycles to discard.
 * @param {number}   measured    Number of measured cycles after warmup.
 * @returns {Promise<{ absoluteGrowth: number[], totalDeltas: object[], plateau: object }>}
 */
async function runTopology(label, cycleFn, warmup = 2, measured = 8) {
    if (typeof global.gc !== "function") {
        throw new Error("global.gc not available; run with --expose-gc");
    }

    // ---- Fixed pre-test baseline (single measurement) ----
    await drainAndGc();
    const baseline = process.memoryUsage();

    const absoluteGrowth = [];
    const totalDeltas = [];

    for (let i = 0; i < warmup + measured; i++) {
        await cycleFn(i);

        // Post-cycle drain + GC.
        await drainAndGc();
        const current = process.memoryUsage();

        const heapDelta = current.heapUsed - baseline.heapUsed;
        const extDelta = current.external - baseline.external;
        const abDelta = current.arrayBuffers - baseline.arrayBuffers;
        const total = heapDelta + extDelta + abDelta;

        absoluteGrowth.push(total);
        totalDeltas.push({ heap: heapDelta, ext: extDelta, ab: abDelta });

        process.stderr.write(
            `[${label} cycle ${i}] ` +
            `abs-growth=${total >= 0 ? "+" : ""}${total} ` +
            `(heap=${heapDelta >= 0 ? "+" : ""}${heapDelta} ` +
            `ext=${extDelta >= 0 ? "+" : ""}${extDelta} ` +
            `ab=${abDelta >= 0 ? "+" : ""}${abDelta})\n`
        );
    }

    const plateau = trailingSlope(absoluteGrowth.slice(warmup), 4);

    return { absoluteGrowth, totalDeltas, plateau };
}

const WARMUP_SIMPLE = 2;
const MEASURED_SIMPLE = 6;

test("Verser2 simple cycle (1 host+1 broker) shows bounded absolute growth", async (t) => {
    const { absoluteGrowth, totalDeltas, plateau } = await runTopology(
        "simple", runSimpleCycle, WARMUP_SIMPLE, MEASURED_SIMPLE
    );

    const measured = absoluteGrowth.slice(WARMUP_SIMPLE);
    // Compute per-cycle incremental deltas from the absolute series.
    // This is equivalent to per-cycle reset but derived from the fixed
    // baseline and removes V8 compilation-drift noise.
    // NOTE: `increments[0]` includes warmup→measured transition noise
    // and is excluded from boundedness checks.
    const incrementsSm = measured.map((v, i) => i === 0 ? v : v - measured[i - 1]);
    const lastValSm = measured[measured.length - 1];
    const stableIncrSm = incrementsSm.slice(1);
    const tailIncrSm = stableIncrSm.slice(-3);
    const incrSpreadSm = Math.max(...tailIncrSm) - Math.min(...tailIncrSm);

    process.stderr.write(
        `[simple] last-val=${lastValSm} ` +
        `increments=[${incrementsSm.join(", ")}] ` +
        `stable=[${stableIncrSm.join(", ")}] ` +
        `tail-incr=[${tailIncrSm.join(", ")}] spread=${incrSpreadSm}\n`
    );

    // Per-cycle increments (the true per-cycle overhead) must be bounded.
    const maxIncrSm = Math.max(...stableIncrSm.map(Math.abs));
    t.true(maxIncrSm <= 524_288,
        `max per-cycle increment ${maxIncrSm} exceeds 524288; ` +
        `stable increments: [${stableIncrSm.join(", ")}]`);

    // Trailing 3 increments plateau check.
    t.true(incrSpreadSm <= 393_216,
        `trailing increment spread ${incrSpreadSm} exceeds 393216; ` +
        `values: [${tailIncrSm.join(", ")}]`);

    t.true(plateau.spread <= 600_000,
        `trailing absolute-growth spread ${plateau.spread} exceeds 600000; ` +
        `tail range: [${plateau.min}, ${plateau.max}]`);
    t.true(Math.abs(plateau.slope) <= 250_000,
        `trailing absolute-growth slope ${plateau.slope} exceeds 250000 bytes/cycle`);

    // ---- Report all values ----
    t.log(`Simple topology — fixed baseline absolute growth (bytes):`);
    t.log(`  prefix (warmup): [${absoluteGrowth.slice(0, WARMUP_SIMPLE).join(", ")}]`);
    t.log(`  measured:        [${measured.join(", ")}]`);
    t.log(`  stable increments (excl warmup transition): [${stableIncrSm.join(", ")}]`);
    t.log(`  max increment:   ${maxIncrSm} bytes`);
    t.log(`  trailing spread: ${incrSpreadSm} bytes`);
    t.log(`  trailing absolute range: ${plateau.min}..${plateau.max} (spread=${plateau.spread})`);
    t.log(`  trailing absolute slope: ${plateau.slope} bytes/cycle`);
    t.log("  Per-cycle component deltas (from fixed baseline):");
    for (let i = 0; i < totalDeltas.length; i++) {
        const d = totalDeltas[i];
        t.log(`    ${i}: total=${measured[i] || absoluteGrowth[i]} (heap=${d.heap}, ext=${d.ext}, ab=${d.ab})`);
    }
});

const WARMUP_COMPLEX = 2;
const MEASURED_COMPLEX = 6;

test("Verser2 complex cycle (2 hosts+1 upstream+1 broker) shows bounded absolute growth", async (t) => {
    const { absoluteGrowth, totalDeltas, plateau } = await runTopology(
        "complex", runComplexCycle, WARMUP_COMPLEX, MEASURED_COMPLEX
    );

    const measuredC = absoluteGrowth.slice(WARMUP_COMPLEX);
    const incrementsC = measuredC.map((v, i) => i === 0 ? v : v - measuredC[i - 1]);
    const lastValC = measuredC[measuredC.length - 1];
    const stableIncrC = incrementsC.slice(1);
    const tailIncrC = stableIncrC.slice(-3);
    const incrSpreadC = Math.max(...tailIncrC) - Math.min(...tailIncrC);

    process.stderr.write(
        `[complex] last-val=${lastValC} ` +
        `increments=[${incrementsC.join(", ")}] ` +
        `stable=[${stableIncrC.join(", ")}] ` +
        `tail-incr=[${tailIncrC.join(", ")}] spread=${incrSpreadC}\n`
    );

    // Per-cycle increments must be bounded.
    const maxIncrC = Math.max(...stableIncrC.map(Math.abs));
    t.true(maxIncrC <= 786_432,
        `max per-cycle increment ${maxIncrC} exceeds 786432; ` +
        `increments: [${stableIncrC.join(", ")}]`);

    // Trailing 3 increments must have spread < 256 KiB.
    t.true(incrSpreadC <= 262_144,
        `trailing increment spread ${incrSpreadC} exceeds 262144; ` +
        `values: [${tailIncrC.join(", ")}]`);

    t.true(plateau.spread <= 300_000,
        `trailing absolute-growth spread ${plateau.spread} exceeds 300000; ` +
        `tail range: [${plateau.min}, ${plateau.max}]`);
    t.true(Math.abs(plateau.slope) <= 150_000,
        `trailing absolute-growth slope ${plateau.slope} exceeds 150000 bytes/cycle`);

    t.log(`Complex topology — fixed baseline absolute growth (bytes):`);
    t.log(`  prefix (warmup): [${absoluteGrowth.slice(0, WARMUP_COMPLEX).join(", ")}]`);
    t.log(`  measured:        [${measuredC.join(", ")}]`);
    t.log(`  stable increments (excl warmup transition): [${stableIncrC.join(", ")}]`);
    t.log(`  max increment:   ${maxIncrC} bytes`);
    t.log(`  trailing spread: ${incrSpreadC} bytes`);
    t.log(`  trailing absolute range: ${plateau.min}..${plateau.max} (spread=${plateau.spread})`);
    t.log(`  trailing absolute slope: ${plateau.slope} bytes/cycle`);
    t.log("  Per-cycle totals (from fixed baseline):");
    for (let i = 0; i < totalDeltas.length; i++) {
        const d = totalDeltas[i];
        t.log(`    ${i}: total=${measuredC[i] || absoluteGrowth[i]} (heap=${d.heap}, ext=${d.ext}, ab=${d.ab})`);
    }
});
