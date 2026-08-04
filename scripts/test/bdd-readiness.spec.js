"use strict";

const test = require("ava").default;
const { waitForCondition } = require("../../bdd/lib/readiness.js");

test("readiness polling observes a condition at the bounded 50ms interval", async t => {
    let calls = 0;
    const started = Date.now();
    const value = await waitForCondition(() => ++calls, candidate => candidate >= 3, { intervalMs: 50, timeoutMs: 1000, description: "test readiness" });
    t.is(value, 3);
    t.true(calls >= 3);
    t.true(Date.now() - started >= 90);
});

test("readiness polling reports the last observed value on timeout", async t => {
    await t.throwsAsync(() => waitForCondition(() => "cold", value => value === "ready", { intervalMs: 50, timeoutMs: 120, description: "fixture readiness" }), { message: /fixture readiness.*last value/ });
});

test("readiness polling bounds an in-flight check by the remaining deadline", async t => {
    const started = Date.now();
    await t.throwsAsync(() => waitForCondition(() => new Promise(() => undefined), () => false, { intervalMs: 50, timeoutMs: 80, description: "slow readiness" }), { message: /slow readiness.*check exceeded remaining deadline/ });
    t.true(Date.now() - started < 500);
});
