import path from "node:path";

import baseTest from "ava";

import {
    createHubHarness,
    createSequenceFixture,
    createSequenceTest,
    resolveSequenceFixtureMetadata,
    runSequence
} from "../../src";

const { createAvaMemoryGuard } = require("../../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);

test("packaged resource resolution returns a fixture-local entry point", async t => {
    const fixture = await createSequenceFixture({
        "package.json": JSON.stringify({
            main: "src/progression.js",
            engines: { node: ">=16" }
        }),
        "src/progression.js": "module.exports = value => ({ step: value.step + 1 });\n"
    });

    try {
        const metadata = await resolveSequenceFixtureMetadata(fixture.directory);

        t.is(metadata.main, "src/progression.js");
        t.is(metadata.mainPath, path.join(fixture.directory, "src/progression.js"));
        t.is(metadata.runtimeKind, "node");
    } finally {
        await fixture.cleanup();
    }
});

test("a loaded fixture executes and exposes its health route", async t => {
    const fixture = await createSequenceFixture({
        "package.json": JSON.stringify({ main: "src/sequence.js" }),
        "src/sequence.js": [
            "module.exports = function (input) {",
            "    this.api.use(\"/health\", (_req, res) => res.end(JSON.stringify({ status: \"ok\" })));",
            "    return input.map(item => ({ ...item, processed: true }));",
            "};",
            ""
        ].join("\n")
    });
    const harness = createHubHarness();

    try {
        const metadata = await resolveSequenceFixtureMetadata(fixture.directory);
        const result = await runSequence({
            runtime: metadata.runtimeKind,
            sequencePath: metadata.mainPath,
            context: harness.context,
            input: { contentType: "application/x-ndjson", body: [{ id: "item-1" }] }
        });

        t.deepEqual(result.output.ndjson(), [{ id: "item-1", processed: true }]);
        t.deepEqual(harness.apiRoutes().map(route => route.path), ["/health"]);
        t.notThrows(() => result.assert.completed());
        t.notThrows(() => result.assert.noRuntimeErrors());
    } finally {
        await fixture.cleanup();
    }
});

test("sequence readiness progresses before a health route is activated", async t => {
    const harness = await createSequenceTest({
        runtime: "node",
        sequencePath: "/tmp/sequence-readiness.js"
    });

    await harness.validate();
    t.is(harness.state(), "validated");
    await harness.initialize();
    t.is(harness.state(), "initialized");

    await harness.activateRoute("/health");

    t.is(harness.state(), "ready");
    t.deepEqual(harness.activeRoutes(), ["/health"]);
    await harness.close();
});
