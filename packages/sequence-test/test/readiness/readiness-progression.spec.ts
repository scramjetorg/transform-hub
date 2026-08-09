import baseTest from "ava";

import { createSequenceTest } from "../../src";

const { createAvaMemoryGuard } = require("../../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);

type ReadinessState = "created" | "validated" | "initialized" | "ready" | "errored";

interface ReadinessDiagnostic {
    code: string;
    phase: "initialize";
    message: string;
}

interface ReadinessEvent {
    type: "readiness.diagnostic";
    diagnostic: ReadinessDiagnostic;
}

interface SyntheticReadinessHarness {
    validate: () => Promise<void>;
    initialize: () => Promise<void>;
    activateRoute: (path: string) => Promise<void>;
    state: () => ReadinessState;
    activeRoutes: () => string[];
    events: () => ReadinessEvent[];
    restart: () => Promise<SyntheticReadinessHarness>;
}

const fileLoadedAutostartFixture = {
    source: "file-loaded",
    configuration: {
        autostart: true,
        entrypoint: "index.js",
        route: "/synthetic"
    }
} as const;

async function readinessHarness(): Promise<SyntheticReadinessHarness> {
    // This is deliberately an assertion of the Phase 2 platform contract. The
    // current production harness has no readiness lifecycle API yet.
    return await createSequenceTest({
        runtime: "node",
        sequencePath: "/tmp/synthetic-readiness.js"
    }) as unknown as SyntheticReadinessHarness;
}

test("readiness validates and initializes before activating a route", async t => {
    const harness = await readinessHarness();

    await harness.validate();
    t.is(harness.state(), "validated");
    t.deepEqual(harness.activeRoutes(), []);

    await harness.initialize();
    t.is(harness.state(), "initialized");
    t.deepEqual(harness.activeRoutes(), []);

    await harness.activateRoute("/synthetic");
    t.deepEqual(harness.activeRoutes(), ["/synthetic"]);
});

test("readiness becomes ready only after successful route activation", async t => {
    const harness = await readinessHarness();

    await harness.validate();
    await harness.initialize();
    t.not(harness.state(), "ready");

    await harness.activateRoute("/synthetic");

    t.is(harness.state(), "ready");
    t.deepEqual(harness.activeRoutes(), ["/synthetic"]);
    t.deepEqual(harness.events(), []);
});

test("rejected initialize emits a structured diagnostic and leaves no route active", async t => {
    const harness = await readinessHarness();

    const error = await t.throwsAsync(harness.initialize());

    t.is(harness.state(), "errored");
    t.deepEqual(harness.activeRoutes(), []);
    t.deepEqual(harness.events(), [{
        type: "readiness.diagnostic",
        diagnostic: {
            code: "INITIALIZE_REJECTED",
            phase: "initialize",
            message: error?.message
        }
    }]);
});

test("restart starts a fresh readiness progression rather than retrying in process", async t => {
    const first = await readinessHarness();

    await first.validate();
    await first.initialize();
    await first.activateRoute("/synthetic");
    t.is(first.state(), "ready");

    const second = await first.restart();

    t.not(second, first);
    t.is(second.state(), "created");
    t.deepEqual(second.activeRoutes(), []);
    t.deepEqual(second.events(), []);
});

test("file-loaded autostart readiness configuration is represented as fixture data only", t => {
    t.deepEqual(fileLoadedAutostartFixture, {
        source: "file-loaded",
        configuration: {
            autostart: true,
            entrypoint: "index.js",
            route: "/synthetic"
        }
    });
    t.false("initialize" in fileLoadedAutostartFixture);
    t.false("activateRoute" in fileLoadedAutostartFixture);
});
