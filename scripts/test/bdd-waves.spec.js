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

test("parseArgs returns null waveName when no selector is given", t => {
    const previous = process.env.BDD_WAVE;
    delete process.env.BDD_WAVE;

    t.deepEqual(runner.parseArgs(["--dry-run"]), {
        waveName: null,
        passthrough: ["--dry-run"]
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs recognizes BDD_WAVE environment variable as explicit selection", t => {
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

test("parseArgs recognizes explicit --wave= argument", t => {
    const previous = process.env.BDD_WAVE;
    delete process.env.BDD_WAVE;

    t.deepEqual(runner.parseArgs(["--wave=verser2", "--dry-run"]), {
        waveName: "verser2",
        passthrough: ["--dry-run"]
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs --wave= overrides BDD_WAVE environment variable", t => {
    const previous = process.env.BDD_WAVE;
    process.env.BDD_WAVE = "verser2";

    t.deepEqual(runner.parseArgs(["--wave=verser2", "--name=foo"]), {
        waveName: "verser2",
        passthrough: ["--name=foo"]
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

test("runWaves with explicit wave runs only the named wave, not the serial remainder", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner, features) => {
        calls.push({ owner, features });
        return 0;
    };

    try {
        const result = runner.runWaves({ waveName: "verser2", passthrough: ["--dry-run"] });

        t.is(result, 0);
        t.is(calls.length, 1, "must call runChild exactly once");
        t.is(calls[0].owner, "verser2");
        t.deepEqual(calls[0].features, [runner.waves.verser2]);
    } finally {
        runner.runChild = original;
    }
});

test("runWaves without explicit wave runs the default wave then the serial remainder", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner, features) => {
        calls.push({ owner, features });
        return 0;
    };

    try {
        const result = runner.runWaves({ waveName: null, passthrough: ["--dry-run"] });

        t.is(result, 0);
        t.is(calls.length, 2, "must call runChild twice (wave + remainder)");
        t.is(calls[0].owner, "verser2");
        t.is(calls[1].owner, "serial-remainder");
        t.false(calls[1].features.includes(runner.waves.verser2), "remainder must exclude the wave feature");
    } finally {
        runner.runChild = original;
    }
});

test("runWaves with explicit wave halts on wave failure and does not start remainder", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner, features) => {
        calls.push({ owner, features });
        return 1;
    };

    try {
        const result = runner.runWaves({ waveName: "verser2", passthrough: ["--dry-run"] });

        t.is(result, 1);
        t.is(calls.length, 1, "must not attempt to run remainder after wave failure");
    } finally {
        runner.runChild = original;
    }
});
