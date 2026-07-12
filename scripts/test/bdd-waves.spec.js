"use strict";

const test = require("ava");
const path = require("node:path");

const runner = require("../run-bdd-waves.js");

// ---------------------------------------------------------------------------
// Chunk manifest
// ---------------------------------------------------------------------------

test("chunk manifest defines all expected chunks", t => {
    const names = Object.keys(runner.CHUNKS).sort();
    t.deepEqual(names, [
        "appcontext", "cli", "errors", "harness", "hub",
        "manager", "node", "python", "stream", "topics", "verser2",
    ]);
});

test("every chunk has at least one feature path", t => {
    for (const [name, features] of Object.entries(runner.CHUNKS)) {
        t.true(Array.isArray(features), `chunk "${name}" features must be an array`);
        t.true(features.every((fp) => typeof fp === "string"), `chunk "${name}" paths must be strings`);
        t.true(features.length > 0, `chunk "${name}" must have at least one feature`);
    }
});

test("every feature path uses forward slashes and is relative to bdd/", t => {
    for (const [name, features] of Object.entries(runner.CHUNKS)) {
        for (const fp of features) {
            t.true(
                fp.startsWith("features/") && fp.endsWith(".feature") && !fp.includes("\\"),
                `chunk "${name}" has malformed path: ${fp}`
            );
        }
    }
});

test("verser2 chunk contains the expected single feature", t => {
    t.deepEqual(runner.CHUNKS.verser2, [
        "features/verser2/VERSER2-001-isolated-routing.feature",
    ]);
});

// ---------------------------------------------------------------------------
// Default chunks
// ---------------------------------------------------------------------------

test("default chunks list is ordered and contains expected entries", t => {
    t.true(Array.isArray(runner.DEFAULT_CHUNKS));
    t.true(runner.DEFAULT_CHUNKS.length > 0);

    // First chunk is verser2 (matches Phase 9 ordering)
    t.is(runner.DEFAULT_CHUNKS[0], "verser2");
});

test("every default chunk is defined in CHUNKS", t => {
    for (const name of runner.DEFAULT_CHUNKS) {
        t.truthy(runner.CHUNKS[name], `default chunk "${name}" must exist in CHUNKS`);
    }
});

test("harness chunk is NOT in default chunks", t => {
    t.false(runner.DEFAULT_CHUNKS.includes("harness"));
});

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

test("parseArgs returns null chunkName when no selector is given", t => {
    const previous = process.env.BDD_WAVE;
    delete process.env.BDD_WAVE;

    t.deepEqual(runner.parseArgs(["--dry-run"]), {
        chunkName: null,
        passthrough: ["--dry-run"],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs recognizes BDD_WAVE environment variable", t => {
    const previous = process.env.BDD_WAVE;
    process.env.BDD_WAVE = "verser2";

    t.deepEqual(runner.parseArgs(["--dry-run"]), {
        chunkName: "verser2",
        passthrough: ["--dry-run"],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs recognizes explicit --chunk= argument", t => {
    const previous = process.env.BDD_WAVE;
    delete process.env.BDD_WAVE;

    t.deepEqual(runner.parseArgs(["--chunk=cli", "--name=foo"]), {
        chunkName: "cli",
        passthrough: ["--name=foo"],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs recognizes explicit --wave= argument (backward compat)", t => {
    const previous = process.env.BDD_WAVE;
    delete process.env.BDD_WAVE;

    t.deepEqual(runner.parseArgs(["--wave=verser2", "--name=foo"]), {
        chunkName: "verser2",
        passthrough: ["--name=foo"],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs --chunk= takes priority over BDD_WAVE", t => {
    const previous = process.env.BDD_WAVE;
    process.env.BDD_WAVE = "cli";

    t.deepEqual(runner.parseArgs(["--chunk=verser2"]), {
        chunkName: "verser2",
        passthrough: [],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs --wave= takes priority over BDD_WAVE", t => {
    const previous = process.env.BDD_WAVE;
    process.env.BDD_WAVE = "cli";

    t.deepEqual(runner.parseArgs(["--wave=verser2"]), {
        chunkName: "verser2",
        passthrough: [],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

test("parseArgs last --chunk= wins when both --wave= and --chunk= given", t => {
    const previous = process.env.BDD_WAVE;
    delete process.env.BDD_WAVE;

    t.deepEqual(runner.parseArgs(["--wave=verser2", "--chunk=cli"]), {
        chunkName: "cli",
        passthrough: [],
    });

    if (previous === undefined) {
        delete process.env.BDD_WAVE;
    } else {
        process.env.BDD_WAVE = previous;
    }
});

// ---------------------------------------------------------------------------
// commandArgs
// ---------------------------------------------------------------------------

test("commandArgs uses run-bdd-docker with fail-fast by default", t => {
    const features = runner.CHUNKS.verser2;
    const args = runner.commandArgs(features, ["--dry-run"]);

    t.is(args[0], path.resolve(__dirname, "../run-bdd-docker.js"));
    t.deepEqual(args.slice(1, 4), ["--", "--fail-fast", "--dry-run"]);
    t.false(args.includes("--parallel"));
    t.false(args.includes("--tags"));
});

test("commandArgs does not duplicate fail-fast when already present", t => {
    const features = runner.CHUNKS.verser2;
    const args = runner.commandArgs(features, ["--fail-fast"]);

    const failCount = args.filter((a) => a === "--fail-fast").length;
    t.is(failCount, 1, "--fail-fast must appear exactly once");
});

// ---------------------------------------------------------------------------
// validateManifest
// ---------------------------------------------------------------------------

test("validateManifest passes against the current filesystem and manifest", t => {
    t.notThrows(() => runner.validateManifest());
});

// ---------------------------------------------------------------------------
// runWaves — explicit chunk selection
// ---------------------------------------------------------------------------

test("runWaves with explicit chunk runs only that chunk", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner, features) => {
        calls.push({ owner, features });
        return 0;
    };

    try {
        const result = runner.runWaves({ chunkName: "verser2", passthrough: ["--dry-run"] });

        t.is(result, 0);
        t.is(calls.length, 1, "must call runChild exactly once");
        t.is(calls[0].owner, "verser2");
        t.deepEqual(calls[0].features, runner.CHUNKS.verser2);
    } finally {
        runner.runChild = original;
    }
});

test("runWaves with explicit chunk halts on failure", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner, features) => {
        calls.push({ owner, features });
        return 1;
    };

    try {
        const result = runner.runWaves({ chunkName: "verser2", passthrough: ["--dry-run"] });

        t.is(result, 1);
        t.is(calls.length, 1, "must not continue after chunk failure");
    } finally {
        runner.runChild = original;
    }
});

test("runWaves with explicit harness chunk works for non-default chunks", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner, features) => {
        calls.push({ owner, features });
        return 0;
    };

    try {
        const result = runner.runWaves({ chunkName: "harness", passthrough: ["--dry-run"] });

        t.is(result, 0);
        t.is(calls.length, 1);
        t.is(calls[0].owner, "harness");
    } finally {
        runner.runChild = original;
    }
});

test("runWaves with unknown chunk name throws", t => {
    const original = runner.runChild;
    runner.runChild = () => 0;

    try {
        t.throws(
            () => runner.runWaves({ chunkName: "nonexistent", passthrough: [] }),
            { message: /Unknown BDD chunk "nonexistent"/ }
        );
    } finally {
        runner.runChild = original;
    }
});

// ---------------------------------------------------------------------------
// runWaves — default (no explicit chunk)
// ---------------------------------------------------------------------------

test("runWaves without explicit chunk runs all default chunks serially", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner, features) => {
        calls.push({ owner, features });
        return 0;
    };

    try {
        const result = runner.runWaves({ chunkName: null, passthrough: ["--dry-run"] });

        t.is(result, 0);
        t.is(calls.length, runner.DEFAULT_CHUNKS.length,
            `must run all ${runner.DEFAULT_CHUNKS.length} default chunks`);

        // Verify order matches DEFAULT_CHUNKS
        for (let i = 0; i < runner.DEFAULT_CHUNKS.length; i++) {
            t.is(calls[i].owner, runner.DEFAULT_CHUNKS[i],
                `call ${i} owner must be ${runner.DEFAULT_CHUNKS[i]}`);
        }
    } finally {
        runner.runChild = original;
    }
});

test("runWaves without explicit chunk stops after first failure", t => {
    const calls = [];
    const original = runner.runChild;
    runner.runChild = (owner, features) => {
        calls.push({ owner, features });
        // Fail on the second default chunk
        return calls.length >= 2 ? 1 : 0;
    };

    try {
        const result = runner.runWaves({ chunkName: null, passthrough: ["--dry-run"] });

        t.true(result !== 0, "must propagate non-zero exit code");
        t.is(calls.length, 2, "must stop after the second chunk fails");
    } finally {
        runner.runChild = original;
    }
});

// ---------------------------------------------------------------------------
// runChild environment — BDD_TIMEOUT_MS override
// ---------------------------------------------------------------------------

test("runChild export is a function", t => {
    t.is(typeof runner.runChild, "function");
});

test("runChild is reachable via module.exports for testing", t => {
    const original = runner.runChild;
    runner.runChild = () => 42;
    t.is(runner.runChild(), 42);
    runner.runChild = original;
});
