"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");
const fixture = require("../../bdd/lib/control-plane-cycle-fixture");

const root = path.resolve(__dirname, "../..");

test("cycle component deltas and timeout deltas are scalar computations", t => {
    t.deepEqual(fixture.componentDelta(
        { heapUsed: 10, external: 20, arrayBuffers: 30, rss: 40 },
        { heapUsed: 15, external: 18, arrayBuffers: 34, rss: 55 },
    ), { heapUsed: 5, external: -2, arrayBuffers: 4, rss: 15 });
    t.is(fixture.timeoutDelta({ Timeout: 4, TCP: 2 }, { Timeout: 3, TCP: 2 }), -1);
});

test("fixture delegates Host lifecycle and contains reverse cleanup, port rebind, and distinct cycle identity paths", t => {
    const source = fs.readFileSync(path.join(root, "bdd/lib/control-plane-cycle-fixture.ts"), "utf8");
    const hostLifecycle = fs.readFileSync(path.join(root, "bdd/lib/host-control-ingress-fixture.ts"), "utf8");
    const admission = fs.readFileSync(path.join(root, "bdd/step-definitions/e2e/control-plane-admission.ts"), "utf8");
    t.true(source.includes('import { runHostControlIngressLifecycle } from "./host-control-ingress-fixture";'));
    t.true(source.includes("const lifecycle = await runHostControlIngressLifecycle(isolation, suffix);"));
    t.true(source.includes("const lifecycle = await runManagerControlIngressLifecycle(isolation, suffix);"));
    t.true(hostLifecycle.includes('broker.close("cycle allowed close")'));
    t.true(hostLifecycle.includes("cycle.host.${suffix}"));
    t.true(source.includes("await guest.close(\"cycle guest close\")"));
    t.true(source.includes("await manager.stop()"));
    t.true(source.includes("await rebind(tls.port)"));
    t.true(source.includes("new (globalThis as any).WeakRef(manager)"));
    t.true(source.includes("manager = undefined"));
    t.true(source.includes("auditor = undefined"));
    t.true(source.includes("disconnectAuditStream: () => {}"));
    t.true(admission.includes("routeDomain: \"bdd.routed.hub.test\", disconnectAuditStream: () => {}"));
});

test("Manager cycle diagnostics require every cleanup invariant", t => {
    const source = fs.readFileSync(path.join(root, "bdd/support/control-plane-cycle-diagnostics.ts"), "utf8");
    t.true(source.includes("if (kind === \"manager\") cycles.forEach(assertManagerCycleHealthy)"));
    t.true(source.includes("assert.strictEqual(cycle.closure.reverseCloseCompleted, true"));
    t.true(source.includes("assert.strictEqual(cycle.closure.portRebound, true"));
    t.true(source.includes("assert.strictEqual(cycle.closure.errorCount, 0"));
    t.true(source.includes("assert.strictEqual(cycle.weakRefs.managerReachable, false"));
    t.true(source.includes("assert.strictEqual(cycle.weakRefs.auditorReachable, false"));
    t.true(source.includes("assert.strictEqual(cycle.timeoutDelta, 0"));
});

test("diagnostics require opt-in, guard runtime, and a non-empty skip reason", t => {
    const source = fs.readFileSync(path.join(root, "bdd/support/control-plane-cycle-diagnostics.ts"), "utf8");
    t.true(source.includes('SCRAMJET_BDD_CYCLE_DIAGNOSTIC, "1"'));
    t.true(source.includes("SCRAMJET_MEMORY_SKIP, \"1\""));
    t.true(source.includes("SCRAMJET_MEMORY_SKIP_REASON"));
    t.true(source.includes("SCRAMJET_BDD_MEMORY_GUARD === \"1\""));
    t.true(source.includes("diagnosticOnly: true"));
    t.true(source.includes("memoryGuardSkipped: true"));
});

test("tagged After reports then deletes state before normal memory After", t => {
    const cucumber = fs.readFileSync(path.join(root, "bdd/cucumber.js"), "utf8");
    const diagnostics = fs.readFileSync(path.join(root, "bdd/support/control-plane-cycle-diagnostics.ts"), "utf8");
    const memory = cucumber.indexOf("--require support/memory-hooks.ts");
    const cycle = cucumber.indexOf("--require support/control-plane-cycle-diagnostics.ts");
    t.true(cycle > memory);
    t.true(diagnostics.indexOf("process.stderr.write") < diagnostics.indexOf("delete this.resources.controlPlaneCycleDiagnostic"));
});

test("ordinary E2E-019 scenarios remain untagged and diagnostic state is not reused", t => {
    const feature = fs.readFileSync(path.join(root, "bdd/features/e2e/E2E-019-control-plane-admission.feature"), "utf8");
    const ordinary = feature.slice(0, feature.indexOf("@harness-selftest @control-plane-cycle-diagnostic"));
    t.false(ordinary.includes("control-plane-cycle-diagnostic"));
    t.is((feature.match(/@control-plane-cycle-diagnostic/g) || []).length, 2);
    t.true(fs.readFileSync(path.join(root, "bdd/support/control-plane-cycle-diagnostics.ts"), "utf8").includes("delete this.resources.controlPlaneCycleDiagnostic"));
});
