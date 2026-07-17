import baseTest from "ava";

const { allowAvaMemoryGrowth, createAvaMemoryGuard } = require("../../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);

/**
 * Phase 3 is intentionally a contract-only red surface.  The implementation
 * is expected to publish this test-only facade before these tests are made
 * green; keeping the lookup dynamic gives every missing platform API a useful
 * diagnostic instead of making the test file itself fail to compile.
 */
type Health = {
    healthy: boolean;
    details: Record<string, unknown>;
};

type ControlFacade = {
    health: (outputs: unknown[]) => Health;
    stop: (options?: { timeoutMs?: number }) => Promise<unknown>;
    kill: () => Promise<unknown>;
    fail: (error: unknown) => Promise<unknown>;
    lifecycle: () => Array<{ state: string; terminal?: boolean }>;
};

const createFacade = (): ControlFacade => {
    const source = require("../../src") as { createHealthControlFacade?: () => ControlFacade };

    if (!source.createHealthControlFacade) {
        throw new Error("Missing platform API: createHealthControlFacade");
    }

    return source.createHealthControlFacade();
};

const assertHealth = (t: Parameters<typeof test>[1], value: Health): void => {
    t.is(typeof value.healthy, "boolean");
    t.deepEqual(Object.keys(value).sort(), ["details", "healthy"]);
    t.is(typeof value.details, "object");
    t.false(value.details === null);
};

test("health preserves healthy and namespaced details", t => {
    allowAvaMemoryGrowth(t, {
        threshold: 16 * 1024 * 1024,
        reason: "The contract-only dynamic facade lookup loads the shared runtime health contract on its first guarded test."
    });

    const health = createFacade().health([
        { healthy: true, details: { "site-a": { load: 0.2 } } }
    ]);

    assertHealth(t, health);
    t.true(health.healthy);
    t.deepEqual(health.details, { "site-a": { load: 0.2 } });
});

test("namespace keys use the contract grammar", t => {
    allowAvaMemoryGrowth(t, {
        threshold: 1 * 1024 * 1024,
        reason: "The namespace validation loop retains the shared contract module while exercising classified failures."
    });
    const facade = createFacade();
    const valid = ["a", "site-1", "customer.eu", "x_y"];
    const invalid = ["", "1site", "-site", "site-", "site name", "site/child", "__"];

    for (const namespace of valid) {
        t.notThrows(() => facade.health([{ healthy: true, details: { [namespace]: {} } }]));
    }
    for (const namespace of invalid) {
        t.throws(() => facade.health([{ healthy: true, details: { [namespace]: {} } }]));
    }
});

test("details accepts exactly 16,384 UTF-8 bytes and rejects one byte more", t => {
    const facade = createFacade();
    const atLimit = "x".repeat(16_384 - Buffer.byteLength('{"site":{"v":""}}'));
    const overLimit = `${atLimit}x`;

    t.notThrows(() => facade.health([{ healthy: true, details: { site: { v: atLimit } } }]));
    t.throws(() => facade.health([{ healthy: true, details: { site: { v: overLimit } } }]));
});

test("reserved runtime fields cannot be supplied or replaced by details", t => {
    const facade = createFacade();
    const reserved = ["healthy", "details", "status", "scope", "components"];

    for (const key of reserved) {
        t.throws(() => facade.health([{ healthy: true, details: { [key]: "author-value" } }]));
    }
});

test("multiple health handlers merge namespaces in lexical order deterministically", t => {
    const facade = createFacade();
    const outputs = [
        { healthy: true, details: { zeta: { value: 3 }, alpha: { value: 1 } } },
        { healthy: true, details: { middle: { value: 2 } } }
    ];

    const first = facade.health(outputs);
    const second = facade.health([...outputs].reverse());

    t.deepEqual(first, { healthy: true, details: { alpha: { value: 1 }, middle: { value: 2 }, zeta: { value: 3 } } });
    t.deepEqual(second, first);
});

test("duplicate namespaces and malformed handler output have classified diagnostics", t => {
    const facade = createFacade();
    const duplicate = t.throws(() => facade.health([
        { healthy: true, details: { site: { source: "a" } } },
        { healthy: true, details: { site: { source: "b" } } }
    ]));
    t.is((duplicate as Error & { code?: string }).code, "ERR_HEALTH_DETAILS_DUPLICATE_NAMESPACE");

    const malformed = t.throws(() => facade.health([{ healthy: true, details: [] }]));
    t.is((malformed as Error & { code?: string }).code, "ERR_HEALTH_DETAILS_INVALID");
});

test("stop timeout reports timeout without skipping terminal conformance", async t => {
    const facade = createFacade();
    const result = await facade.stop({ timeoutMs: 25 });

    t.deepEqual(result, { operation: "stop", outcome: "timeout", timeoutMs: 25 });
    t.deepEqual(facade.lifecycle().at(-1), { state: "stopping", terminal: false });
});

test("kill is distinct from graceful stop and reaches terminal killed state", async t => {
    const facade = createFacade();

    t.deepEqual(await facade.kill(), { operation: "kill", outcome: "killed" });
    t.deepEqual(facade.lifecycle().at(-1), { state: "killed", terminal: true });
});

test("errors are classified and terminal lifecycle state is observable", async t => {
    const facade = createFacade();
    const result = await facade.fail(new Error("sequence exploded"));

    t.deepEqual(result, { operation: "error", outcome: "errored", code: "ERR_SEQUENCE" });
    t.deepEqual(facade.lifecycle().at(-1), { state: "errored", terminal: true });
    t.true(facade.lifecycle().filter(entry => entry.terminal).length === 1);
});
