"use strict";

const test = require("ava");
const path = require("node:path");

const runner = require("../run-bdd-waves.js");

test("the Verser2 wave is a named feature path", t => {
    t.is(runner.waves.verser2, "features/verser2/VERSER2-001-isolated-routing.feature");
});

test("feature discovery excludes only the named wave from the serial remainder", t => {
    const features = runner.featureFiles(path.resolve(__dirname, "../../bdd/features"));
    const wave = runner.waves.verser2;
    const remainder = features.filter(feature => feature !== wave);

    t.true(features.includes(wave));
    t.false(remainder.includes(wave));
    t.true(remainder.length > 0);
});

test("wave parsing supports the explicit environment selection", t => {
    const previous = process.env.BDD_WAVE;
    process.env.BDD_WAVE = "verser2";

    t.deepEqual(runner.parseArgs(["--dry-run"]), {
        waveName: "verser2",
        passthrough: ["--dry-run"]
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("child command shape uses run-bdd-docker and fail-fast without Cucumber parallelism", t => {
    const args = runner.commandArgs([runner.waves.verser2], ["--dry-run"]);

    t.is(args[0], path.resolve(__dirname, "../run-bdd-docker.js"));
    t.deepEqual(args.slice(1, 4), ["--", "--fail-fast", "--dry-run"]);
    t.false(args.includes("--parallel"));
    t.false(args.includes("--tags"));
});
