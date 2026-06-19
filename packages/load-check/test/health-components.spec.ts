import test from "ava";

import { currentComponent, degradedComponent, summarizeHealth } from "../src";

test("current component controls unhealthy state", t => {
    t.deepEqual(currentComponent({ name: "service", healthy: false, details: { reason: "down" } }), {
        name: "service",
        healthy: false,
        status: "unhealthy",
        scope: undefined,
        details: { reason: "down" }
    });
});

test("degraded components do not make health unhealthy", t => {
    const summary = summarizeHealth({ id: "svc" }, [
        currentComponent({ name: "service", healthy: true }),
        degradedComponent("os.disk", true, { freeRatio: 0.01 })
    ]);

    t.true(summary.healthy);
    t.is(summary.status, "degraded");
    t.is(summary.components[1].healthy, true);
});
