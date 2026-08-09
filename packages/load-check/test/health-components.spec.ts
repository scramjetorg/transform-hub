import test from "ava";

import { createDefaultHealthComponents, currentComponent, degradedComponent, summarizeHealth } from "../src";

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

test("default health components include common process and OS checks", async t => {
    const components = await createDefaultHealthComponents({
        current: { name: "service", healthy: true, scope: { id: "svc" } },
        processMemoryLimitBytes: Number.MAX_SAFE_INTEGER,
        processCpuMaxPercent: Number.MAX_SAFE_INTEGER,
        osMemoryAvailableRatio: 0,
        osLoadMaxCpuRatio: Number.MAX_SAFE_INTEGER,
        osDiskFreeRatio: 0,
        osDiskPaths: [process.cwd()]
    });
    const names = components.map(component => component.name);

    t.true(names.includes("service"));
    t.true(names.includes("process.memory"));
    t.true(names.includes("process.cpu"));
    t.true(names.includes("os.memory"));
    t.true(names.includes("os.load"));
    t.true(names.includes("os.disk"));
    t.true(components.every(component => typeof component.healthy === "boolean"));
});
